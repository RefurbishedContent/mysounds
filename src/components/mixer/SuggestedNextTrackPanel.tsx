import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp, Music, RefreshCw } from 'lucide-react';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { showError } from '../../lib/toast';

interface TrackSuggestion {
  track: {
    id: string;
    title: string;
    artist: string;
    duration_ms: number;
    analysis?: Record<string, unknown>;
  };
  compatibilityScore: number;
  bestTransitionType: string;
  confidence: number;
  computedAt: string | null;
}

interface SuggestedNextTrackPanelProps {
  trackId?: string;
  onSelectTrack?: (trackId: string) => void;
  selectedTrackId?: string;
}

const TRANSITION_SHORT: Record<string, string> = {
  harmonic_mix:               'Harmonic',
  bass_swap:                  'Bass Swap',
  acapella_over_instrumental: 'Acapella',
  drop_swap:                  'Drop Swap',
  filter_fade:                'Filter',
  echo_out:                   'Echo Out',
  breakdown_blend:            'Breakdown',
  drum_swap:                  'Drum Swap',
  stem_by_stem_crossfade:     'Stem XF',
  cold_cut:                   'Cold Cut',
};

function scoreColor(score: number): string {
  if (score >= 0.75) return 'text-emerald-400';
  if (score >= 0.5)  return 'text-amber-400';
  return 'text-slate-500';
}

function scoreBg(score: number): string {
  if (score >= 0.75) return 'bg-emerald-500/10 border-emerald-500/30';
  if (score >= 0.5)  return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-slate-800 border-slate-700';
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SuggestedNextTrackPanel({
  trackId,
  onSelectTrack,
  selectedTrackId,
}: SuggestedNextTrackPanelProps) {
  const [suggestions, setSuggestions] = useState<TrackSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadSuggestions = useCallback(async () => {
    if (!trackId) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `${config.functions.baseUrl}/mix-suggestions?trackId=${trackId}&limit=8`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to load suggestions');
      }

      const data = await res.json() as { suggestions: TrackSuggestion[] };
      setSuggestions(data.suggestions);
      setHasLoaded(true);
    } catch (err) {
      showError('Could not load mix suggestions', err instanceof Error ? err.message : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    if (trackId) {
      setSuggestions([]);
      setHasLoaded(false);
    }
  }, [trackId]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <span className="text-xs font-bold tracking-widest text-slate-400">SUGGESTED NEXT TRACK</span>
        </div>
        <button
          onClick={loadSuggestions}
          disabled={!trackId || isLoading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
        >
          {isLoading
            ? <Loader2 size={11} className="animate-spin" />
            : <RefreshCw size={11} />
          }
          {hasLoaded ? 'Refresh' : 'Load'}
        </button>
      </div>

      {!trackId && (
        <div className="flex items-center justify-center gap-2 text-slate-600 py-6">
          <Music size={16} />
          <span className="text-sm">Load Track A to see suggestions</span>
        </div>
      )}

      {trackId && !hasLoaded && !isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-600 py-6">
          <span className="text-sm">Click Load to find compatible tracks</span>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Finding compatible tracks...</span>
        </div>
      )}

      {hasLoaded && suggestions.length === 0 && !isLoading && (
        <div className="flex items-center justify-center gap-2 text-slate-600 py-6">
          <span className="text-sm">No pre-computed suggestions yet. Analyze mixes to generate them.</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
          {suggestions.map((s) => {
            const isSelected = s.track.id === selectedTrackId;
            const bpm = (s.track.analysis as Record<string, unknown> | undefined)?.bpm as number | undefined;
            const key = (s.track.analysis as Record<string, unknown> | undefined)?.key as string | undefined;

            return (
              <button
                key={s.track.id}
                onClick={() => onSelectTrack?.(s.track.id)}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/40'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{s.track.title}</div>
                  <div className="text-xs text-slate-400 truncate">{s.track.artist}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {key && <span className="text-xs text-slate-500">{key}</span>}
                    {bpm && <span className="text-xs text-slate-500">{bpm.toFixed(0)} BPM</span>}
                    <span className="text-xs text-slate-600">{formatDuration(s.track.duration_ms)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className={`text-sm font-bold ${scoreColor(s.compatibilityScore)}`}>
                    {Math.round(s.compatibilityScore * 100)}%
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${scoreBg(s.compatibilityScore)} ${scoreColor(s.compatibilityScore)}`}>
                    {TRANSITION_SHORT[s.bestTransitionType] ?? s.bestTransitionType}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
