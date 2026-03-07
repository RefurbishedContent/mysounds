export interface WaveformData {
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
}

export interface RGBWaveformData {
  lows: Float32Array;
  mids: Float32Array;
  highs: Float32Array;
  peaks: Float32Array;
  duration: number;
  sampleRate: number;
}

function computeFFT(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];
        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

export class WaveformGenerator {
  private audioContext: AudioContext;
  private cache: Map<string, WaveformData> = new Map();
  private rgbCache: Map<string, RGBWaveformData> = new Map();

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
      gradientRegion?: {
        startTime: number;
        endTime: number;
        startColor: string;
        endColor: string;
      };
    } = {}
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      color = '#3b82f6',
      backgroundColor = '#1f2937',
      progressColor = '#60a5fa',
      progress = 0,
      centerLine = true,
      gradientRegion
    } = options;

    const width = canvas.width;
    const height = canvas.height;
    const peaks = waveformData.peaks;
    const duration = waveformData.duration;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const maxBarHeight = height / 2 - 4;

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barHeight = peaks[i] * maxBarHeight;
      const isPast = (i / peaks.length) <= progress;
      const currentTime = (i / peaks.length) * duration;

      let barColor = isPast ? progressColor : color;

      if (gradientRegion && currentTime >= gradientRegion.startTime && currentTime <= gradientRegion.endTime) {
        const regionProgress = (currentTime - gradientRegion.startTime) / (gradientRegion.endTime - gradientRegion.startTime);
        barColor = this.interpolateColor(gradientRegion.startColor, gradientRegion.endColor, regionProgress);
        if (isPast) {
          barColor = this.lightenColor(barColor, 0.3);
        }
      }

      ctx.fillStyle = barColor;

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

  private interpolateColor(color1: string, color2: string, progress: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * progress);
    const g = Math.round(c1.g + (c2.g - c1.g) * progress);
    const b = Math.round(c1.b + (c2.b - c1.b) * progress);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private lightenColor(color: string, amount: number): string {
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (!match) return color;
      const r = Math.min(255, parseInt(match[0]) + Math.round(255 * amount));
      const g = Math.min(255, parseInt(match[1]) + Math.round(255 * amount));
      const b = Math.min(255, parseInt(match[2]) + Math.round(255 * amount));
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
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

  async generateRGBWaveform(
    audioUrl: string,
    samples: number = 500
  ): Promise<RGBWaveformData> {
    const cacheKey = `${audioUrl}:${samples}`;
    if (this.rgbCache.has(cacheKey)) {
      return this.rgbCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const rgbData = this.extractRGBBands(audioBuffer, samples);
      this.rgbCache.set(cacheKey, rgbData);
      return rgbData;
    } catch (error) {
      console.error('Failed to generate RGB waveform:', error);
      throw error;
    }
  }

  extractRGBBands(audioBuffer: AudioBuffer, samples: number): RGBWaveformData {
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const samplesPerSlice = Math.floor(totalSamples / samples);
    const sampleRate = audioBuffer.sampleRate;

    const fftSizeRaw = Math.min(2048, Math.max(256, samplesPerSlice));
    const fftSize = 1 << Math.floor(Math.log2(fftSizeRaw));

    const lows = new Float32Array(samples);
    const mids = new Float32Array(samples);
    const highs = new Float32Array(samples);
    const peaks = new Float32Array(samples);

    const freqPerBin = sampleRate / fftSize;
    const lowEnd = Math.max(1, Math.floor(250 / freqPerBin));
    const midEnd = Math.max(lowEnd + 1, Math.floor(4000 / freqPerBin));

    const hannWindow = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    }

    for (let i = 0; i < samples; i++) {
      const sliceStart = i * samplesPerSlice;

      let maxAmp = 0;
      for (let j = sliceStart; j < sliceStart + samplesPerSlice && j < totalSamples; j++) {
        const amp = Math.abs(channelData[j]);
        if (amp > maxAmp) maxAmp = amp;
      }
      peaks[i] = maxAmp;

      const fftStart = sliceStart + Math.max(0, Math.floor((samplesPerSlice - fftSize) / 2));
      const re = new Float32Array(fftSize);
      const im = new Float32Array(fftSize);

      for (let j = 0; j < fftSize; j++) {
        const idx = fftStart + j;
        if (idx < totalSamples) {
          re[j] = channelData[idx] * hannWindow[j];
        }
      }

      computeFFT(re, im);

      let lowE = 0, midE = 0, highE = 0;
      const halfFFT = fftSize / 2;

      for (let j = 1; j < halfFFT; j++) {
        const mag = Math.sqrt(re[j] * re[j] + im[j] * im[j]);
        if (j <= lowEnd) {
          lowE += mag;
        } else if (j <= midEnd) {
          midE += mag;
        } else {
          highE += mag;
        }
      }

      lows[i] = lowE;
      mids[i] = midE;
      highs[i] = highE;
    }

    let maxLow = 0, maxMid = 0, maxHigh = 0;
    for (let i = 0; i < samples; i++) {
      if (lows[i] > maxLow) maxLow = lows[i];
      if (mids[i] > maxMid) maxMid = mids[i];
      if (highs[i] > maxHigh) maxHigh = highs[i];
    }

    if (maxLow > 0) for (let i = 0; i < samples; i++) lows[i] /= maxLow;
    if (maxMid > 0) for (let i = 0; i < samples; i++) mids[i] /= maxMid;
    if (maxHigh > 0) for (let i = 0; i < samples; i++) highs[i] /= maxHigh;

    return {
      lows, mids, highs, peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate
    };
  }

  drawRGBWaveform(
    canvas: HTMLCanvasElement,
    rgbData: RGBWaveformData,
    options: {
      backgroundColor?: string;
      progress?: number;
      centerLine?: boolean;
    } = {}
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      backgroundColor = '#1f2937',
      progress = 0,
      centerLine = true
    } = options;

    const width = canvas.width;
    const height = canvas.height;
    const { lows, mids, highs, peaks } = rgbData;
    const barWidth = width / peaks.length;
    const centerY = height / 2;
    const maxBarHeight = height / 2 - 4;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barHeight = peaks[i] * maxBarHeight;
      const isPast = (i / peaks.length) <= progress;

      const total = lows[i] + mids[i] + highs[i];
      let r: number, g: number, b: number;

      if (total > 0.01) {
        const lowR = lows[i] / total;
        const midR = mids[i] / total;
        const highR = highs[i] / total;
        r = Math.round(lowR * 255 + midR * 40 + highR * 30);
        g = Math.round(lowR * 40 + midR * 220 + highR * 80);
        b = Math.round(lowR * 40 + midR * 40 + highR * 255);
      } else {
        r = g = b = 80;
      }

      if (isPast) {
        r = Math.min(255, r + 55);
        g = Math.min(255, g + 55);
        b = Math.min(255, b + 55);
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, centerY - barHeight, Math.max(1, barWidth - 1), barHeight * 2);
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

  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
      for (const key of this.rgbCache.keys()) {
        if (key.startsWith(url)) this.rgbCache.delete(key);
      }
    } else {
      this.cache.clear();
      this.rgbCache.clear();
    }
  }

  getCachedWaveform(url: string): WaveformData | undefined {
    return this.cache.get(url);
  }
}

export const waveformGenerator = new WaveformGenerator();
