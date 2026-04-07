export interface Track {
  id: string;
  userId: string;
  title: string;
  artist: string;
  album: string;
  originalName: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  url: string;
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'failed';
  durationMs: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  analysis?: TrackAnalysis;
  manualGenre?: string;
  genreConfidence?: number;
  metadata?: TrackMetadata;
  lastAnalyzedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackAnalysis {
  duration: number;
  bpm?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  loudness?: number;
  genre?: string;
  genreConfidence?: number;
  subGenres?: string[];
  moodTags?: string[];
  hasVocals?: boolean;
  vocalPercentage?: number;
  brightness?: number;
  warmth?: number;
  dynamicRangeDb?: number;
  beatConfidence?: number;
  keyConfidence?: number;
  harmonicComplexity?: number;
  rhythmicComplexity?: number;
  tempoStability?: number;
  beatGrid?: number[];
  downbeats?: number[];
  waveformData?: number[];
  analyzedAt?: string;
  analyzerVersion?: string;
}

export interface TrackMetadata {
  albumArtUrl?: string;
  year?: number;
  comment?: string;
  trackNumber?: number;
  discNumber?: number;
}

export interface StemSeparationJob {
  id: string;
  trackId: string;
  userId: string;
  replicatePredictionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stemLevel: 1 | 2 | 3;
  vocalsUrl?: string;
  drumsUrl?: string;
  bassUrl?: string;
  otherUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackUploadOptions {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
}
