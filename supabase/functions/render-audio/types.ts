export interface RenderRequest {
  jobId: string;
  projectId: string;
  userId: string;
  format: 'mp3' | 'wav' | 'flac';
  quality: 'draft' | 'standard' | 'high' | 'lossless';
}

export interface RenderConfig {
  sampleRate: number;
  bitDepth: number;
  bitrate?: number;
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
}

export interface AudioTrack {
  id: string;
  url: string;
  startOffset: number;
  volume: number;
  analysis?: {
    duration: number;
    bpm: number;
    key: string;
    beatGrid: number[];
  };
}

export interface Transition {
  type: string;
  startTime: number;
  duration: number;
  parameters: any;
}

export interface TemplatePlacement {
  id: string;
  templateId: string;
  startTime: number;
  duration: number;
  trackARegion: { start: number; end: number };
  trackBRegion: { start: number; end: number };
  parameters: any;
  transitions: Transition[];
}
