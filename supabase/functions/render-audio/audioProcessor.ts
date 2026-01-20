import { RenderConfig, AudioTrack, TemplatePlacement, Transition } from './types.ts';

export class AudioProcessor {
  private sampleRate: number;
  private bitDepth: number;
  private channels: number = 2;

  constructor(config: RenderConfig) {
    this.sampleRate = config.sampleRate;
    this.bitDepth = config.bitDepth;
  }

  async fetchAudioBuffer(url: string): Promise<Float32Array[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await this.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error fetching audio buffer:', error);
      throw error;
    }
  }

  private async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<Float32Array[]> {
    const dataView = new DataView(arrayBuffer);

    if (dataView.byteLength < 44) {
      throw new Error('Invalid audio file: too small');
    }

    const channels: Float32Array[] = [];
    let offset = 44;
    const bytesPerSample = this.bitDepth / 8;
    const numSamples = (dataView.byteLength - 44) / (bytesPerSample * 2);

    const leftChannel = new Float32Array(numSamples);
    const rightChannel = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      if (offset + bytesPerSample * 2 > dataView.byteLength) break;

      leftChannel[i] = this.readSample(dataView, offset, bytesPerSample);
      rightChannel[i] = this.readSample(dataView, offset + bytesPerSample, bytesPerSample);
      offset += bytesPerSample * 2;
    }

    channels.push(leftChannel, rightChannel);
    return channels;
  }

  private readSample(dataView: DataView, offset: number, bytesPerSample: number): number {
    if (bytesPerSample === 2) {
      return dataView.getInt16(offset, true) / 32768.0;
    } else if (bytesPerSample === 3) {
      const byte1 = dataView.getUint8(offset);
      const byte2 = dataView.getUint8(offset + 1);
      const byte3 = dataView.getInt8(offset + 2);
      const value = (byte3 << 16) | (byte2 << 8) | byte1;
      return value / 8388608.0;
    }
    return 0;
  }

  async mixTracks(
    tracks: AudioTrack[],
    placements: TemplatePlacement[],
    totalDuration: number,
    onProgress: (progress: number) => void
  ): Promise<Float32Array[]> {
    const numSamples = Math.floor(totalDuration * this.sampleRate);
    const leftChannel = new Float32Array(numSamples);
    const rightChannel = new Float32Array(numSamples);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      onProgress((i / tracks.length) * 50);

      try {
        const audioBuffers = await this.fetchAudioBuffer(track.url);
        const startSample = Math.floor(track.startOffset * this.sampleRate);

        for (let j = 0; j < audioBuffers[0].length && startSample + j < numSamples; j++) {
          const volume = this.calculateVolumeAtSample(startSample + j, track, placements);
          leftChannel[startSample + j] += audioBuffers[0][j] * volume * track.volume;
          rightChannel[startSample + j] += audioBuffers[1][j] * volume * track.volume;
        }
      } catch (error) {
        console.error(`Error processing track ${track.id}:`, error);
      }
    }

    onProgress(50);

    for (let i = 0; i < placements.length; i++) {
      const placement = placements[i];
      onProgress(50 + ((i / placements.length) * 30));

      this.applyTransitions(leftChannel, rightChannel, placement);
    }

    onProgress(80);
    return [leftChannel, rightChannel];
  }

  private calculateVolumeAtSample(
    sample: number,
    track: AudioTrack,
    placements: TemplatePlacement[]
  ): number {
    const time = sample / this.sampleRate;
    let volume = 1.0;

    for (const placement of placements) {
      for (const transition of placement.transitions) {
        const transitionStart = placement.startTime + transition.startTime;
        const transitionEnd = transitionStart + transition.duration;

        if (time >= transitionStart && time <= transitionEnd) {
          const progress = (time - transitionStart) / transition.duration;

          if (transition.type === 'crossfade') {
            const curve = transition.parameters?.curve || 'linear';
            const curveValue = this.applyCurve(progress, curve);

            if (track.id === 'trackA') {
              volume = 1 - curveValue;
            } else if (track.id === 'trackB') {
              volume = curveValue;
            }
          }
        }
      }
    }

    return Math.max(0, Math.min(1, volume));
  }

  private applyCurve(progress: number, curve: string): number {
    switch (curve) {
      case 'exponential':
        return Math.pow(progress, 2);
      case 'logarithmic':
        return Math.sqrt(progress);
      case 's-curve':
        return (Math.sin((progress - 0.5) * Math.PI) + 1) / 2;
      case 'linear':
      default:
        return progress;
    }
  }

  private applyTransitions(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    placement: TemplatePlacement
  ): void {
    for (const transition of placement.transitions) {
      const startSample = Math.floor((placement.startTime + transition.startTime) * this.sampleRate);
      const duration = Math.floor(transition.duration * this.sampleRate);

      if (transition.type === 'filter') {
        this.applyFilter(leftChannel, rightChannel, startSample, duration, transition);
      } else if (transition.type === 'echo') {
        this.applyEcho(leftChannel, rightChannel, startSample, duration, transition);
      }
    }
  }

  private applyFilter(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    startSample: number,
    duration: number,
    transition: Transition
  ): void {
    const filterType = transition.parameters?.filterType || 'lowpass';
    const frequency = transition.parameters?.frequency || 1000;
    const q = transition.parameters?.q || 1;

    const normalizedFreq = (2 * Math.PI * frequency) / this.sampleRate;
    const alpha = Math.sin(normalizedFreq) / (2 * q);

    let b0, b1, b2, a0, a1, a2;

    if (filterType === 'lowpass') {
      b0 = (1 - Math.cos(normalizedFreq)) / 2;
      b1 = 1 - Math.cos(normalizedFreq);
      b2 = (1 - Math.cos(normalizedFreq)) / 2;
      a0 = 1 + alpha;
      a1 = -2 * Math.cos(normalizedFreq);
      a2 = 1 - alpha;
    } else {
      b0 = (1 + Math.cos(normalizedFreq)) / 2;
      b1 = -(1 + Math.cos(normalizedFreq));
      b2 = (1 + Math.cos(normalizedFreq)) / 2;
      a0 = 1 + alpha;
      a1 = -2 * Math.cos(normalizedFreq);
      a2 = 1 - alpha;
    }

    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    a1 /= a0;
    a2 /= a0;

    this.applyBiquadFilter(leftChannel, startSample, duration, b0, b1, b2, a1, a2);
    this.applyBiquadFilter(rightChannel, startSample, duration, b0, b1, b2, a1, a2);
  }

  private applyBiquadFilter(
    channel: Float32Array,
    startSample: number,
    duration: number,
    b0: number, b1: number, b2: number,
    a1: number, a2: number
  ): void {
    let x1 = 0, x2 = 0;
    let y1 = 0, y2 = 0;

    const endSample = Math.min(startSample + duration, channel.length);

    for (let i = startSample; i < endSample; i++) {
      const x0 = channel[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

      channel[i] = y0;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;
    }
  }

  private applyEcho(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    startSample: number,
    duration: number,
    transition: Transition
  ): void {
    const delayTime = transition.parameters?.delayTime || 0.3;
    const feedback = transition.parameters?.feedback || 0.5;
    const mix = transition.parameters?.mix || 0.5;

    const delaySamples = Math.floor(delayTime * this.sampleRate);
    const endSample = Math.min(startSample + duration, leftChannel.length);

    for (let i = startSample; i < endSample; i++) {
      if (i - delaySamples >= 0) {
        const echoSample = leftChannel[i - delaySamples] * feedback;
        leftChannel[i] = leftChannel[i] * (1 - mix) + echoSample * mix;

        const echoSampleR = rightChannel[i - delaySamples] * feedback;
        rightChannel[i] = rightChannel[i] * (1 - mix) + echoSampleR * mix;
      }
    }
  }

  normalize(channels: Float32Array[]): Float32Array[] {
    let maxAmplitude = 0;

    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channel[i]));
      }
    }

    if (maxAmplitude > 0 && maxAmplitude < 1) {
      const gain = 0.95 / maxAmplitude;
      for (const channel of channels) {
        for (let i = 0; i < channel.length; i++) {
          channel[i] *= gain;
        }
      }
    }

    return channels;
  }

  applyFades(
    channels: Float32Array[],
    fadeIn: number,
    fadeOut: number
  ): Float32Array[] {
    const fadeInSamples = Math.floor(fadeIn * this.sampleRate);
    const fadeOutSamples = Math.floor(fadeOut * this.sampleRate);
    const totalSamples = channels[0].length;

    for (const channel of channels) {
      for (let i = 0; i < fadeInSamples && i < totalSamples; i++) {
        channel[i] *= i / fadeInSamples;
      }

      for (let i = 0; i < fadeOutSamples && i < totalSamples; i++) {
        const index = totalSamples - 1 - i;
        channel[index] *= i / fadeOutSamples;
      }
    }

    return channels;
  }

  encodeWAV(channels: Float32Array[], sampleRate: number, bitDepth: number): ArrayBuffer {
    const bytesPerSample = bitDepth / 8;
    const numChannels = channels.length;
    const numSamples = channels[0].length;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));

        if (bitDepth === 16) {
          view.setInt16(offset, sample * 32767, true);
          offset += 2;
        } else if (bitDepth === 24) {
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

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
