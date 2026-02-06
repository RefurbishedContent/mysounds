import { DEMO_SONGS } from './demoData';

// Generate realistic waveform data
function generateWaveform(duration: number, energy: number): number[] {
  const samples = 1000;
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const position = i / samples;
    const base = energy * 0.5;
    const variation = Math.sin(position * Math.PI * 20) * 0.2;
    const random = (Math.random() - 0.5) * 0.1;
    waveform.push(Math.max(0, Math.min(1, base + variation + random)));
  }

  return waveform;
}

// Mock Songs (from existing demo data, enhanced with waveforms)
export const MOCK_SONGS = DEMO_SONGS.map(song => ({
  ...song,
  userId: 'mock-user',
  createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  waveformData: generateWaveform(
    song.analysis?.duration || 180,
    song.analysis?.energy || 0.8
  )
}));

// Mock Transition Templates
export const MOCK_TRANSITION_TEMPLATES = [
  {
    id: 'template-short',
    name: 'Quick Mix',
    description: 'Fast 4-second transition for high energy mixes',
    duration: 4,
    category: 'Short',
    difficulty: 'beginner',
    thumbnailUrl: '',
    transitionCurve: 'linear',
    fadeType: 'quick'
  },
  {
    id: 'template-medium',
    name: 'Smooth Blend',
    description: 'Medium 10-second transition with smooth crossfade',
    duration: 10,
    category: 'Medium',
    difficulty: 'intermediate',
    thumbnailUrl: '',
    transitionCurve: 'ease-in-out',
    fadeType: 'smooth'
  },
  {
    id: 'template-long',
    name: 'Extended Journey',
    description: 'Long 20-second transition with gradual blend',
    duration: 20,
    category: 'Long',
    difficulty: 'advanced',
    thumbnailUrl: '',
    transitionCurve: 'ease-in-out',
    fadeType: 'extended'
  }
];

