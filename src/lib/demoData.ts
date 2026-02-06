import { UploadResult } from './storage';

export const DEMO_SONGS: UploadResult[] = [
  {
    id: 'demo-song-1',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    path: 'demo/summer-beats.mp3',
    originalName: 'Summer Beats.mp3',
    mimeType: 'audio/mpeg',
    size: 3500000,
    status: 'ready',
    analysis: {
      bpm: 128,
      key: 'C',
      energy: 0.85,
      duration: 180,
      genre: 'House',
      confidence: 0.95,
      beats: Array.from({ length: 384 }, (_, i) => (i * 180) / 384),
      sections: [
        { type: 'intro', start: 0, end: 30 },
        { type: 'buildup', start: 30, end: 60 },
        { type: 'drop', start: 60, end: 120 },
        { type: 'breakdown', start: 120, end: 150 },
        { type: 'outro', start: 150, end: 180 }
      ]
    },
    metadata: {
      title: 'Summer Beats',
      artist: 'Demo Artist',
      bpm: 128,
      key: 'C',
      energy: 0.85,
      duration: 180,
      genre: 'House'
    }
  },
  {
    id: 'demo-song-2',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    path: 'demo/midnight-groove.mp3',
    originalName: 'Midnight Groove.mp3',
    mimeType: 'audio/mpeg',
    size: 4200000,
    status: 'ready',
    analysis: {
      bpm: 125,
      key: 'D minor',
      energy: 0.78,
      duration: 210,
      genre: 'Deep House',
      confidence: 0.92,
      beats: Array.from({ length: 437 }, (_, i) => (i * 210) / 437),
      sections: [
        { type: 'intro', start: 0, end: 35 },
        { type: 'buildup', start: 35, end: 70 },
        { type: 'drop', start: 70, end: 140 },
        { type: 'breakdown', start: 140, end: 175 },
        { type: 'outro', start: 175, end: 210 }
      ]
    },
    metadata: {
      title: 'Midnight Groove',
      artist: 'Demo Artist',
      bpm: 125,
      key: 'D minor',
      energy: 0.78,
      duration: 210,
      genre: 'Deep House'
    }
  },
  {
    id: 'demo-song-3',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    path: 'demo/electric-sunrise.mp3',
    originalName: 'Electric Sunrise.mp3',
    mimeType: 'audio/mpeg',
    size: 3800000,
    status: 'ready',
    analysis: {
      bpm: 130,
      key: 'G',
      energy: 0.92,
      duration: 195,
      genre: 'Progressive House',
      confidence: 0.89,
      beats: Array.from({ length: 422 }, (_, i) => (i * 195) / 422),
      sections: [
        { type: 'intro', start: 0, end: 32 },
        { type: 'buildup', start: 32, end: 65 },
        { type: 'drop', start: 65, end: 130 },
        { type: 'breakdown', start: 130, end: 163 },
        { type: 'outro', start: 163, end: 195 }
      ]
    },
    metadata: {
      title: 'Electric Sunrise',
      artist: 'Demo Artist',
      bpm: 130,
      key: 'G',
      energy: 0.92,
      duration: 195,
      genre: 'Progressive House'
    }
  },
  {
    id: 'demo-song-4',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    path: 'demo/neon-dreams.mp3',
    originalName: 'Neon Dreams.mp3',
    mimeType: 'audio/mpeg',
    size: 3900000,
    status: 'ready',
    analysis: {
      bpm: 127,
      key: 'A minor',
      energy: 0.88,
      duration: 200,
      genre: 'Tech House',
      confidence: 0.94,
      beats: Array.from({ length: 423 }, (_, i) => (i * 200) / 423),
      sections: [
        { type: 'intro', start: 0, end: 33 },
        { type: 'buildup', start: 33, end: 66 },
        { type: 'drop', start: 66, end: 133 },
        { type: 'breakdown', start: 133, end: 167 },
        { type: 'outro', start: 167, end: 200 }
      ]
    },
    metadata: {
      title: 'Neon Dreams',
      artist: 'Demo Artist',
      bpm: 127,
      key: 'A minor',
      energy: 0.88,
      duration: 200,
      genre: 'Tech House'
    }
  }
];

export function getDemoSongs(): UploadResult[] {
  return DEMO_SONGS;
}

export function getDemoSongById(id: string): UploadResult | undefined {
  return DEMO_SONGS.find(song => song.id === id);
}

export function getCompatibleDemoSongs(sourceSong: UploadResult): UploadResult[] {
  const sourceBpm = sourceSong.analysis?.bpm || sourceSong.metadata?.bpm || 0;

  return DEMO_SONGS.filter(song => {
    if (song.id === sourceSong.id) return false;

    const targetBpm = song.analysis?.bpm || song.metadata?.bpm || 0;
    const bpmDiff = Math.abs(sourceBpm - targetBpm);

    return bpmDiff <= 10;
  }).sort((a, b) => {
    const aBpmDiff = Math.abs((a.analysis?.bpm || a.metadata?.bpm || 0) - sourceBpm);
    const bBpmDiff = Math.abs((b.analysis?.bpm || b.metadata?.bpm || 0) - sourceBpm);
    return aBpmDiff - bBpmDiff;
  });
}
