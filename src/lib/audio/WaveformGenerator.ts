export interface WaveformData {
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
}

export class WaveformGenerator {
  private audioContext: AudioContext;
  private cache: Map<string, WaveformData> = new Map();

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async generateWaveform(
    audioUrl: string,
    samples: number = 1000
  ): Promise<WaveformData> {
    if (this.cache.has(audioUrl)) {
      return this.cache.get(audioUrl)!;
    }

    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const peaks = this.extractPeaks(audioBuffer, samples);
      const waveformData: WaveformData = {
        peaks,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate
      };

      this.cache.set(audioUrl, waveformData);
      return waveformData;
    } catch (error) {
      console.error('Failed to generate waveform:', error);
      throw error;
    }
  }

  private extractPeaks(audioBuffer: AudioBuffer, samples: number): Float32Array {
    const channelData = audioBuffer.getChannelData(0);
    const peaks = new Float32Array(samples);
    const samplesPerPeak = Math.floor(channelData.length / samples);

    for (let i = 0; i < samples; i++) {
      const start = i * samplesPerPeak;
      const end = start + samplesPerPeak;
      let max = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) {
          max = abs;
        }
      }

      peaks[i] = max;
    }

    return peaks;
  }

  async generateDetailedWaveform(
    audioBuffer: AudioBuffer,
    zoom: number = 1
  ): Promise<{ left: Float32Array; right: Float32Array }> {
    const samplesPerPixel = Math.max(1, Math.floor(audioBuffer.sampleRate / (50 * zoom)));
    const numberOfPeaks = Math.floor(audioBuffer.length / samplesPerPixel);

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

    const leftPeaks = new Float32Array(numberOfPeaks);
    const rightPeaks = new Float32Array(numberOfPeaks);

    for (let i = 0; i < numberOfPeaks; i++) {
      const start = i * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, audioBuffer.length);

      let leftMax = 0;
      let rightMax = 0;

      for (let j = start; j < end; j++) {
        leftMax = Math.max(leftMax, Math.abs(leftChannel[j]));
        rightMax = Math.max(rightMax, Math.abs(rightChannel[j]));
      }

      leftPeaks[i] = leftMax;
      rightPeaks[i] = rightMax;
    }

    return { left: leftPeaks, right: rightPeaks };
  }

  drawWaveform(
    canvas: HTMLCanvasElement,
    waveformData: WaveformData,
    options: {
      color?: string;
      backgroundColor?: string;
      progressColor?: string;
      progress?: number;
      centerLine?: boolean;
    } = {}
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      color = '#3b82f6',
      backgroundColor = '#1f2937',
      progressColor = '#60a5fa',
      progress = 0,
      centerLine = true
    } = options;

    const width = canvas.width;
    const height = canvas.height;
    const peaks = waveformData.peaks;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const maxBarHeight = height / 2 - 4;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barHeight = peaks[i] * maxBarHeight;
      const isPast = (i / peaks.length) <= progress;

      ctx.fillStyle = isPast ? progressColor : color;

      ctx.fillRect(
        x,
        centerY - barHeight,
        Math.max(1, barWidth - 1),
        barHeight * 2
      );
    }

    if (centerLine) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }
  }

  drawStereoWaveform(
    canvas: HTMLCanvasElement,
    left: Float32Array,
    right: Float32Array,
    options: {
      color?: string;
      backgroundColor?: string;
      progress?: number;
    } = {}
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      color = '#3b82f6',
      backgroundColor = '#1f2937',
      progress = 0
    } = options;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / left.length;
    const channelHeight = height / 2;

    ctx.fillStyle = color;

    for (let i = 0; i < left.length; i++) {
      const x = i * barWidth;
      const leftBarHeight = left[i] * (channelHeight - 4);
      const rightBarHeight = right[i] * (channelHeight - 4);

      const opacity = (i / left.length) <= progress ? 1 : 0.5;
      ctx.globalAlpha = opacity;

      ctx.fillRect(
        x,
        channelHeight - leftBarHeight,
        Math.max(1, barWidth - 1),
        leftBarHeight
      );

      ctx.fillRect(
        x,
        channelHeight + 2,
        Math.max(1, barWidth - 1),
        rightBarHeight
      );
    }

    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, channelHeight);
    ctx.lineTo(width, channelHeight);
    ctx.stroke();
  }

  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }

  getCachedWaveform(url: string): WaveformData | undefined {
    return this.cache.get(url);
  }
}

export const waveformGenerator = new WaveformGenerator();
