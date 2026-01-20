export interface TimelineClip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  color: string;
  label: string;
  audioUrl: string;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  color: string;
}

export interface GridConfig {
  enabled: boolean;
  division: 'bar' | 'beat' | 'half-beat' | 'quarter-beat';
  bpm: number;
}

export interface TimelineState {
  clips: TimelineClip[];
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  playheadTime: number;
  zoom: number;
  scrollOffset: number;
  selectedClips: string[];
  gridConfig: GridConfig;
}

export class TimelineEngine {
  private state: TimelineState;
  private listeners: Set<(state: TimelineState) => void> = new Set();
  private history: TimelineState[] = [];
  private historyIndex = -1;
  private maxHistory = 50;

  constructor() {
    this.state = {
      clips: [],
      markers: [],
      regions: [],
      playheadTime: 0,
      zoom: 1,
      scrollOffset: 0,
      selectedClips: [],
      gridConfig: {
        enabled: true,
        division: 'beat',
        bpm: 120
      }
    };
  }

  getState(): TimelineState {
    return { ...this.state };
  }

  subscribe(listener: (state: TimelineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private saveHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ ...this.state });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = { ...this.history[this.historyIndex] };
      this.notifyListeners();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = { ...this.history[this.historyIndex] };
      this.notifyListeners();
    }
  }

  addClip(clip: TimelineClip): void {
    this.saveHistory();
    this.state.clips.push(clip);
    this.notifyListeners();
  }

  removeClip(clipId: string): void {
    this.saveHistory();
    this.state.clips = this.state.clips.filter(c => c.id !== clipId);
    this.state.selectedClips = this.state.selectedClips.filter(id => id !== clipId);
    this.notifyListeners();
  }

  moveClip(clipId: string, newStartTime: number, snapToGrid = true): void {
    this.saveHistory();
    const clip = this.state.clips.find(c => c.id === clipId);

    if (clip) {
      if (snapToGrid && this.state.gridConfig.enabled) {
        newStartTime = this.snapToGrid(newStartTime);
      }

      clip.startTime = Math.max(0, newStartTime);
      this.notifyListeners();
    }
  }

  trimClip(clipId: string, side: 'start' | 'end', newTime: number): void {
    this.saveHistory();
    const clip = this.state.clips.find(c => c.id === clipId);

    if (clip) {
      if (side === 'start') {
        const delta = newTime - clip.startTime;
        clip.startTime = newTime;
        clip.offset += delta;
        clip.duration -= delta;
      } else {
        const endTime = clip.startTime + clip.duration;
        clip.duration = newTime - clip.startTime;
      }

      clip.duration = Math.max(0.1, clip.duration);
      this.notifyListeners();
    }
  }

  splitClip(clipId: string, splitTime: number): void {
    this.saveHistory();
    const clipIndex = this.state.clips.findIndex(c => c.id === clipId);

    if (clipIndex >= 0) {
      const originalClip = this.state.clips[clipIndex];
      const relativeTime = splitTime - originalClip.startTime;

      if (relativeTime > 0 && relativeTime < originalClip.duration) {
        const firstClip = {
          ...originalClip,
          duration: relativeTime,
          id: `${originalClip.id}-1`
        };

        const secondClip = {
          ...originalClip,
          id: `${originalClip.id}-2`,
          startTime: splitTime,
          offset: originalClip.offset + relativeTime,
          duration: originalClip.duration - relativeTime
        };

        this.state.clips[clipIndex] = firstClip;
        this.state.clips.splice(clipIndex + 1, 0, secondClip);
        this.notifyListeners();
      }
    }
  }

  setClipFade(clipId: string, fadeType: 'in' | 'out', duration: number): void {
    this.saveHistory();
    const clip = this.state.clips.find(c => c.id === clipId);

    if (clip) {
      if (fadeType === 'in') {
        clip.fadeIn = Math.max(0, Math.min(duration, clip.duration / 2));
      } else {
        clip.fadeOut = Math.max(0, Math.min(duration, clip.duration / 2));
      }

      this.notifyListeners();
    }
  }

  selectClip(clipId: string, addToSelection = false): void {
    if (addToSelection) {
      if (!this.state.selectedClips.includes(clipId)) {
        this.state.selectedClips.push(clipId);
      }
    } else {
      this.state.selectedClips = [clipId];
    }

    this.notifyListeners();
  }

  deselectAll(): void {
    this.state.selectedClips = [];
    this.notifyListeners();
  }

  addMarker(time: number, label: string): void {
    this.saveHistory();
    this.state.markers.push({
      id: `marker-${Date.now()}`,
      time,
      label,
      color: '#3b82f6'
    });

    this.notifyListeners();
  }

  removeMarker(markerId: string): void {
    this.saveHistory();
    this.state.markers = this.state.markers.filter(m => m.id !== markerId);
    this.notifyListeners();
  }

  addRegion(startTime: number, endTime: number, label: string): void {
    this.saveHistory();
    this.state.regions.push({
      id: `region-${Date.now()}`,
      startTime,
      endTime,
      label,
      color: '#8b5cf6'
    });

    this.notifyListeners();
  }

  removeRegion(regionId: string): void {
    this.saveHistory();
    this.state.regions = this.state.regions.filter(r => r.id !== regionId);
    this.notifyListeners();
  }

  setPlayheadTime(time: number): void {
    this.state.playheadTime = Math.max(0, time);
    this.notifyListeners();
  }

  setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(10, zoom));
    this.notifyListeners();
  }

  setScrollOffset(offset: number): void {
    this.state.scrollOffset = Math.max(0, offset);
    this.notifyListeners();
  }

  setGridConfig(config: Partial<GridConfig>): void {
    this.state.gridConfig = { ...this.state.gridConfig, ...config };
    this.notifyListeners();
  }

  snapToGrid(time: number): number {
    if (!this.state.gridConfig.enabled) return time;

    const { division, bpm } = this.state.gridConfig;
    const beatDuration = 60 / bpm;

    let gridSize: number;
    switch (division) {
      case 'bar':
        gridSize = beatDuration * 4;
        break;
      case 'beat':
        gridSize = beatDuration;
        break;
      case 'half-beat':
        gridSize = beatDuration / 2;
        break;
      case 'quarter-beat':
        gridSize = beatDuration / 4;
        break;
      default:
        gridSize = beatDuration;
    }

    return Math.round(time / gridSize) * gridSize;
  }

  getGridLines(viewStart: number, viewEnd: number): number[] {
    if (!this.state.gridConfig.enabled) return [];

    const { division, bpm } = this.state.gridConfig;
    const beatDuration = 60 / bpm;

    let gridSize: number;
    switch (division) {
      case 'bar':
        gridSize = beatDuration * 4;
        break;
      case 'beat':
        gridSize = beatDuration;
        break;
      case 'half-beat':
        gridSize = beatDuration / 2;
        break;
      case 'quarter-beat':
        gridSize = beatDuration / 4;
        break;
      default:
        gridSize = beatDuration;
    }

    const lines: number[] = [];
    const startGrid = Math.floor(viewStart / gridSize) * gridSize;

    for (let time = startGrid; time <= viewEnd; time += gridSize) {
      if (time >= viewStart) {
        lines.push(time);
      }
    }

    return lines;
  }

  getClipsInRange(startTime: number, endTime: number): TimelineClip[] {
    return this.state.clips.filter(clip => {
      const clipEnd = clip.startTime + clip.duration;
      return clip.startTime < endTime && clipEnd > startTime;
    });
  }

  duplicateClips(clipIds: string[]): void {
    this.saveHistory();

    clipIds.forEach(id => {
      const clip = this.state.clips.find(c => c.id === id);
      if (clip) {
        const newClip = {
          ...clip,
          id: `${clip.id}-copy-${Date.now()}`,
          startTime: clip.startTime + clip.duration
        };

        this.state.clips.push(newClip);
      }
    });

    this.notifyListeners();
  }
}