// Mock Transitions
export interface MockTransition {
  id: string;
  userId: string;
  name: string;
  songAId: string;
  songBId: string;
  templateId: string | null;
  transitionStartPoint: number;
  transitionDuration: number;
  songAEndTime: number;
  songBStartTime: number;
  songAMarkerPoint: number;
  songBMarkerPoint: number;
  songAClipStart: number;
  songBClipEnd: number;
  status: 'draft' | 'ready' | 'processing' | 'completed';
  outputUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_TRANSITIONS: MockTransition[] = [
  {
    id: 'transition-1',
    userId: 'mock-user',
    name: 'Summer to Midnight',
    songAId: 'demo-song-1',
    songBId: 'demo-song-2',
    templateId: 'template-short',
    transitionStartPoint: 150,
    transitionDuration: 4,
    songAEndTime: 154,
    songBStartTime: 150,
    songAMarkerPoint: 150,
    songBMarkerPoint: 35,
    songAClipStart: 30,
    songBClipEnd: 175,
    status: 'completed',
    outputUrl: MOCK_SONGS[0].url,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'transition-2',
    userId: 'mock-user',
    name: 'Electric Groove Mix',
    songAId: 'demo-song-3',
    songBId: 'demo-song-4',
    templateId: 'template-medium',
    transitionStartPoint: 130,
    transitionDuration: 10,
    songAEndTime: 140,
    songBStartTime: 130,
    songAMarkerPoint: 130,
    songBMarkerPoint: 33,
    songAClipStart: 32,
    songBClipEnd: 167,
    status: 'completed',
    outputUrl: MOCK_SONGS[2].url,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Blends
export interface MockBlend {
  id: string;
  userId: string;
  transitionId: string;
  name: string;
  songAId: string;
  songBId: string;
  url: string;
  filename: string;
  duration: number;
  fileSize: number;
  format: 'mp3' | 'wav';
  quality: 'standard' | 'high';
  status: 'completed';
  songADurationContribution: number;
  songBDurationContribution: number;
  transitionDuration: number;
  templateName: string;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_BLENDS: MockBlend[] = [
  {
    id: 'blend-1',
    userId: 'mock-user',
    transitionId: 'transition-1',
    name: 'Summer to Midnight (Quick Mix)',
    songAId: 'demo-song-1',
    songBId: 'demo-song-2',
    url: MOCK_SONGS[0].url,
    filename: 'summer-to-midnight.mp3',
    duration: 294,
    fileSize: 7056000,
    format: 'mp3',
    quality: 'high',
    status: 'completed',
    songADurationContribution: 150,
    songBDurationContribution: 140,
    transitionDuration: 4,
    templateName: 'Quick Mix',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blend-2',
    userId: 'mock-user',
    transitionId: 'transition-2',
    name: 'Electric Groove Mix (Smooth Blend)',
    songAId: 'demo-song-3',
    songBId: 'demo-song-4',
    url: MOCK_SONGS[2].url,
    filename: 'electric-groove-mix.mp3',
    duration: 232,
    fileSize: 5568000,
    format: 'mp3',
    quality: 'high',
    status: 'completed',
    songADurationContribution: 130,
    songBDurationContribution: 92,
    transitionDuration: 10,
    templateName: 'Smooth Blend',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'blend-3',
    userId: 'mock-user',
    transitionId: 'transition-1',
    name: 'Midnight to Electric (Extended)',
    songAId: 'demo-song-2',
    songBId: 'demo-song-3',
    url: MOCK_SONGS[1].url,
    filename: 'midnight-to-electric.mp3',
    duration: 345,
    fileSize: 8280000,
    format: 'mp3',
    quality: 'high',
    status: 'completed',
    songADurationContribution: 175,
    songBDurationContribution: 150,
    transitionDuration: 20,
    templateName: 'Extended Journey',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Mix Sessions
export interface MockMixSession {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: 'draft' | 'completed';
  colorTheme: string;
  duration: number;
  fileSize: number;
  autoCrossfadeDuration: number;
  normalizeVolume: boolean;
  masterGain: number;
  totalBlendsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MockMixTrack {
  id: string;
  mixSessionId: string;
  blendId: string;
  position: number;
  startTime: number;
  crossfadeType: 'beat-matched' | 'smooth' | 'quick';
  crossfadeDurationOverride: number | null;
  preGain: number;
  postGain: number;
  fadeIn: number;
  fadeOut: number;
}

export const MOCK_MIX_SESSIONS: MockMixSession[] = [];
export const MOCK_MIX_TRACKS: MockMixTrack[] = [];

// Color themes for mixer
export const COLOR_THEMES = [
  { id: 'neon-blue', name: 'Neon Blue', primary: '#3b82f6', secondary: '#1d4ed8', accent: '#60a5fa' },
  { id: 'sunset-orange', name: 'Sunset Orange', primary: '#f97316', secondary: '#ea580c', accent: '#fb923c' },
  { id: 'electric-green', name: 'Electric Green', primary: '#10b981', secondary: '#059669', accent: '#34d399' },
  { id: 'deep-purple', name: 'Deep Purple', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
  { id: 'hot-pink', name: 'Hot Pink', primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' },
  { id: 'cyber-cyan', name: 'Cyber Cyan', primary: '#06b6d4', secondary: '#0891b2', accent: '#22d3ee' }
];

// LocalStorage keys
const STORAGE_KEYS = {
  SONGS: 'mock_songs',
  TRANSITIONS: 'mock_transitions',
  BLENDS: 'mock_blends',
  MIX_SESSIONS: 'mock_mix_sessions',
  MIX_TRACKS: 'mock_mix_tracks'
};

// Initialize mock data in localStorage
export function initializeMockData() {
  if (!localStorage.getItem(STORAGE_KEYS.SONGS)) {
    localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(MOCK_SONGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSITIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSITIONS, JSON.stringify(MOCK_TRANSITIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BLENDS)) {
    localStorage.setItem(STORAGE_KEYS.BLENDS, JSON.stringify(MOCK_BLENDS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MIX_SESSIONS)) {
    localStorage.setItem(STORAGE_KEYS.MIX_SESSIONS, JSON.stringify(MOCK_MIX_SESSIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MIX_TRACKS)) {
    localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(MOCK_MIX_TRACKS));
  }
}

// Songs API
export function getMockSongs() {
  const songs = localStorage.getItem(STORAGE_KEYS.SONGS);
  return songs ? JSON.parse(songs) : MOCK_SONGS;
}

export function getMockSongById(id: string) {
  const songs = getMockSongs();
  return songs.find((s: any) => s.id === id);
}

// Transitions API
export function getMockTransitions() {
  const transitions = localStorage.getItem(STORAGE_KEYS.TRANSITIONS);
  return transitions ? JSON.parse(transitions) : MOCK_TRANSITIONS;
}

export function getMockTransitionById(id: string) {
  const transitions = getMockTransitions();
  return transitions.find((t: MockTransition) => t.id === id);
}

export function createMockTransition(data: Partial<MockTransition>): Promise<MockTransition> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transitions = getMockTransitions();
      const newTransition: MockTransition = {
        id: `transition-${Date.now()}`,
        userId: 'mock-user',
        name: data.name || 'New Transition',
        songAId: data.songAId!,
        songBId: data.songBId!,
        templateId: data.templateId || null,
        transitionStartPoint: data.transitionStartPoint || 0,
        transitionDuration: data.transitionDuration || 10,
        songAEndTime: data.songAEndTime || 0,
        songBStartTime: data.songBStartTime || 0,
        songAMarkerPoint: data.songAMarkerPoint || 0,
        songBMarkerPoint: data.songBMarkerPoint || 0,
        songAClipStart: data.songAClipStart || 0,
        songBClipEnd: data.songBClipEnd || 0,
        status: 'completed',
        outputUrl: getMockSongById(data.songAId!)?.url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transitions.push(newTransition);
      localStorage.setItem(STORAGE_KEYS.TRANSITIONS, JSON.stringify(transitions));
      resolve(newTransition);
    }, 2000); // Simulate processing time
  });
}

export function deleteMockTransition(id: string) {
  const transitions = getMockTransitions();
  const filtered = transitions.filter((t: MockTransition) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSITIONS, JSON.stringify(filtered));
}

// Blends API
export function getMockBlends() {
  const blends = localStorage.getItem(STORAGE_KEYS.BLENDS);
  return blends ? JSON.parse(blends) : MOCK_BLENDS;
}

export function getMockBlendById(id: string) {
  const blends = getMockBlends();
  return blends.find((b: MockBlend) => b.id === id);
}

export function createMockBlend(transitionId: string): Promise<MockBlend> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transition = getMockTransitionById(transitionId);
      if (!transition) {
        throw new Error('Transition not found');
      }

      const songA = getMockSongById(transition.songAId);
      const songB = getMockSongById(transition.songBId);
      const template = MOCK_TRANSITION_TEMPLATES.find(t => t.id === transition.templateId);

      const blends = getMockBlends();
      const newBlend: MockBlend = {
        id: `blend-${Date.now()}`,
        userId: 'mock-user',
        transitionId,
        name: `${songA?.metadata?.title} to ${songB?.metadata?.title}`,
        songAId: transition.songAId,
        songBId: transition.songBId,
        url: songA?.url || '',
        filename: `blend-${Date.now()}.mp3`,
        duration: transition.songADurationContribution + transition.songBDurationContribution + transition.transitionDuration,
        fileSize: 5000000 + Math.floor(Math.random() * 3000000),
        format: 'mp3',
        quality: 'high',
        status: 'completed',
        songADurationContribution: transition.songAEndTime - transition.songAClipStart,
        songBDurationContribution: transition.songBClipEnd - transition.songBStartTime,
        transitionDuration: transition.transitionDuration,
        templateName: template?.name || 'Custom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      blends.push(newBlend);
      localStorage.setItem(STORAGE_KEYS.BLENDS, JSON.stringify(blends));
      resolve(newBlend);
    }, 3000); // Simulate export time
  });
}

export function deleteMockBlend(id: string) {
  const blends = getMockBlends();
  const filtered = blends.filter((b: MockBlend) => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.BLENDS, JSON.stringify(filtered));
}

// Mix Sessions API
export function getMockMixSessions() {
  const sessions = localStorage.getItem(STORAGE_KEYS.MIX_SESSIONS);
  return sessions ? JSON.parse(sessions) : MOCK_MIX_SESSIONS;
}

export function getMockMixSessionById(id: string) {
  const sessions = getMockMixSessions();
  return sessions.find((s: MockMixSession) => s.id === id);
}

export function createMockMixSession(data: Partial<MockMixSession>): MockMixSession {
  const sessions = getMockMixSessions();
  const newSession: MockMixSession = {
    id: `mix-${Date.now()}`,
    userId: 'mock-user',
    name: data.name || 'New Mix',
    description: data.description || '',
    status: 'draft',
    colorTheme: data.colorTheme || 'neon-blue',
    duration: 0,
    fileSize: 0,
    autoCrossfadeDuration: 8,
    normalizeVolume: true,
    masterGain: 1.0,
    totalBlendsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  sessions.push(newSession);
  localStorage.setItem(STORAGE_KEYS.MIX_SESSIONS, JSON.stringify(sessions));
  return newSession;
}

export function updateMockMixSession(id: string, updates: Partial<MockMixSession>) {
  const sessions = getMockMixSessions();
  const index = sessions.findIndex((s: MockMixSession) => s.id === id);

  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.MIX_SESSIONS, JSON.stringify(sessions));
  }

  return sessions[index];
}

export function deleteMockMixSession(id: string) {
  const sessions = getMockMixSessions();
  const filtered = sessions.filter((s: MockMixSession) => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.MIX_SESSIONS, JSON.stringify(filtered));

  // Also delete associated tracks
  const tracks = getMockMixTracks();
  const filteredTracks = tracks.filter((t: MockMixTrack) => t.mixSessionId !== id);
  localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(filteredTracks));
}

// Mix Tracks API
export function getMockMixTracks(mixSessionId?: string) {
  const tracks = localStorage.getItem(STORAGE_KEYS.MIX_TRACKS);
  const allTracks = tracks ? JSON.parse(tracks) : MOCK_MIX_TRACKS;

  if (mixSessionId) {
    return allTracks.filter((t: MockMixTrack) => t.mixSessionId === mixSessionId);
  }

  return allTracks;
}

export function addMockMixTrack(mixSessionId: string, blendId: string): MockMixTrack {
  const tracks = getMockMixTracks();
  const existingTracks = tracks.filter((t: MockMixTrack) => t.mixSessionId === mixSessionId);
  const position = existingTracks.length;

  const blend = getMockBlendById(blendId);
  const startTime = existingTracks.reduce((sum: number, t: MockMixTrack) => {
    const trackBlend = getMockBlendById(t.blendId);
    return sum + (trackBlend?.duration || 0) - 8; // 8 second crossfade overlap
  }, 0);

  const newTrack: MockMixTrack = {
    id: `track-${Date.now()}`,
    mixSessionId,
    blendId,
    position,
    startTime: Math.max(0, startTime),
    crossfadeType: 'smooth',
    crossfadeDurationOverride: null,
    preGain: 1.0,
    postGain: 1.0,
    fadeIn: 0,
    fadeOut: 0
  };

  tracks.push(newTrack);
  localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(tracks));

