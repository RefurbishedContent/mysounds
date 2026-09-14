# Third-Party Notices

This worker bundles no npm dependencies at runtime. The Docker image includes
two binaries built from source in the build stage.

## FFmpeg

- Upstream project: https://ffmpeg.org/
- Source release: `ffmpeg-<FFMPEG_VERSION>.tar.xz` from `https://ffmpeg.org/releases/`
  (version pinned via the `FFMPEG_VERSION` build arg in the Dockerfile;
  default `7.1` at the time of writing).
- Release authenticity: the detached OpenPGP signature published alongside the
  tarball is verified against the pinned upstream signing key fingerprint
  (`FFMPEG_SIGN_KEY_FINGERPRINT` build arg) before the tarball is unpacked.
  Key retrieved from `hkps://keyserver.ubuntu.com`. The build fails if the
  imported key's fingerprint does not exactly match the pinned value.
- License: LGPL 2.1+ (as configured).
- Build configuration (relevant flags):
  `--disable-gpl --disable-nonfree --disable-version3 --disable-network
   --disable-doc --disable-ffplay --enable-small`
- External codec libraries: **none linked**. Only FFmpeg's built-in codecs
  are compiled in. This is sufficient for the inputs the worker currently
  accepts and the WAV/`pcm_s16le` output it currently produces.
- Files included in the runtime image:
  - `/usr/local/bin/ffmpeg`
  - `/usr/local/bin/ffprobe`
  - `/usr/local/lib/` (LGPL shared libraries)
  - `/usr/local/share/doc/ffmpeg/` (upstream `COPYING*`, `LICENSE.md`,
    `CREDITS`, `RELEASE`, plus the recorded build configuration)

If you extend the build to link additional codec libraries (for example
`libx264`, `libx265`, `libfdk-aac`, or any component labelled "version 3 or
later"), you must update this notice and re-evaluate the license posture of
the resulting binary. This worker is intentionally shipped as LGPL-only.

## Node.js

- Base image: `node:24-bookworm-slim`.
- License: MIT (Node.js).

## Debian

- Base image for the FFmpeg build stage: `debian:bookworm-slim`.
- See `/usr/share/doc/*/copyright` inside the image for each Debian package's
  license.
