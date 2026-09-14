// get-blend-output: mint a short-lived signed URL for a user's completed blend.
//
// - Verifies the caller's session and blend ownership.
// - Requires a completed row with a real storage path (rejects legacy demo rows
//   where url='demo-no-audio' AND file_size=0 without touching them).
// - Re-checks that the underlying source tracks still exist for the caller;
//   returns 'source_revoked' if either has been removed.
// - Signs the trusted storage path (never a client-supplied one) with a
//   15-minute expiry. Never mutates the blend row.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const BLENDS_BUCKET = Deno.env.get('BLEND_OUTPUT_BUCKET') ?? 'blends';
const SIGNED_URL_TTL_SECONDS = 15 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Mode = 'playable' | 'demo_unavailable' | 'source_revoked';

interface OkResponse {
  mode: Mode;
  url?: string;
  expiresAt?: string;
  filename?: string;
  size?: number;
  contentType?: string;
  message?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(errorBody('method_not_allowed', 'POST required'), 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(errorBody('server_misconfigured', 'Server is not configured'), 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(errorBody('unauthorized', 'Missing bearer token'), 401);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json(errorBody('invalid_request', 'Body must be JSON'), 400);
  }
  const blendId = typeof body?.blendId === 'string' ? body.blendId.trim() : '';
  if (!UUID_RE.test(blendId)) {
    return json(errorBody('invalid_request', 'blendId must be a UUID'), 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(errorBody('unauthorized', 'Invalid session'), 401);
  }
  const userId = userData.user.id;

  // Fetch through the user client so RLS enforces ownership.
  const { data: blend, error: blendErr } = await userClient
    .from('blends')
    .select('id, user_id, status, url, filename, file_size, format, song_a_id, song_b_id')
    .eq('id', blendId)
    .maybeSingle();

  if (blendErr) {
    return json(errorBody('lookup_failed', 'Could not load blend'), 500);
  }
  if (!blend) {
    return json(errorBody('not_found', 'Blend not found'), 404);
  }
  if (blend.user_id !== userId) {
    return json(errorBody('forbidden', 'You do not own this blend'), 403);
  }

  // Legacy demo rows: url='demo-no-audio' AND file_size=0. Do not touch them.
  const isDemoRow = blend.url === 'demo-no-audio' && Number(blend.file_size) === 0;
  if (isDemoRow) {
    const res: OkResponse = {
      mode: 'demo_unavailable',
      message: 'This mash up was created before real audio rendering was enabled.',
    };
    return json(res, 200);
  }

  if (blend.status !== 'completed') {
    return json(errorBody('not_ready', 'Blend is not completed yet'), 409);
  }

  const storagePath: string = typeof blend.filename === 'string' ? blend.filename : '';
  if (!storagePath) {
    return json(errorBody('missing_output', 'Blend has no stored audio file'), 409);
  }

  // Re-check underlying source tracks are still accessible to this caller.
  const sourceIds = [blend.song_a_id, blend.song_b_id].filter(Boolean);
  if (sourceIds.length === 2) {
    const { data: sources, error: srcErr } = await userClient
      .from('uploads')
      .select('id')
      .in('id', sourceIds);
    if (srcErr) {
      return json(errorBody('lookup_failed', 'Could not verify source tracks'), 500);
    }
    if (!sources || sources.length !== 2) {
      const res: OkResponse = {
        mode: 'source_revoked',
        message: 'One of the original tracks is no longer available.',
      };
      return json(res, 200);
    }
  }

  // Sign with the service-role client (RLS bypass) using the trusted path
  // we read from the DB, not any client input.
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signed, error: signErr } = await adminClient
    .storage
    .from(BLENDS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
      download: storagePath.split('/').pop() ?? undefined,
    });

  if (signErr || !signed?.signedUrl) {
    return json(errorBody('signing_failed', 'Could not sign playback URL'), 502);
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  const filename = storagePath.split('/').pop() ?? `blend.${blend.format ?? 'wav'}`;
  const contentType = blend.format === 'mp3'
    ? 'audio/mpeg'
    : blend.format === 'flac'
      ? 'audio/flac'
      : 'audio/wav';

  const res: OkResponse = {
    mode: 'playable',
    url: signed.signedUrl,
    expiresAt,
    filename,
    size: Number(blend.file_size) || undefined,
    contentType,
  };
  return json(res, 200);
});
