import * as Tone from 'tone';

export interface Track {
  id: string;
  name: string;
  url: string;
  volume: number;
  pan: number;
  solo: boolean;
  mute: boolean;
  color: string;
  player?: Tone.Player;
  gain?: Tone.Gain;
  panner?: Tone.Panner;
  effects: Effect[];
}

export interface Effect {
  id: string;
  type: 'reverb' | 'delay' | 'chorus' | 'distortion' | 'eq' | 'compressor';
  enabled: boolean;
  parameters: any;
}

export interface CuePoint {
  id: string;
  time: number;
  label: string;
  color: string;
  type: 'standard' | 'hot';
}

export interface TransportState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  loopStart?: number;
  loopEnd?: number;
  loopEnabled: boolean;
}

export class MultiTrackEngine {
  private tracks: Map<string, Track> = new Map();
  private master: Tone.Gain;
  private limiter: Tone.Limiter;
  private transportState: TransportState;
  private cuePoints: Map<string, CuePoint> = new Map();
  private isInitialized = false;
  private onStateChange?: (state: TransportState) => void;
  private updateInterval?: number;

  constructor() {
    this.master = new Tone.Gain(1).toDestination();
    this.limiter = new Tone.Limiter(-0.5).connect(this.master);

    this.transportState = {
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      bpm: 120,
      loopEnabled: false
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Tone.start();
      Tone.Transport.bpm.value = this.transportState.bpm;
      this.isInitialized = true;

      this.startTimeUpdate();
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }

  async addTrack(
    id: string,
    url: string,
    name: string,
    options?: Partial<Track>
  ): Promise<Track> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const player = new Tone.Player(url);
    const gain = new Tone.Gain(options?.volume ?? 1);
    const panner = new Tone.Panner(options?.pan ?? 0);

    player.connect(gain);
    gain.connect(panner);
    panner.connect(this.limiter);

    const track: Track = {
      id,
      name,
      url,
      volume: options?.volume ?? 1,
      pan: options?.pan ?? 0,
      solo: options?.solo ?? false,
      mute: options?.mute ?? false,
      color: options?.color ?? this.generateRandomColor(),
      player,
      gain,
      panner,
      effects: []
    };

    this.tracks.set(id, track);
    this.updateDuration();

    return track;
  }

  removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track) {
      track.player?.dispose();
      track.gain?.dispose();
      track.panner?.dispose();
      track.effects.forEach(effect => this.disposeEffect(effect));
      this.tracks.delete(id);
      this.updateDuration();
    }
  }

  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getTrack(id: string): Track | undefined {
    return this.tracks.get(id);
  }

  setTrackVolume(id: string, volume: number): void {
    const track = this.tracks.get(id);
    if (track && track.gain) {
      track.volume = Math.max(0, Math.min(1, volume));
      track.gain.gain.rampTo(track.volume, 0.05);
    }
  }

  setTrackPan(id: string, pan: number): void {
    const track = this.tracks.get(id);
    if (track && track.panner) {
      track.pan = Math.max(-1, Math.min(1, pan));
      track.panner.pan.rampTo(track.pan, 0.05);
    }
  }

  setTrackSolo(id: string, solo: boolean): void {
    const track = this.tracks.get(id);
    if (track) {
      track.solo = solo;
      this.updateTrackMuting();
    }
  }

  setTrackMute(id: string, mute: boolean): void {
    const track = this.tracks.get(id);
    if (track) {
      track.mute = mute;
      this.updateTrackMuting();
    }
  }

  private updateTrackMuting(): void {
    const hasSolo = Array.from(this.tracks.values()).some(t => t.solo);

    this.tracks.forEach(track => {
      if (track.gain) {
        const shouldMute = track.mute || (hasSolo && !track.solo);
        track.gain.gain.rampTo(shouldMute ? 0 : track.volume, 0.05);
      }
    });
  }

  setMasterVolume(volume: number): void {
    this.master.gain.rampTo(Math.max(0, Math.min(1, volume)), 0.1);
  }

  async play(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.tracks.forEach(track => {
      if (track.player && track.player.loaded) {
        track.player.start();
      }
    });

    Tone.Transport.start();
    this.transportState.isPlaying = true;
    this.transportState.isPaused = false;
    this.emitStateChange();
  }

  pause(): void {
    Tone.Transport.pause();
    this.tracks.forEach(track => {
      if (track.player) {
        track.player.stop();
      }
    });

    this.transportState.isPlaying = false;
    this.transportState.isPaused = true;
    this.emitStateChange();
  }

  stop(): void {
    Tone.Transport.stop();
    this.tracks.forEach(track => {
      if (track.player) {
        track.player.stop();
      }
    });

    this.transportState.isPlaying = false;
    this.transportState.isPaused = false;
    this.transportState.currentTime = 0;
    this.emitStateChange();
  }

  seek(time: number): void {
    const newTime = Math.max(0, Math.min(time, this.transportState.duration));
    Tone.Transport.seconds = newTime;

    this.tracks.forEach(track => {
      if (track.player) {
        track.player.stop();
        if (this.transportState.isPlaying) {
          track.player.start(0, newTime);
        }
      }
    });

    this.transportState.currentTime = newTime;
    this.emitStateChange();
  }

  setLoop(enabled: boolean, start?: number, end?: number): void {
    this.transportState.loopEnabled = enabled;
    this.transportState.loopStart = start;
    this.transportState.loopEnd = end;

    if (enabled && start !== undefined && end !== undefined) {
      Tone.Transport.loop = true;
      Tone.Transport.loopStart = start;
      Tone.Transport.loopEnd = end;
    } else {
      Tone.Transport.loop = false;
    }

    this.emitStateChange();
  }

  setBPM(bpm: number): void {
    this.transportState.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
    this.emitStateChange();
  }

  addCuePoint(time: number, label: string, type: 'standard' | 'hot' = 'standard'): CuePoint {
    const cue: CuePoint = {
      id: `cue-${Date.now()}-${Math.random()}`,
      time,
      label,
      color: this.generateRandomColor(),
      type
    };

    this.cuePoints.set(cue.id, cue);
    return cue;
  }

  removeCuePoint(id: string): void {
    this.cuePoints.delete(id);
  }

  getCuePoints(): CuePoint[] {
    return Array.from(this.cuePoints.values()).sort((a, b) => a.time - b.time);
  }

  jumpToCue(id: string): void {
    const cue = this.cuePoints.get(id);
    if (cue) {
      this.seek(cue.time);
    }
  }

  private updateDuration(): void {
    let maxDuration = 0;
    this.tracks.forEach(track => {
      if (track.player && track.player.loaded) {
        maxDuration = Math.max(maxDuration, track.player.buffer.duration);
      }
    });

    this.transportState.duration = maxDuration;
    this.emitStateChange();
  }

  private startTimeUpdate(): void {
    this.updateInterval = window.setInterval(() => {
      if (this.transportState.isPlaying) {
        this.transportState.currentTime = Tone.Transport.seconds;
        this.emitStateChange();
      }
    }, 100);
  }

  onTransportStateChange(callback: (state: TransportState) => void): void {
    this.onStateChange = callback;
  }

  private emitStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.transportState });
    }
  }

  getState(): TransportState {
    return { ...this.transportState };
  }

  private generateRandomColor(): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private disposeEffect(effect: Effect): void {
    // Dispose effect nodes when implemented
  }

  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.tracks.forEach(track => {
      track.player?.dispose();
      track.gain?.dispose();
      track.panner?.dispose();
    });

    this.master.dispose();
    this.limiter.dispose();
    this.tracks.clear();
    this.cuePoints.clear();
  }
}
