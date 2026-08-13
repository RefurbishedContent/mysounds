import { UploadResult } from '../../lib/storage';

export const MAX_SONGS = 10;
export const MIN_CLIP_DURATION = 5;
export const MAX_CLIP_DURATION = 30;
export const DEFAULT_TRANSITION_DURATION = 10;
export const MAX_TRANSITION_BLEND_SECONDS = 10;

export const SONG_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const SONG_COLORS = [
  { border: 'border-cyan-500', bg: 'bg-gradient-to-br from-cyan-500 to-cyan-600', shadow: 'shadow-lg shadow-cyan-500/50', fill: 'bg-cyan-500/5', glow: 'shadow-lg shadow-cyan-500/20', bpmBg: 'bg-cyan-500/20', bpmText: 'text-cyan-300', dot: 'bg-cyan-400', tracingVariant: 'variant-cyan' },
  { border: 'border-green-500', bg: 'bg-gradient-to-br from-green-500 to-green-600', shadow: 'shadow-lg shadow-green-500/50', fill: 'bg-green-500/5', glow: 'shadow-lg shadow-green-500/20', bpmBg: 'bg-green-500/20', bpmText: 'text-green-300', dot: 'bg-green-400', tracingVariant: 'variant-green' },
  { border: 'border-blue-500', bg: 'bg-gradient-to-br from-blue-500 to-blue-600', shadow: 'shadow-lg shadow-blue-500/50', fill: 'bg-blue-500/5', glow: 'shadow-lg shadow-blue-500/20', bpmBg: 'bg-blue-500/20', bpmText: 'text-blue-300', dot: 'bg-blue-400', tracingVariant: 'variant-blue' },
  { border: 'border-amber-500', bg: 'bg-gradient-to-br from-amber-500 to-amber-600', shadow: 'shadow-lg shadow-amber-500/50', fill: 'bg-amber-500/5', glow: 'shadow-lg shadow-amber-500/20', bpmBg: 'bg-amber-500/20', bpmText: 'text-amber-300', dot: 'bg-amber-400', tracingVariant: 'variant-amber' },
  { border: 'border-rose-500', bg: 'bg-gradient-to-br from-rose-500 to-rose-600', shadow: 'shadow-lg shadow-rose-500/50', fill: 'bg-rose-500/5', glow: 'shadow-lg shadow-rose-500/20', bpmBg: 'bg-rose-500/20', bpmText: 'text-rose-300', dot: 'bg-rose-400', tracingVariant: 'variant-rose' },
  { border: 'border-teal-500', bg: 'bg-gradient-to-br from-teal-500 to-teal-600', shadow: 'shadow-lg shadow-teal-500/50', fill: 'bg-teal-500/5', glow: 'shadow-lg shadow-teal-500/20', bpmBg: 'bg-teal-500/20', bpmText: 'text-teal-300', dot: 'bg-teal-400', tracingVariant: 'variant-teal' },
  { border: 'border-orange-500', bg: 'bg-gradient-to-br from-orange-500 to-orange-600', shadow: 'shadow-lg shadow-orange-500/50', fill: 'bg-orange-500/5', glow: 'shadow-lg shadow-orange-500/20', bpmBg: 'bg-orange-500/20', bpmText: 'text-orange-300', dot: 'bg-orange-400', tracingVariant: 'variant-orange' },
  { border: 'border-emerald-500', bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', shadow: 'shadow-lg shadow-emerald-500/50', fill: 'bg-emerald-500/5', glow: 'shadow-lg shadow-emerald-500/20', bpmBg: 'bg-emerald-500/20', bpmText: 'text-emerald-300', dot: 'bg-emerald-400', tracingVariant: 'variant-emerald' },
  { border: 'border-sky-500', bg: 'bg-gradient-to-br from-sky-500 to-sky-600', shadow: 'shadow-lg shadow-sky-500/50', fill: 'bg-sky-500/5', glow: 'shadow-lg shadow-sky-500/20', bpmBg: 'bg-sky-500/20', bpmText: 'text-sky-300', dot: 'bg-sky-400', tracingVariant: 'variant-sky' },
  { border: 'border-lime-500', bg: 'bg-gradient-to-br from-lime-500 to-lime-600', shadow: 'shadow-lg shadow-lime-500/50', fill: 'bg-lime-500/5', glow: 'shadow-lg shadow-lime-500/20', bpmBg: 'bg-lime-500/20', bpmText: 'text-lime-300', dot: 'bg-lime-400', tracingVariant: 'variant-lime' },
];

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getCompatibilityScore(songA: UploadResult, songB: UploadResult): number {
  let score = 0;
  let factors = 0;

  const bpmA = songA.analysis?.bpm;
  const bpmB = songB.analysis?.bpm;

  if (bpmA && bpmB) {
    const bpmDiff = Math.abs(bpmA - bpmB);
    score += Math.max(0, 100 - bpmDiff * 2);
    factors++;
  }

  const keyA = songA.analysis?.key;
  const keyB = songB.analysis?.key;

  if (keyA && keyB) {
    const compatiblePairs: Record<string, string[]> = {
      'C': ['C', 'G', 'F', 'Am', 'Em', 'Dm'],
      'G': ['G', 'D', 'C', 'Em', 'Bm', 'Am'],
      'D': ['D', 'A', 'G', 'Bm', 'F#m', 'Em'],
      'A': ['A', 'E', 'D', 'F#m', 'C#m', 'Bm'],
      'E': ['E', 'B', 'A', 'C#m', 'G#m', 'F#m'],
      'F': ['F', 'C', 'Bb', 'Dm', 'Am', 'Gm'],
    };

    let isCompatible = keyA === keyB;
    if (!isCompatible) {
      for (const [key, compatible] of Object.entries(compatiblePairs)) {
        if (keyA.includes(key) && compatible.some(k => keyB.includes(k))) {
          isCompatible = true;
          break;
        }
      }
    }
    score += isCompatible ? 100 : 60;
    factors++;
  }

  if (factors === 0) return 75;
  return Math.round(score / factors);
}

export function generateMashUpName(songs: UploadResult[]): string {
  const extractArtist = (filename: string): string => {
    const parts = filename.split(' - ');
    if (parts.length > 1) return parts[0].trim();
    return filename.length > 15 ? filename.substring(0, 15) : filename;
  };

  if (songs.length <= 2) {
    return `${extractArtist(songs[0].originalName)} → ${extractArtist(songs[songs.length - 1].originalName)}`;
  }

  const first = extractArtist(songs[0].originalName);
  const last = extractArtist(songs[songs.length - 1].originalName);
  return `${first} → ${last} (${songs.length} tracks)`;
}
