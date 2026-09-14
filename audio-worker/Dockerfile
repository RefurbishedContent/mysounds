# Multi-stage build for the audio-worker.
#
# Stage 1 builds a minimal, LGPL-only FFmpeg from a pinned upstream source
# release and verifies its detached OpenPGP signature against FFmpeg's
# published signing key. GPL, nonfree, and version-3 optional components
# are explicitly disabled, and no external codec libraries are linked in.
# Only ffmpeg + ffprobe are copied into the final image.
#
# Stage 2 runs Node.js 24 as a non-root user and exposes the CLI as the
# container ENTRYPOINT.

ARG FFMPEG_VERSION=7.1
# Upstream ffmpeg release signing key (Michael Niedermayer / FFmpeg).
# Fingerprint pinned so a stolen or rotated key cannot silently pass verification.
ARG FFMPEG_SIGN_KEY_FINGERPRINT=FCF986EA15E6E293A5644F10B4322F04D67658D8

########################################
# Stage 1: build LGPL-only FFmpeg from source
########################################
FROM debian:bookworm-slim AS ffmpeg-builder

ARG FFMPEG_VERSION
ARG FFMPEG_SIGN_KEY_FINGERPRINT

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg pkg-config yasm nasm \
      build-essential make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Fetch source + detached signature over HTTPS from ffmpeg.org.
RUN curl -fsSLo ffmpeg.tar.xz     "https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz" \
 && curl -fsSLo ffmpeg.tar.xz.asc "https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz.asc"

# Import the FFmpeg signing key from Ubuntu's keyserver and verify the fingerprint
# against the pinned value BEFORE trusting any signature.
RUN gpg --batch --keyserver hkps://keyserver.ubuntu.com --recv-keys "${FFMPEG_SIGN_KEY_FINGERPRINT}" \
 && gpg --batch --fingerprint "${FFMPEG_SIGN_KEY_FINGERPRINT}" \
       | tr -d ' ' | grep -q "${FFMPEG_SIGN_KEY_FINGERPRINT}" \
 && gpg --batch --verify ffmpeg.tar.xz.asc ffmpeg.tar.xz

RUN tar -xf ffmpeg.tar.xz \
 && mv "ffmpeg-${FFMPEG_VERSION}" ffmpeg

WORKDIR /build/ffmpeg

# Explicitly disable GPL, nonfree and any version-3 optional components.
# No external codec libraries are linked; FFmpeg's built-in LGPL codecs
# (pcm_*, wav, aac decoder, mp3 decoder, flac, vorbis decoder, opus decoder)
# are sufficient for the inputs and outputs supported in this layer.
RUN ./configure \
      --prefix=/opt/ffmpeg \
      --disable-gpl \
      --disable-nonfree \
      --disable-version3 \
      --disable-doc \
      --disable-ffplay \
      --disable-network \
      --disable-debug \
      --disable-static \
      --enable-shared \
      --enable-small \
      --pkg-config-flags="--static" \
 && make -j"$(nproc)" \
 && make install

# Retain upstream license + build configuration for the notices step.
RUN mkdir -p /opt/ffmpeg/share/doc/ffmpeg \
 && cp COPYING* LICENSE.md CREDITS RELEASE     /opt/ffmpeg/share/doc/ffmpeg/ 2>/dev/null || true \
 && /opt/ffmpeg/bin/ffmpeg -hide_banner -version > /opt/ffmpeg/share/doc/ffmpeg/build-config.txt || true

########################################
# Stage 2: runtime
########################################
FROM node:24-bookworm-slim

# Runtime shared libs required by the LGPL FFmpeg build (libc + libm are present in slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ffmpeg-builder /opt/ffmpeg/bin/ffmpeg   /usr/local/bin/ffmpeg
COPY --from=ffmpeg-builder /opt/ffmpeg/bin/ffprobe  /usr/local/bin/ffprobe
COPY --from=ffmpeg-builder /opt/ffmpeg/lib/         /usr/local/lib/
COPY --from=ffmpeg-builder /opt/ffmpeg/share/doc/ffmpeg/ /usr/local/share/doc/ffmpeg/
RUN ldconfig

# Non-root user.
RUN groupadd --system --gid 10001 worker \
 && useradd  --system --uid 10001 --gid worker --home /home/worker --create-home worker

WORKDIR /app
COPY --chown=worker:worker package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund || true
COPY --chown=worker:worker src ./src
COPY --chown=worker:worker scripts ./scripts
COPY --chown=worker:worker THIRD_PARTY_NOTICES.md README.md ./

# /work is where the caller mounts spec.json + inputs and receives output.
RUN mkdir -p /work && chown worker:worker /work

USER worker
WORKDIR /work

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||8080,path:'/health',timeout:3000},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{process.exit(JSON.parse(b).ok?0:1)}catch{process.exit(1)}})}).on('error',()=>process.exit(1))"

ENTRYPOINT ["node"]
CMD ["/app/src/worker.mjs"]
