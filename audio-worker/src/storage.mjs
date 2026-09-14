import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export class TerminalError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.terminal = true;
  }
}

export class TransientError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.terminal = false;
  }
}

export function computeSourceIdentity(storagePath, updatedAt) {
  const marker = String(updatedAt ?? '');
  return createHash('sha256').update(`${storagePath}|${marker}`).digest('hex');
}

async function withRetry(op, { attempts = 3, baseMs = 500, capMs = 8000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (err instanceof TerminalError) throw err;
      if (i === attempts - 1) break;
      const wait = Math.min(capMs, baseMs * 2 ** i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export async function downloadObjectToFile(supabase, {
  bucket,
  path,
  destPath,
  maxBytes,
}) {
  return withRetry(async () => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      const msg = error.message || 'download failed';
      if (/not found|404/i.test(msg)) {
        throw new TerminalError('source_missing', 'source object not found');
      }
      throw new TransientError('storage_transient', 'storage download failed');
    }
    if (!data) {
      throw new TransientError('storage_transient', 'storage returned empty body');
    }
    const size = typeof data.size === 'number' ? data.size : null;
    if (size !== null && size > maxBytes) {
      throw new TerminalError('source_too_large', `source exceeds ${maxBytes} bytes`);
    }

    const stream = Readable.fromWeb(data.stream());
    let written = 0;
    const out = createWriteStream(destPath);
    stream.on('data', (chunk) => {
      written += chunk.length;
      if (written > maxBytes) {
        stream.destroy(new TerminalError('source_too_large', `source exceeds ${maxBytes} bytes`));
      }
    });
    await pipeline(stream, out);

    const st = await stat(destPath);
    if (st.size === 0) {
      throw new TerminalError('unreadable_source', 'downloaded object is empty');
    }
    return st.size;
  });
}

export async function uploadWav(supabase, {
  bucket,
  key,
  localPath,
}) {
  return withRetry(async () => {
    const buf = await readFile(localPath);
    const { error } = await supabase.storage.from(bucket).upload(key, buf, {
      contentType: 'audio/wav',
      upsert: false,
    });
    if (error) {
      const msg = error.message || 'upload failed';
      if (/exists|409|duplicate/i.test(msg)) {
        throw new TerminalError('output_conflict', 'output object already exists');
      }
      throw new TransientError('storage_transient', 'storage upload failed');
    }
    return true;
  });
}

export async function deleteOwnObjects(supabase, { bucket, prefix }) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 });
    if (error || !data) return;
    const keys = data.map((entry) => `${prefix}/${entry.name}`);
    if (keys.length === 0) return;
    await supabase.storage.from(bucket).remove(keys);
  } catch {
    // best-effort cleanup only; do not surface
  }
}
