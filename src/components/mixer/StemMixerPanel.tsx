import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Square, Loader2, Music } from 'lucide-react';
import { StemPlayer } from '../../lib/audio/StemPlayer';
import { WaveformAnalyser } from '../../lib/audio/WaveformAnalyser';
import { StemChannelStrip } from './StemChannelStrip';
import { subscribePipelineStatus, PipelineStage } from '../../lib/audio/stemRealtime';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';
import { showError } from '../../lib/toast';

interface StemRecord {
  id: string;
  stem_type: string;
  playback_url: string | null;
}

interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  duration_ms: number;
}

interface DeckState {
  track: TrackInfo | null;
  stems: StemRecord[];
  pipelineStage: PipelineStage;
  player: StemPlayer;
  analysers: Map<string, WaveformAnalyser>;
  isPlaying: boolean;
}

function createDeck(): DeckState {
  return {
    track: null,
    stems: [],
    pipelineStage: 'idle',
    player: new StemPlayer(),
    analysers: new Map(),
    isPlaying: false,
  };
}

interface StemMixerPanelProps {
  trackAId?: string;
  trackBId?: string;
  onTrackBChange?: (trackId: string) => void;
}

const PIPELINE_LABELS: Record<PipelineStage, string> = {
  idle: 'No track loaded',
  separating: 'Separating stems...',
  analyzing: 'Analyzing stems...',
  computing_compatibility: 'Computing compatibility...',
  ready: 'Ready to mix',
  error: 'Error in pipeline',
};

