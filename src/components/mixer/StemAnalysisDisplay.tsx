import React from 'react';
import { Music, Activity, Tag } from 'lucide-react';
import { CamelotWheel } from './CamelotWheel';
import { keyCompatibilityScore, bpmProximityScore } from '../../lib/audio/TransitionMatcher';

interface StemSummary {
  stemType: string;
  bpm: number | null;
  key: string;
  energyLevel: number;
  aiTags: string[];
  analysisStatus: string;
}

interface TrackAnalysisSummary {
  trackId: string;
  title: string;
  artist: string;
  stems: StemSummary[];
}

interface StemAnalysisDisplayProps {
  trackA?: TrackAnalysisSummary;
  trackB?: TrackAnalysisSummary;
}

const STEM_COLORS: Record<string, string> = {
  drums:  '#f97316',
  bass:   '#8b5cf6',
  vocals: '#22d3ee',
  melody: '#4ade80',
  other:  '#94a3b8',
};

function getRepresentativeBpm(stems: StemSummary[]): number | null {
  for (const s of stems) {
    if (s.bpm && s.bpm > 0) return s.bpm;
  }
  return null;
}

function getRepresentativeKey(stems: StemSummary[]): string {
  for (const type of ['vocals', 'melody', 'bass']) {
    const s = stems.find((x) => x.stemType === type);
    if (s?.key) return s.key;
  }
  return '';
}

function compatibilityBadgeStyle(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
  if (score >= 0.6) return 'bg-amber-500/15 border-amber-500/40 text-amber-400';
  return 'bg-red-500/15 border-red-500/40 text-red-400';
}

function EnergyBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function TrackColumn({ track, label }: { track: TrackAnalysisSummary; label: string }) {
  const repBpm = getRepresentativeBpm(track.stems);
  const repKey = getRepresentativeKey(track.stems);

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-widest text-slate-400">{label}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{track.title}</div>
          <div className="text-xs text-slate-500 truncate">{track.artist}</div>
        </div>
      </div>

      <div className="flex gap-3">
        {repKey && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">Key</div>
            <div className="text-base font-bold text-white">{repKey}</div>
          </div>
        )}
        {repBpm && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-center min-w-0">
            <div className="text-xs text-slate-500 mb-0.5">BPM</div>
            <div className="text-base font-bold text-white">{repBpm.toFixed(1)}</div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {track.stems.map((stem) => {
          const color = STEM_COLORS[stem.stemType] ?? '#94a3b8';
          return (
            <div key={stem.stemType} className="flex items-center gap-2">
              <span className="text-xs w-12 truncate" style={{ color }}>
                {stem.stemType.charAt(0).toUpperCase() + stem.stemType.slice(1, 4)}
              </span>
              <EnergyBar value={stem.energyLevel} color={color} />
              <span className="text-xs text-slate-600 w-8 text-right">
                {Math.round(stem.energyLevel * 100)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1">
        {track.stems.flatMap((s) =>
          (s.aiTags ?? []).slice(0, 3).map((tag) => (
            <span
              key={`${s.stemType}-${tag}`}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-400"
            >
              <Tag size={8} />
              {tag}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function StemAnalysisDisplay({ trackA, trackB }: StemAnalysisDisplayProps) {
  const keyA = trackA ? getRepresentativeKey(trackA.stems) : '';
  const keyB = trackB ? getRepresentativeKey(trackB.stems) : '';
  const bpmA = trackA ? getRepresentativeBpm(trackA.stems) : null;
  const bpmB = trackB ? getRepresentativeBpm(trackB.stems) : null;

  const keyScore = keyA && keyB ? keyCompatibilityScore(keyA, keyB) : null;
  const bpmScore = bpmProximityScore(bpmA, bpmB);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-slate-400" />
        <span className="text-xs font-bold tracking-widest text-slate-400">STEM ANALYSIS</span>
      </div>

      {!trackA && !trackB && (
        <div className="flex items-center justify-center gap-2 text-slate-600 py-8">
          <Music size={16} />
          <span className="text-sm">Load tracks to see analysis</span>
        </div>
      )}

      {(trackA || trackB) && (
        <div className="flex gap-4">
          {trackA && <TrackColumn track={trackA} label="A" />}

          <div className="flex flex-col items-center gap-3 shrink-0">
            <CamelotWheel keyA={keyA || undefined} keyB={keyB || undefined} size={140} />

            {keyScore !== null && (
              <div className={`text-xs px-2 py-1 rounded border ${compatibilityBadgeStyle(keyScore)}`}>
                Key: {Math.round(keyScore * 100)}%
              </div>
            )}
            {bpmA && bpmB && (
              <div className={`text-xs px-2 py-1 rounded border ${compatibilityBadgeStyle(bpmScore)}`}>
                BPM: {Math.round(bpmScore * 100)}%
              </div>
            )}
          </div>

          {trackB && <TrackColumn track={trackB} label="B" />}
        </div>
      )}
    </div>
  );
}