  // Update session totals
  const session = getMockMixSessionById(mixSessionId);
  if (session) {
    const totalDuration = existingTracks.reduce((sum: number, t: MockMixTrack) => {
      const trackBlend = getMockBlendById(t.blendId);
      return sum + (trackBlend?.duration || 0);
    }, blend?.duration || 0);

    updateMockMixSession(mixSessionId, {
      totalBlendsCount: existingTracks.length + 1,
      duration: totalDuration - (existingTracks.length * 8) // Account for crossfades
    });
  }

  return newTrack;
}

export function updateMockMixTrack(id: string, updates: Partial<MockMixTrack>) {
  const tracks = getMockMixTracks();
  const index = tracks.findIndex((t: MockMixTrack) => t.id === id);

  if (index !== -1) {
    tracks[index] = { ...tracks[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(tracks));
  }

  return tracks[index];
}

export function deleteMockMixTrack(id: string) {
  const tracks = getMockMixTracks();
  const track = tracks.find((t: MockMixTrack) => t.id === id);

  if (track) {
    const filtered = tracks.filter((t: MockMixTrack) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(filtered));

    // Update session totals
    const remainingTracks = filtered.filter((t: MockMixTrack) => t.mixSessionId === track.mixSessionId);
    const session = getMockMixSessionById(track.mixSessionId);

    if (session) {
      const totalDuration = remainingTracks.reduce((sum: number, t: MockMixTrack) => {
        const trackBlend = getMockBlendById(t.blendId);
        return sum + (trackBlend?.duration || 0);
      }, 0);

      updateMockMixSession(track.mixSessionId, {
        totalBlendsCount: remainingTracks.length,
        duration: totalDuration - Math.max(0, (remainingTracks.length - 1) * 8)
      });
    }
  }
}

export function reorderMockMixTracks(mixSessionId: string, trackIds: string[]) {
  const tracks = getMockMixTracks();

  trackIds.forEach((trackId, index) => {
    const trackIndex = tracks.findIndex((t: MockMixTrack) => t.id === trackId);
    if (trackIndex !== -1) {
      tracks[trackIndex].position = index;
    }
  });

  localStorage.setItem(STORAGE_KEYS.MIX_TRACKS, JSON.stringify(tracks));
}
