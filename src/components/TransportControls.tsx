import { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Repeat, Clock } from 'lucide-react';
import { MultiTrackEngine, TransportState } from '../lib/audio/MultiTrackEngine';

interface TransportControlsProps {
  engine: MultiTrackEngine;
  onStateChange?: (state: TransportState) => void;
}

const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: ' ',
  STOP: 'Escape',
  SKIP_BACK: 'ArrowLeft',
  SKIP_FORWARD: 'ArrowRight',
  SKIP_BACK_LARGE: 'Shift+ArrowLeft',
  SKIP_FORWARD_LARGE: 'Shift+ArrowRight',
  LOOP_TOGGLE: 'l',
  SEEK_START: 'Home',
  SEEK_END: 'End'
};

export function TransportControls({ engine, onStateChange }: TransportControlsProps) {
  const [state, setState] = useState<TransportState>(engine.getState());
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    const unsubscribe = engine.onTransportStateChange((newState) => {
      setState(newState);
      onStateChange?.(newState);
    });

    return () => {
      unsubscribe;
    };
  }, [engine, onStateChange]);

  const handlePlayPause = useCallback(() => {
    if (state.isPlaying) {
      engine.pause();
    } else {
      engine.play();
    }
  }, [engine, state.isPlaying]);

  const handleStop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const handleSkipBack = useCallback((large = false) => {
    const skipAmount = large ? 10 : 1;
    engine.seek(Math.max(0, state.currentTime - skipAmount));
  }, [engine, state.currentTime]);

  const handleSkipForward = useCallback((large = false) => {
    const skipAmount = large ? 10 : 1;
    engine.seek(Math.min(state.duration, state.currentTime + skipAmount));
  }, [engine, state.currentTime, state.duration]);

  const handleSeekStart = useCallback(() => {
    engine.seek(0);
  }, [engine]);

  const handleSeekEnd = useCallback(() => {
    engine.seek(state.duration);
  }, [engine, state.duration]);

  const handleLoopToggle = useCallback(() => {
    if (state.loopEnabled) {
      engine.setLoop(false);
    } else {
      const loopStart = state.currentTime;
      const loopEnd = Math.min(state.currentTime + 30, state.duration);
      engine.setLoop(true, loopStart, loopEnd);
    }
  }, [engine, state]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const isShift = event.shiftKey;
      const key = event.key;

      switch (key) {
        case KEYBOARD_SHORTCUTS.PLAY_PAUSE:
          event.preventDefault();
          handlePlayPause();
          break;
        case KEYBOARD_SHORTCUTS.STOP:
          event.preventDefault();
          handleStop();
          break;
        case KEYBOARD_SHORTCUTS.SKIP_BACK:
          event.preventDefault();
          handleSkipBack(isShift);
          break;
        case KEYBOARD_SHORTCUTS.SKIP_FORWARD:
          event.preventDefault();
          handleSkipForward(isShift);
          break;
        case KEYBOARD_SHORTCUTS.LOOP_TOGGLE:
          event.preventDefault();
          handleLoopToggle();
          break;
        case KEYBOARD_SHORTCUTS.SEEK_START:
          event.preventDefault();
          handleSeekStart();
          break;
        case KEYBOARD_SHORTCUTS.SEEK_END:
          event.preventDefault();
          handleSeekEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    handleStop,
    handleSkipBack,
    handleSkipForward,
    handleLoopToggle,
    handleSeekStart,
    handleSeekEnd
  ]);

  return (
    <div className="bg-gray-800 border-t border-gray-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeekStart}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Seek to start (Home)"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleSkipBack(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Skip back 1s (←)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlayPause}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {state.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={handleStop}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Stop (Esc)"
            >
              <Square className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleSkipForward(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Skip forward 1s (→)"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={handleSeekEnd}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Seek to end (End)"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-mono min-w-[120px]">
                <Clock className="w-4 h-4" />
                <span>{formatTime(state.currentTime)}</span>
              </div>

              <div className="flex-1 relative">
                <input
                  type="range"
                  min={0}
                  max={state.duration || 100}
                  value={state.currentTime}
                  onChange={(e) => engine.seek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      (state.currentTime / state.duration) * 100
                    }%, #374151 ${
                      (state.currentTime / state.duration) * 100
                    }%, #374151 100%)`
                  }}
                />

                {state.loopEnabled && state.loopStart !== undefined && state.loopEnd !== undefined && (
                  <div
                    className="absolute top-0 h-2 bg-yellow-500 opacity-30 rounded"
                    style={{
                      left: `${(state.loopStart / state.duration) * 100}%`,
                      width: `${((state.loopEnd - state.loopStart) / state.duration) * 100}%`
                    }}
                  />
                )}
              </div>

              <div className="text-sm font-mono min-w-[120px] text-right">
                <span className="text-gray-400">{formatTime(state.duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoopToggle}
              className={`p-2 rounded-lg transition-colors ${
                state.loopEnabled ? 'bg-yellow-600 hover:bg-yellow-700' : 'hover:bg-gray-700'
              }`}
              title="Toggle loop (L)"
            >
              <Repeat className="w-5 h-5" />
            </button>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-gray-700 text-sm rounded-lg px-2 py-1 border border-gray-600"
              title="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            <div className="text-sm text-gray-400 px-2">
              {state.bpm} BPM
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 flex items-center justify-center gap-4">
          <span>Space: Play/Pause</span>
          <span>←/→: Skip 1s</span>
          <span>Shift+←/→: Skip 10s</span>
          <span>L: Loop</span>
          <span>Home/End: Seek</span>
          <span>Esc: Stop</span>
        </div>
      </div>
    </div>
  );
}