export function StemMixerPanel({ trackAId, trackBId, onTrackBChange: _onTrackBChange }: StemMixerPanelProps) {
  const [deckA, setDeckA] = useState<DeckState>(createDeck);
  const [deckB, setDeckB] = useState<DeckState>(createDeck);
  const [crossfader, setCrossfader] = useState(0.5);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const unsubA = useRef<(() => void) | null>(null);
  const unsubB = useRef<(() => void) | null>(null);

  const loadTrackStems = useCallback(async (
    trackId: string,
    setLoading: (v: boolean) => void,
    setDeck: React.Dispatch<React.SetStateAction<DeckState>>
  ) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `${config.functions.baseUrl}/get-stems?trackId=${trackId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Request-ID': crypto.randomUUID(),
        },
      });

      if (!res.ok) {
        showError('Failed to load stems for track');
        return;
      }

      const data = await res.json() as { track: TrackInfo; stems: StemRecord[] };

      setDeck((prev) => {
        prev.player.clear();
        return { ...prev, track: data.track, stems: data.stems, pipelineStage: 'idle' };
      });

      for (const stem of data.stems) {
        if (!stem.playback_url) continue;
        setDeck((prev) => {
          prev.player.loadStem(stem.id, stem.stem_type, stem.playback_url!).then(() => {
            const analyser = prev.player.getAnalyser(stem.id);
            if (analyser) {
              const wa = new WaveformAnalyser(analyser);
              setDeck((p) => {
                const newAnalysers = new Map(p.analysers);
                newAnalysers.set(stem.id, wa);
                return { ...p, analysers: newAnalysers };
              });
            }
          });
          return prev;
        });
      }

      setDeck((prev) => ({ ...prev, pipelineStage: data.stems.length > 0 ? 'ready' : 'separating' }));

    } catch (err) {
      showError('Could not load track stems', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!trackAId) return;
    loadTrackStems(trackAId, setIsLoadingA, setDeckA);

    unsubA.current?.();
    unsubA.current = subscribePipelineStatus(trackAId, trackBId ?? null, 4, {
      onStageChange: (stage) => setDeckA((p) => ({ ...p, pipelineStage: stage })),
    });
    return () => unsubA.current?.();
  }, [trackAId, trackBId, loadTrackStems]);

  useEffect(() => {
    if (!trackBId) return;
    loadTrackStems(trackBId, setIsLoadingB, setDeckB);

    unsubB.current?.();
    unsubB.current = subscribePipelineStatus(trackBId, trackAId ?? null, 4, {
      onStageChange: (stage) => setDeckB((p) => ({ ...p, pipelineStage: stage })),
    });
    return () => unsubB.current?.();
  }, [trackBId, trackAId, loadTrackStems]);

  useEffect(() => {
    deckA.player.setMasterVolume(1 - crossfader);
    deckB.player.setMasterVolume(crossfader);
  }, [crossfader, deckA.player, deckB.player]);

  const handlePlay = (deck: DeckState, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
    deck.player.resume().then(() => {
      deck.player.play();
      setDeck((p) => ({ ...p, isPlaying: true }));
    });
  };

  const handleStop = (deck: DeckState, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
    deck.player.stop();
    setDeck((p) => ({ ...p, isPlaying: false }));
  };

  const handleMute = (deck: DeckState, stemId: string) => {
    deck.player.mute(stemId);
    setDeckA((p) => ({ ...p }));
    setDeckB((p) => ({ ...p }));
  };

  const handleSolo = (deck: DeckState, stemId: string) => {
    deck.player.solo(stemId);
    setDeckA((p) => ({ ...p }));
    setDeckB((p) => ({ ...p }));
  };

  const handleVolume = (deck: DeckState, stemId: string, value: number) => {
    deck.player.setVolume(stemId, value);
  };

  const handlePan = (deck: DeckState, stemId: string, value: number) => {
    deck.player.setPan(stemId, value);
  };

  function renderDeck(
    deck: DeckState,
    setDeck: React.Dispatch<React.SetStateAction<DeckState>>,
    label: string,
    isLoading: boolean
  ) {
    const stageColor = deck.pipelineStage === 'ready'
      ? 'text-emerald-400'
      : deck.pipelineStage === 'error'
      ? 'text-red-400'
      : 'text-amber-400';

    return (
      <div className="flex-1 min-w-0 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-slate-400">DECK {label}</span>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 size={12} className="animate-spin text-slate-500" />}
            <span className={`text-xs ${stageColor}`}>
              {PIPELINE_LABELS[deck.pipelineStage]}
            </span>
          </div>
        </div>

        {deck.track ? (
          <div>
            <div className="text-sm font-semibold text-white truncate">{deck.track.title}</div>
            <div className="text-xs text-slate-400 truncate">{deck.track.artist}</div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600">
            <Music size={16} />
            <span className="text-sm">No track loaded</span>
          </div>
        )}

        {deck.stems.length > 0 ? (
          <div className="flex gap-2 justify-center flex-wrap">
            {deck.stems.map((stem) => {
              const channel = deck.player.getChannel(stem.id);
              if (!channel) return null;
              const analyser = deck.analysers.get(stem.id) ?? null;
              return (
                <StemChannelStrip
                  key={stem.id}
                  stemId={stem.id}
                  channel={channel}
                  player={deck.player}
                  analyser={analyser}
                  onMute={(id) => handleMute(deck, id)}
                  onSolo={(id) => handleSolo(deck, id)}
                  onVolumeChange={(id, v) => handleVolume(deck, id, v)}
                  onPanChange={(id, v) => handlePan(deck, id, v)}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-slate-700 text-sm">
            {isLoading ? 'Loading stems...' : 'Stems not yet available'}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handlePlay(deck, setDeck)}
            disabled={deck.stems.length === 0 || deck.isPlaying}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Play size={14} />
            Play
          </button>
          <button
            onClick={() => handleStop(deck, setDeck)}
            disabled={!deck.isPlaying}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Square size={14} />
            Stop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        {renderDeck(deckA, setDeckA, 'A', isLoadingA)}
        {renderDeck(deckB, setDeckB, 'B', isLoadingB)}
      </div>

      <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <span className="text-xs font-bold tracking-widest text-slate-400 w-12">A</span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
            className="w-full cursor-pointer"
            style={{ accentColor: '#0ea5e9' }}
            aria-label="Master crossfader"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Deck A</span>
            <span>Crossfader</span>
            <span>Deck B</span>
          </div>
        </div>
        <span className="text-xs font-bold tracking-widest text-slate-400 w-12 text-right">B</span>
      </div>
    </div>
  );
}
