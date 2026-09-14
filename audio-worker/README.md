# audio-worker

A standalone, offline audio renderer for the mash-up wizard. Given a JSON
spec pointing at two local audio files, it produces one 16-bit stereo
44.1 kHz WAV that matches the timing declared in the spec.

This is **Layer 2**. The wizard, the Supabase queue, and remote object
storage are intentionally NOT wired in yet. This worker only reads local
files and writes local files.

## Scope

Supported render modes:

- `direct_cut` — extract A's selected range, extract B's selected range,
  concatenate. Output length = `len(A) + len(B)`.
- `smooth_crossfade` — extract both ranges, overlap them by `overlapSeconds`
  using a **linear equal-gain crossfade** (triangular fade curves at both
  ends). Output length = `len(A) + len(B) − overlapSeconds`.

Not supported in this layer (and rejected loudly, not silently ignored):

- `renderMode: "template"`
- `exportOptions.normalize` — the pipeline does peak-limiting only (see
  "Peak protection", below); loudness normalization will land in a later
  layer.
- `exportOptions.fadeIn` / `exportOptions.fadeOut`.
- Any `output.format` other than `wav`, any `sampleRate` other than 44100,
  any `channels` other than 2, any `bitDepth` other than 16.

## The `spec.json` contract

```jsonc
{
  "version": 1,
  "mashUpGroup": "<opaque string; carried through from Layer 1>",
  "pairIndex": 0,
  "isFirstPair": true,
  "isLastPair": true,
  "renderMode": "direct_cut",           // or "smooth_crossfade"
  "overlapSeconds": 0,                  // must be 0 for direct_cut; > 0 for smooth_crossfade
  "songA": {
    "uploadId": "abc",                  // opaque; carried through from Layer 1
    "inputPath": "/work/song-a.wav",    // absolute local path; must exist
    "sourceStart": 12.5,                // seconds; >= 0
    "sourceEnd":   30.0,                // seconds; > sourceStart, <= sourceDuration
    "sourceDuration": 187.234           // seconds; declared full length of the source
  },
  "songB": {
    "uploadId": "def",
    "inputPath": "/work/song-b.wav",
    "sourceStart": 0.0,
    "sourceEnd":   20.0,
    "sourceDuration": 210.0
  },

  // Optional. Any value present here must match the fixed pipeline exactly;
  // mismatches are rejected.
  "output": { "format": "wav", "sampleRate": 44100, "channels": 2, "bitDepth": 16 },

  // Optional. Recognized so the caller can forward the wizard's export
  // options unchanged. `quality` is accepted but has no effect on the fixed
  // PCM pipeline. Everything else in this block is either matched to the
  // fixed pipeline or explicitly rejected.
  "exportOptions": { "format": "wav", "bitDepth": 16, "sampleRate": 44100, "quality": "standard" }
}
```

The `expectedContribution` / `templateRef` fields defined in Layer 1's
`RenderSpec` are accepted and ignored (with `templateRef` explicitly
rejected outside of `template` mode). The worker computes its own expected
sample counts from `sourceStart`, `sourceEnd`, `overlapSeconds`, and
`renderMode`.

## CLI

```
node scripts/render-local.mjs --spec /work/spec.json --out /work/output.wav [--keep-temp]
```

Exit codes:

| Code | Meaning                                                        |
|------|----------------------------------------------------------------|
| 0    | Success. A one-line JSON summary is printed on stdout.         |
| 1    | Usage error (missing/unknown flag).                            |
| 2    | Spec validation error.                                         |
| 3    | ffmpeg / ffprobe error.                                        |
| 4    | Sample-count verification failed or an input file was missing. |

On success, stdout is a single JSON line, for example:

```json
{"ok":true,"outputPath":"/work/output.wav","renderMode":"smooth_crossfade","samples":176400,"seconds":4.0,"expectedSamples":176400,"peakDbfs":-1.02,"appliedGainDb":0}
```

On failure, stderr is a single JSON line (`{"ok":false,"error":"…"}`) and no
output file is written.

Two auxiliary scripts:

```
node scripts/verify-output.mjs --out /work/output.wav [--spec /work/spec.json]
node scripts/smoke-test.mjs   # renders two synthetic-tone fixtures end-to-end
```

`verify-output.mjs` re-probes an existing WAV and confirms container, codec,
sample rate, channel count, bit depth, and (if a spec is provided) exact
sample count.

## Peak protection (NOT loudness normalization)

Intermediate audio is processed as 32-bit float PCM. Just before final
encoding to 16-bit PCM the mix is measured with FFmpeg's `astats`. If the
true peak exceeds **−1 dBFS**, a single static linear gain is applied so
the encoded file's peak sits at exactly −1 dBFS. This is peak-limiting for
clip protection only. It is **not** loudness normalization — the mix is
never made louder, RMS is never targeted, and quiet material is left alone.
The `exportOptions.normalize` flag is rejected precisely so callers do not
confuse the two.

## Safety posture (ffmpeg / ffprobe invocation)

- `child_process.spawn` with an explicit argv array; `shell: false`.
- `stdin` is closed on every invocation (`-nostdin`, `stdio[0] = 'ignore'`).
- `-protocol_whitelist file,pipe` on every ffmpeg / ffprobe call — no
  network protocols are permitted even if a spec path happened to look
  like a URL.
- Per-call timeouts (default 3–5 minutes) and bounded stderr capture
  (512 KB) prevent runaway processes and memory blow-ups.
- All intermediates are written under a `mkdtemp` directory and removed in
  a `finally` block, including on failure.
- Concat list files are quoted with single quotes and internal single
  quotes escaped; nothing user-controlled is interpolated into a shell
  command line (there is no shell).

## Local development

Requirements:

- Node.js 24.x on `PATH` (`node --version` should report `v24.*`).
- `ffmpeg` and `ffprobe` on `PATH`, OR set `AUDIO_WORKER_FFMPEG` /
  `AUDIO_WORKER_FFPROBE` to point at specific binaries. The Docker image
  ships both; a bare Node install will need them installed separately.

```
cd audio-worker
npm test               # runs the tests that don't need ffmpeg + all tests that do
npm run smoke          # generates fixtures and renders both modes end-to-end
```

## Docker

Build and run entirely offline (except for the FFmpeg source download at
build time):

```
cd audio-worker
docker build -t audio-worker .
docker run --rm --network=none -v "$PWD/work:/work" audio-worker \
  --spec /work/spec.json --out /work/output.wav
```

The image contains only:

- Node.js 24 (LTS line)
- An LGPL-only FFmpeg built from a pinned, GPG-verified upstream source
  release (see `THIRD_PARTY_NOTICES.md`)
- The worker source

It runs as a non-root user (`uid=10001`) inside `/work`.

## What runs in Bolt vs. what needs local Docker

- **Runnable in Bolt (no ffmpeg needed):** all pure-validation tests in
  `tests/invalid-bounds.test.mjs` and `tests/unsupported-options.test.mjs`.
  These exercise the spec contract and export-option rejection paths
  without touching a real audio pipeline. The other tests self-skip with a
  clear message when `ffmpeg` is not on `PATH`.
- **Requires local Docker or a host with ffmpeg installed:** the four
  rendering tests (`timing-direct-cut`, `timing-crossfade`,
  `nonzero-source-positions`, `output-properties`), plus `npm run smoke`
  and any `docker build`.
