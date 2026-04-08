import React, { useState, useCallback } from 'react';
import { Zap, Play, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import { TransitionType } from '../../config/features';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { showError, showSuccess } from '../../lib/toast';

interface TransitionOption {
  type: TransitionType;
  confidence: number;
}

interface TransitionControlPanelProps {
  trackAId?: string;
  trackBId?: string;
  recommendedTransition?: TransitionOption;
  alternatives?: TransitionOption[];
  mixPointMs?: number;
  durationMs?: number;
  mixPlanId?: string;
  onMixPlanReady?: (planId: string) => void;
  onDurationChange?: (ms: number) => void;
}

const TRANSITION_LABELS: Record<TransitionType, string> = {
  harmonic_mix:               'Harmonic Mix',
  bass_swap:                  'Bass Swap',
  acapella_over_instrumental: 'Acapella Over Instrumental',
  drop_swap:                  'Drop Swap',
  filter_fade:                'Filter Fade',
  echo_out:                   'Echo Out',
  breakdown_blend:            'Breakdown Blend',
  drum_swap:                  'Drum Swap',
  stem_by_stem_crossfade:     'Stem-by-Stem Crossfade',
  cold_cut:                   'Cold Cut',
};

const TRANSITION_DESCRIPTIONS: Record<TransitionType, string> = {
  harmonic_mix:               'Keys and energy match — blend seamlessly in key',
  bass_swap:                  'Cut the bass at the drop, switch decks cleanly',
  acapella_over_instrumental: 'Layer vocal A over the new instrumental',
  drop_swap:                  'Hard energy switch at the peak drop',
  filter_fade:                'Sweep low-pass on A while releasing high-pass on B',
  echo_out:                   'Ride the reverb tail out of the high-energy section',
  breakdown_blend:            'Blend ambient pads across the breakdown',
  drum_swap:                  'Replace the drum pattern while melodies crossfade',
  stem_by_stem_crossfade:     'Crossfade each stem individually at different rates',
  cold_cut:                   'Hard cut — BPM and key are tight enough for it',
};

function confidenceColor(c: number): string {
  if (c >= 0.75) return 'text-emerald-400';
  if (c >= 0.5)  return 'text-amber-400';
  return 'text-slate-500';
}

function confidenceBadge(c: number): string {
  if (c >= 0.75) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  if (c >= 0.5)  return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  return 'bg-slate-800 border-slate-700 text-slate-500';
}

export function TransitionControlPanel({
  trackAId,
  trackBId,
  recommendedTransition,
  alternatives = [],
  mixPointMs = 0,
  durationMs = 16000,
  mixPlanId,
  onMixPlanReady,
  onDurationChange,
}: TransitionControlPanelProps) {
  const [selectedType, setSelectedType] = useState<TransitionType>(
    recommendedTransition?.type ?? 'filter_fade'
  );
  const [localDuration, setLocalDuration] = useState(durationMs);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const allOptions: TransitionOption[] = [
    ...(recommendedTransition ? [recommendedTransition] : []),
    ...alternatives,
  ];

  const handleAnalyzeMix = useCallback(async () => {
    if (!trackAId || !trackBId) {
      showError('Select both Track A and Track B before analyzing');
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${config.functions.baseUrl}/analyze-mix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({ trackAId, trackBId }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Analysis failed');
      }

      const data = await res.json() as { bestTransition: TransitionType; mixPlanId: string };
      setSelectedType(data.bestTransition);
      if (data.mixPlanId) onMixPlanReady?.(data.mixPlanId);
      showSuccess('Mix analysis complete', `Best transition: ${TRANSITION_LABELS[data.bestTransition]}`);
    } catch (err) {
      showError('Mix analysis failed', err instanceof Error ? err.message : undefined);
    } finally {
      setIsAnalyzing(false);
    }
  }, [trackAId, trackBId, onMixPlanReady]);

  const handleAutoMix = useCallback(async () => {
    if (!mixPlanId) {
      showError('Run analysis first to generate a mix plan');
      return;
    }
    setIsExecuting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${config.functions.baseUrl}/execute-mix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({ mixPlanId }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Execute failed');
      }

      setIsReady(true);
      showSuccess('Mix plan ready', 'Press play on both decks to execute the transition');
    } catch (err) {
      showError('Failed to execute mix plan', err instanceof Error ? err.message : undefined);
    } finally {
      setIsExecuting(false);
    }
  }, [mixPlanId]);

  const currentOption = allOptions.find((o) => o.type === selectedType);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-slate-400">TRANSITION CONTROL</span>
        {isReady && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <CheckCircle size={12} />
            Ready
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Selected Transition</span>
          {currentOption && (
            <span className={`text-xs px-2 py-0.5 rounded border ${confidenceBadge(currentOption.confidence)}`}>
              {Math.round(currentOption.confidence * 100)}% confidence
            </span>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="text-sm font-semibold text-white">{TRANSITION_LABELS[selectedType]}</div>
          <div className="text-xs text-slate-400 mt-1">{TRANSITION_DESCRIPTIONS[selectedType]}</div>
        </div>

        {allOptions.length > 1 && (
          <button
            onClick={() => setShowAlternatives((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors self-start"
          >
            <ChevronDown size={12} className={`transition-transform ${showAlternatives ? 'rotate-180' : ''}`} />
            {showAlternatives ? 'Hide' : 'Show'} alternatives
          </button>
        )}

        {showAlternatives && (
          <div className="flex flex-col gap-1">
            {allOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSelectedType(opt.type)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${
                  opt.type === selectedType
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{TRANSITION_LABELS[opt.type]}</span>
                <span className={`text-xs ${confidenceColor(opt.confidence)}`}>
                  {Math.round(opt.confidence * 100)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Transition Duration</span>
          <span className="text-xs text-slate-300">{(localDuration / 1000).toFixed(0)}s</span>
        </div>
        <input
          type="range"
          min={4000}
          max={32000}
          step={1000}
          value={localDuration}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setLocalDuration(v);
            onDurationChange?.(v);
          }}
          className="w-full cursor-pointer"
          style={{ accentColor: '#0ea5e9' }}
        />
        <div className="flex justify-between text-xs text-slate-700">
          <span>4s</span>
          <span>32s</span>
        </div>
      </div>

      {mixPointMs > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Mix Point</span>
          <span className="text-slate-300 font-mono">
            {Math.floor(mixPointMs / 60000)}:{String(Math.floor((mixPointMs % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleAnalyzeMix}
          disabled={!trackAId || !trackBId || isAnalyzing}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {isAnalyzing ? 'Analyzing...' : 'Analyze Mix'}
        </button>
        <button
          onClick={handleAutoMix}
          disabled={!mixPlanId || isExecuting || isReady}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isReady ? 'Plan Ready' : isExecuting ? 'Loading...' : 'Auto Mix'}
        </button>
      </div>
    </div>
  );
}
