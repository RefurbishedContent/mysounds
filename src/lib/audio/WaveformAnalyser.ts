// ============================================================
// WAVEFORM ANALYSER
// Wraps AnalyserNode for RMS metering, frequency visualisation,
// and static waveform rendering from an AudioBuffer.
// ============================================================

export class WaveformAnalyser {
  private analyser: AnalyserNode;
  private freqData: Uint8Array;
  private timeData: Float32Array;
  private rafId: number | null = null;

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Float32Array(this.analyser.fftSize);
  }

  getRMS(): number {
    this.analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i];
    }
    return Math.sqrt(sum / this.timeData.length);
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  drawWaveform(canvas: HTMLCanvasElement, buffer: AudioBuffer, color = '#22d3ee'): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      for (let j = 0; j < step; j++) {
        const sample = data[x * step + j] ?? 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      ctx.moveTo(x, (1 + min) * amp);
      ctx.lineTo(x, (1 + max) * amp);
    }

    ctx.stroke();
  }

  drawLiveSpectrum(canvas: HTMLCanvasElement, color = '#22d3ee'): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      this.rafId = requestAnimationFrame(draw);
      const { width, height } = canvas;
      const freqData = this.getFrequencyData();
      const barWidth = width / freqData.length;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < freqData.length; i++) {
        const barHeight = (freqData[i] / 255) * height;
        const alpha = 0.4 + (freqData[i] / 255) * 0.6;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      ctx.globalAlpha = 1;
    };

    draw();
  }

  drawLiveRMS(canvas: HTMLCanvasElement, color = '#22d3ee'): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      this.rafId = requestAnimationFrame(draw);
      const { width, height } = canvas;
      const rms = Math.min(1, this.getRMS() * 8);

      ctx.clearRect(0, 0, width, height);
      const barHeight = rms * height;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3 + rms * 0.7;
      ctx.fillRect(0, height - barHeight, width, barHeight);
      ctx.globalAlpha = 1;
    };

    draw();
  }

  stopLive(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
