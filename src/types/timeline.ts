// Canonical Timeline Types for Audio Engine Integration

export interface Project {
  id: string;
  name: string;
  description?: string;
  duration: number;
  bpm: number;
  status: 'draft' | 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  projectId: string;
  name: string;
  url: string;
  mimeType: string;
  duration: number;
  analysis?: {
    bpm?: number;
    key?: string;
    energy?: number;
    loudness?: number;
    beatGrid?: number[];
  };
}

export interface Clip {
  id: string;
  trackId: string;
  projectId: string;
  startSec: number;        // When this clip starts in the timeline
  offsetSec: number;       // Where to start playing from within the audio file
  durationSec: number;     // How long to play this clip
  volume: number;          // 0.0 to 1.0
  effects?: Array<{
    type: string;
    parameters: Record<string, any>;
    enabled: boolean;
  }>;
}

export interface Transition {
  id: string;
  projectId: string;
  type: 'crossfade' | 'cut' | 'scratch' | 'echo' | 'filter' | 'reverse' | 'stutter' | 'drop';
  startSec: number;        // When transition starts in timeline
  durationSec: number;     // How long the transition lasts
  trackAId: string;        // Source track
  trackBId: string;        // Destination track
  parameters: {
    // Crossfade parameters
    curve?: 'linear' | 'exponential' | 'logarithmic' | 'scurve';
    eqMatch?: boolean;
    keyMatch?: boolean;
    
    // Filter parameters
    filterType?: 'lowpass' | 'highpass' | 'bandpass';
    cutoffFreq?: number;
    resonance?: number;
    
    // Volume automation points
    volumeAutomation?: Array<{
      timeSec: number;
      trackAGain: number;  // 0.0 to 1.0
      trackBGain: number;  // 0.0 to 1.0
    }>;
    
    // Effect parameters
    [key: string]: any;
  };
  templateId?: string;     // Reference to template used
}

export interface TimelineData {
  project: Project;
  tracks: Track[];
  clips: Clip[];
  transitions: Transition[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTimeSec: number;
  isLoading: boolean;
  error: string | null;
}

// Audio Engine specific types
export interface AudioNode {
  id: string;
  type: 'player' | 'crossfade' | 'filter' | 'gain' | 'recorder';
  toneNode: any; // Tone.js node instance
  connections: string[]; // Connected node IDs
}

export interface ScheduledEvent {
  id: string;
  timeSec: number;
  type: 'start_clip' | 'stop_clip' | 'crossfade' | 'parameter_change';
  targetNodeId: string;
  parameters: Record<string, any>;
}