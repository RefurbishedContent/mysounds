import * as Tone from 'tone';

export interface RenderOptions {
  format: 'wav' | 'mp3';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
  sampleRate: number;
  bitDepth: 16 | 24;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
}

export interface RenderProgress {
  stage: 'initializing' | 'recording' | 'processing' | 'encoding' | 'complete';
  progress: number;
  message: string;
}

export class InAppRenderer {
  private recorder: Tone.Recorder | null = null;
  private isRendering = false;
  private onProgressCallback?: (progress: RenderProgress) => void;

  constructor() {}

  async renderMix(
    players: Tone.Player[],
    duration: number,
    options: RenderOptions,
    onProgress?: (progress: RenderProgress) => void
  ): Promise<Blob> {
    if (this.isRendering) {
      throw new Error('Rendering already in progress');
    }

    this.isRendering = true;
    this.onProgressCallback = onProgress;

    try {
      await Tone.start();

      this.updateProgress({
        stage: 'initializing',
        progress: 0,
        message: 'Initializing audio context...'
      });

      this.recorder = new Tone.Recorder();
      const masterGain = new Tone.Gain(1).toDestination();
      this.recorder.connect(masterGain);

      players.forEach(player => {
        player.connect(this.recorder!);
      });

      this.updateProgress({
        stage: 'recording',
        progress: 10,
        message: 'Starting recording...'
      });

      this.recorder.start();

      players.forEach(player => {
        if (player.loaded) {
          player.start(Tone.now());
        }
      });

      const recordingDuration = duration;
      const progressInterval = setInterval(() => {
        const elapsed = Tone.Transport.seconds;
        const progress = Math.min(95, 10 + (elapsed / recordingDuration) * 70);

        this.updateProgress({
          stage: 'recording',
          progress,
          message: `Recording... ${Math.round(elapsed)}s / ${Math.round(recordingDuration)}s`
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, recordingDuration * 1000));

      clearInterval(progressInterval);

      this.updateProgress({
        stage: 'processing',
        progress: 80,
        message: 'Stopping recording...'
      });

      const recording = await this.recorder.stop();

      players.forEach(player => {
        player.stop();
      });

      this.updateProgress({
        stage: 'encoding',
        progress: 90,
        message: 'Encoding audio...'
      });

      let finalBlob: Blob;

      if (options.format === 'wav') {
        finalBlob = await this.convertToWAV(recording, options);
      } else {
        finalBlob = recording;
      }

      if (options.normalize || options.fadeIn > 0 || options.fadeOut > 0) {
        finalBlob = await this.postProcess(finalBlob, options);
      }

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Rendering complete!'
      });

      return finalBlob;
    } catch (error) {
      console.error('Rendering error:', error);
      throw error;
    } finally {
      this.isRendering = false;
      this.recorder?.dispose();
      this.recorder = null;
    }
  }

  private async convertToWAV(blob: Blob, options: RenderOptions): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: options.sampleRate });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const wavBuffer = this.encodeWAV(audioBuffer, options.bitDepth);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private encodeWAV(audioBuffer: AudioBuffer, bitDepth: 16 | 24): ArrayBuffer {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));

        if (bitDepth === 16) {
          view.setInt16(offset, sample * 32767, true);
          offset += 2;
        } else {
          const intSample = Math.floor(sample * 8388607);
          view.setUint8(offset, intSample & 0xFF);
          view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
          view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
          offset += 3;
        }
      }
    }

    return buffer;
  }

  private async postProcess(blob: Blob, options: RenderOptions): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = offlineContext.createGain();
    source.connect(gainNode);
    gainNode.connect(offlineContext.destination);

    if (options.fadeIn > 0) {
      const fadeInSamples = options.fadeIn * audioBuffer.sampleRate;
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(1, options.fadeIn);
    }

    if (options.fadeOut > 0) {
      const fadeOutStart = audioBuffer.duration - options.fadeOut;
      gainNode.gain.setValueAtTime(1, fadeOutStart);
      gainNode.gain.linearRampToValueAtTime(0, audioBuffer.duration);
    }

    if (options.normalize) {
      let maxAmplitude = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
        }
      }

      if (maxAmplitude > 0 && maxAmplitude < 1) {
        const normalizeGain = 0.95 / maxAmplitude;
        gainNode.gain.value = normalizeGain;
      }
    }

    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();

    const wavBuffer = this.encodeWAV(renderedBuffer, options.bitDepth);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private updateProgress(progress: RenderProgress): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  isRenderingInProgress(): boolean {
    return this.isRendering;
  }

  cancelRender(): void {
    if (this.isRendering && this.recorder) {
      this.recorder.stop();
      this.recorder.dispose();
      this.recorder = null;
      this.isRendering = false;
    }
  }
}

export const inAppRenderer = new InAppRenderer();
