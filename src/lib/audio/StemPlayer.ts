import { MixPlanInstructions, StemInstruction } from './TransitionMatcher';

// ============================================================
// TYPES
// ============================================================

export interface StemChannel {
  stemId: string;
  stemType: string;
  buffer: AudioBuffer;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  analyserNode: AnalyserNode;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  pan: number;
}

export type DeckId = 'A' | 'B';

// ============================================================
// STEM PLAYER
// ============================================================

export class StemPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private stems: Map<string, StemChannel> = new Map();
  private startTime = 0;
  private pauseOffset = 0;
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    }
    return this.context;
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadStem(stemId: string, stemType: string, url: string): Promise<void> {
    const ctx = this.getContext();

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch stem: ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const gainNode = ctx.createGain();
    const pannerNode = ctx.createStereoPanner();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;

    gainNode.connect(pannerNode);
    pannerNode.connect(analyserNode);
    analyserNode.connect(this.masterGain!);

    const channel: StemChannel = {
      stemId,
      stemType,
      buffer: audioBuffer,
      sourceNode: null,
      gainNode,
      pannerNode,
      analyserNode,
      isMuted: false,
      isSolo: false,
      volume: 1,
      pan: 0,
    };

    this.stems.set(stemId, channel);
  }

  play(): void {
    const ctx = this.getContext();
    if (this.isPlaying) this.stop();

    this.startTime = ctx.currentTime - this.pauseOffset;
    this.isPlaying = true;

    for (const [, channel] of this.stems) {
      this._startChannel(channel, this.pauseOffset);
    }
  }

  stop(): void {
    for (const [, channel] of this.stems) {
      if (channel.sourceNode) {
        try { channel.sourceNode.stop(); } catch { /* already stopped */ }
        channel.sourceNode.disconnect();
        channel.sourceNode = null;
      }
    }
    this.pauseOffset = 0;
    this.isPlaying = false;
  }

  pause(): void {
    if (!this.isPlaying || !this.context) return;
    this.pauseOffset = this.context.currentTime - this.startTime;
    this.stop();
    this.isPlaying = false;
  }

  seek(ms: number): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseOffset = ms / 1000;
    if (wasPlaying) this.play();
  }

  getCurrentTimeMs(): number {
    if (!this.context) return 0;
    if (!this.isPlaying) return this.pauseOffset * 1000;
    return (this.context.currentTime - this.startTime) * 1000;
  }

  private _startChannel(channel: StemChannel, offsetSeconds: number): void {
    const ctx = this.getContext();
    const source = ctx.createBufferSource();
    source.buffer = channel.buffer;
    source.connect(channel.gainNode);
    channel.sourceNode = source;

    const offset = Math.max(0, Math.min(offsetSeconds, channel.buffer.duration));
    source.start(0, offset);
  }

  setVolume(stemId: string, volume: number): void {
    const channel = this.stems.get(stemId);
    if (!channel) return;
    channel.volume = Math.max(0, Math.min(1, volume));
    if (!channel.isMuted) {
      channel.gainNode.gain.setValueAtTime(channel.volume, this.getContext().currentTime);
    }
  }

  mute(stemId: string, muted?: boolean): void {
    const channel = this.stems.get(stemId);
    if (!channel) return;
    channel.isMuted = muted !== undefined ? muted : !channel.isMuted;
    channel.gainNode.gain.setValueAtTime(
      channel.isMuted ? 0 : channel.volume,
      this.getContext().currentTime
    );
    this._updateSoloState();
  }

  solo(stemId: string, soloed?: boolean): void {
    const channel = this.stems.get(stemId);
    if (!channel) return;
    channel.isSolo = soloed !== undefined ? soloed : !channel.isSolo;
    this._updateSoloState();
  }

  private _updateSoloState(): void {
    const ctx = this.getContext();
    const anySolo = [...this.stems.values()].some((c) => c.isSolo);

    for (const [, c] of this.stems) {
      if (c.isMuted) {
        c.gainNode.gain.setValueAtTime(0, ctx.currentTime);
      } else if (anySolo) {
        c.gainNode.gain.setValueAtTime(c.isSolo ? c.volume : 0, ctx.currentTime);
      } else {
        c.gainNode.gain.setValueAtTime(c.volume, ctx.currentTime);
      }
    }
  }

  setPan(stemId: string, pan: number): void {
    const channel = this.stems.get(stemId);
    if (!channel) return;
    channel.pan = Math.max(-1, Math.min(1, pan));
    channel.pannerNode.pan.setValueAtTime(channel.pan, this.getContext().currentTime);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.context.currentTime
      );
    }
  }

  getAnalyser(stemId: string): AnalyserNode | null {
    return this.stems.get(stemId)?.analyserNode ?? null;
  }

  getStemIds(): string[] {
    return [...this.stems.keys()];
  }

  getChannel(stemId: string): StemChannel | undefined {
    return this.stems.get(stemId);
  }

  getRMS(stemId: string): number {
    const channel = this.stems.get(stemId);
    if (!channel) return 0;
    const data = new Float32Array(channel.analyserNode.fftSize);
    channel.analyserNode.getFloatTimeDomainData(data);
    const sum = data.reduce((acc, v) => acc + v * v, 0);
    return Math.sqrt(sum / data.length);
  }

  executeMixPlan(plan: MixPlanInstructions, currentTimeMs: number): void {
    const ctx = this.getContext();
    const nowAudio = ctx.currentTime;
    const offsetSeconds = (currentTimeMs) / 1000;

    for (const [stemKey, instruction] of Object.entries(plan.stemInstructions)) {
      const [stemType, deck] = stemKey.split('_');
      const stemId = this._findStemId(stemType, deck as DeckId);
      if (!stemId) continue;

      const channel = this.stems.get(stemId);
      if (!channel) continue;

      this._applyInstruction(channel, instruction, nowAudio, offsetSeconds);
    }
  }

  private _findStemId(stemType: string, _deck: DeckId): string | null {
    for (const [id, channel] of this.stems) {
      if (channel.stemType === stemType) return id;
    }
    return null;
  }

  private _applyInstruction(
    channel: StemChannel,
    instruction: StemInstruction,
    nowAudio: number,
    _offsetSeconds: number
  ): void {
    const ctx = this.getContext();
    const gain = channel.gainNode.gain;

    switch (instruction.action) {
      case 'fade_out': {
        const startAt = nowAudio + ((instruction.start_ms ?? 0) / 1000);
        const endAt   = nowAudio + ((instruction.end_ms   ?? 0) / 1000);
        gain.setValueAtTime(channel.volume, startAt);
        if (instruction.curve === 'exponential') {
          gain.exponentialRampToValueAtTime(0.0001, endAt);
        } else {
          gain.linearRampToValueAtTime(0, endAt);
        }
        break;
      }
      case 'fade_in': {
        const startAt = nowAudio + ((instruction.start_ms ?? 0) / 1000);
        const endAt   = nowAudio + ((instruction.end_ms   ?? 0) / 1000);
        gain.setValueAtTime(0, startAt);
        gain.linearRampToValueAtTime(channel.volume, endAt);
        break;
      }
      case 'cut': {
        const atAudio = nowAudio + ((instruction.at_ms ?? 0) / 1000);
        gain.setValueAtTime(channel.volume, atAudio);
        gain.setValueAtTime(0, atAudio + 0.001);
        break;
      }
      case 'cut_in': {
        const atAudio = nowAudio + ((instruction.at_ms ?? 0) / 1000);
        gain.setValueAtTime(0, ctx.currentTime);
        gain.setValueAtTime(channel.volume, atAudio);
        break;
      }
      case 'low_pass_sweep':
      case 'high_pass_release': {
        const filterNode = ctx.createBiquadFilter();
        filterNode.type = instruction.action === 'low_pass_sweep' ? 'lowpass' : 'highpass';
        filterNode.frequency.value = instruction.from_hz ?? 20000;
        channel.gainNode.disconnect();
        channel.gainNode.connect(filterNode);
        filterNode.connect(channel.pannerNode);
        const dur = (instruction.duration_ms ?? 8000) / 1000;
        filterNode.frequency.linearRampToValueAtTime(instruction.to_hz ?? 20, nowAudio + dur);
        break;
      }
      case 'none':
      default:
        break;
    }
  }

  clear(): void {
    this.stop();
    this.stems.clear();
  }

  dispose(): void {
    this.clear();
    this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
  }
}
