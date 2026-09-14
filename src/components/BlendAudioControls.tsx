import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Loader, AlertCircle } from 'lucide-react';
import {
  blendExportService,
  BlendAccess,
  BlendAccessError,
  BlendData,
} from '../lib/blendExportService';

interface BlendAudioControlsProps {
  blend: BlendData;
  compact?: boolean;
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; action: 'play' | 'download' }
  | { kind: 'playing' }
  | { kind: 'demo' }
  | { kind: 'revoked'; message: string }
  | { kind: 'error'; message: string; canRetry: boolean };

const ERROR_TEXT = 'Audio access expired or could not be refreshed.';

export const BlendAudioControls: React.FC<BlendAudioControlsProps> = ({ blend, compact }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<State>(() => (blend.isDemo ? { kind: 'demo' } : { kind: 'idle' }));

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  useEffect(() => {
    setState(blend.isDemo ? { kind: 'demo' } : { kind: 'idle' });
  }, [blend.id, blend.isDemo]);

  const fetchAccess = useCallback(
    async (force = false): Promise<BlendAccess> => {
      const access = await blendExportService.getPlaybackAccess(blend.id, { forceRefresh: force });
      if (access.mode === 'demo_unavailable') {
        setState({ kind: 'demo' });
        throw new BlendAccessError('demo_unavailable', access.message ?? 'No audio saved.', false);
      }
      if (access.mode === 'source_revoked') {
        const msg = access.message ?? 'This mash up is no longer available.';
        setState({ kind: 'revoked', message: msg });
        throw new BlendAccessError('source_revoked', msg, false);
      }
      if (!access.url) {
        throw new BlendAccessError('access_failed', ERROR_TEXT, true);
      }
      return access;
    },
    [blend.id],
  );

  const handlePlay = useCallback(async () => {
    if (state.kind === 'demo' || state.kind === 'revoked') return;

    if (state.kind === 'playing' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState({ kind: 'idle' });
      return;
    }

    setState({ kind: 'loading', action: 'play' });
    try {
      const access = await fetchAccess(true);
      const el = new Audio(access.url!);
      audioRef.current = el;
      el.onended = () => {
        audioRef.current = null;
        setState({ kind: 'idle' });
      };
      el.onerror = () => {
        audioRef.current?.pause();
        audioRef.current = null;
        setState({ kind: 'error', message: ERROR_TEXT, canRetry: true });
      };
      await el.play();
      setState({ kind: 'playing' });
    } catch (err) {
      if (err instanceof BlendAccessError) {
        if (err.code === 'demo_unavailable' || err.code === 'source_revoked') return;
        setState({
          kind: 'error',
          message: err.code === 'auth_expired' ? err.message : ERROR_TEXT,
          canRetry: err.transient,
        });
        return;
      }
      setState({ kind: 'error', message: ERROR_TEXT, canRetry: true });
    }
  }, [state, fetchAccess]);

  const handleDownload = useCallback(async () => {
    if (state.kind === 'demo' || state.kind === 'revoked') return;
    setState((prev) => (prev.kind === 'playing' ? prev : { kind: 'loading', action: 'download' }));
    try {
      const access = await fetchAccess(true);
      const a = document.createElement('a');
      a.href = access.url!;
      a.download = access.filename ?? `${blend.name}.${blend.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setState((prev) => (prev.kind === 'loading' ? { kind: 'idle' } : prev));
    } catch (err) {
      if (err instanceof BlendAccessError) {
        if (err.code === 'demo_unavailable' || err.code === 'source_revoked') return;
        setState({
          kind: 'error',
          message: err.code === 'auth_expired' ? err.message : ERROR_TEXT,
          canRetry: err.transient,
        });
        return;
      }
      setState({ kind: 'error', message: ERROR_TEXT, canRetry: true });
    }
  }, [state.kind, fetchAccess, blend.name, blend.format]);

  if (state.kind === 'demo') {
    return (
      <div className={`text-xs text-gray-400 italic ${compact ? '' : 'py-1'}`}>
        No audio saved
      </div>
    );
  }

  if (state.kind === 'revoked') {
    return (
      <div className="text-xs text-amber-400 flex items-center gap-1">
        <AlertCircle size={12} />
        <span>{state.message}</span>
      </div>
    );
  }

  const isLoadingPlay = state.kind === 'loading' && state.action === 'play';
  const isLoadingDownload = state.kind === 'loading' && state.action === 'download';
  const isPlaying = state.kind === 'playing';

  const btnBase = compact
    ? 'p-1.5 rounded-md transition-colors'
    : 'p-2 rounded-lg transition-colors';

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePlay}
          disabled={isLoadingPlay || isLoadingDownload}
          className={`${btnBase} bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 disabled:opacity-60`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoadingPlay ? (
            <Loader size={compact ? 12 : 14} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={compact ? 12 : 14} />
          ) : (
            <Play size={compact ? 12 : 14} />
          )}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isLoadingPlay || isLoadingDownload}
          className={`${btnBase} bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-60`}
          title="Download"
        >
          {isLoadingDownload ? (
            <Loader size={compact ? 12 : 14} className="animate-spin" />
          ) : (
            <Download size={compact ? 12 : 14} />
          )}
        </button>
      </div>
      {state.kind === 'error' && (
        <div className="flex items-center gap-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 max-w-xs">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span className="flex-1">{state.message}</span>
          {state.canRetry && (
            <button
              type="button"
              onClick={handlePlay}
              className="underline text-red-200 hover:text-white font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BlendAudioControls;
