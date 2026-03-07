import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Sliders, Check } from 'lucide-react';
import * as Tone from 'tone';
import { UploadResult } from '../../lib/storage';
import { ClippedWaveformDisplay } from '../ClippedWaveformDisplay';
import { WaveformModeToggle } from '../WaveformModeToggle';
import { WaveformZoomControls } from '../WaveformZoomControls';
import { SONG_LETTERS, SONG_COLORS, formatTime } from './constants';

interface SongTimelineRowProps {
  song: UploadResult;
  songIndex: number;
  clipStart: number;
  clipEnd: number;
  isConfigured: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMobile: boolean;
}

export const SongTimelineRow: React.FC<SongTimelineRowProps> = ({
  song,
  songIndex,
  clipStart,
  clipEnd,
  isConfigured,
  isExpanded,
  onToggleExpand,
  isMobile,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [waveformMode, setWaveformMode] = useState<'standard' | 'rgb'>('standard');
  const [zoom, setZoom] = useState(1);
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const colors = SONG_COLORS[songIndex % SONG_COLORS.length];
  const letter = SONG_LETTERS[songIndex];
  const clipDuration = clipEnd - clipStart;

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  const updatePlaybackProgress = useCallback(() => {
    if (!playerRef.current || !isPlaying) return;

    const elapsed = Tone.now() - startTimeRef.current;
    const progress = elapsed / clipDuration;

    if (progress >= 1) {
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (playerRef.current?.state === 'started') {
        playerRef.current.stop();
      }
      return;
    }

    setPlaybackProgress(progress);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
  }, [isPlaying, clipDuration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackProgress);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackProgress]);

  const handlePlayPause = async () => {
    try {
      await Tone.start();

      if (isPlaying) {
        if (playerRef.current?.state === 'started') {
          playerRef.current.stop();
        }
        setIsPlaying(false);
        return;
      }

      if (!playerRef.current) {
        playerRef.current = new Tone.Player({
          url: song.url,
          onload: () => {
            if (playerRef.current) {
              startTimeRef.current = Tone.now();
              playerRef.current.start(Tone.now(), clipStart, clipDuration);
              setIsPlaying(true);
            }
          },
          onstop: () => {
            setIsPlaying(false);
          }
        }).toDestination();
      } else if (playerRef.current.loaded) {
        startTimeRef.current = Tone.now();
        playerRef.current.start(Tone.now(), clipStart, clipDuration);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (progress: number) => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    setPlaybackProgress(progress);
  };

  const songName = song.originalName.replace(/\.[^/.]+$/, '');

  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${
        isConfigured
          ? 'border-teal-500/30 bg-gray-800/80'
          : 'border-gray-700/50 bg-gray-800/50'
      }`}
      style={isConfigured ? { boxShadow: '0 0 20px rgba(20,184,166,0.08)' } : undefined}
    >
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
            <span className="text-white font-bold text-sm">{letter}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" title={songName}>
              {songName}
            </p>
            <p className="text-[10px] text-gray-500">
              Clip: {formatTime(clipStart)} - {formatTime(clipEnd)} ({formatTime(clipDuration)})
            </p>
          </div>

          <button
            onClick={handlePlayPause}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              isPlaying
                ? 'bg-white/10 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={isPlaying ? 'Pause' : 'Play clip'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <WaveformZoomControls zoom={zoom} onZoomChange={setZoom} />
          <WaveformModeToggle
            mode={waveformMode}
            onToggle={() => setWaveformMode(m => m === 'standard' ? 'rgb' : 'standard')}
          />

          <button
            onClick={onToggleExpand}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
              isExpanded
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent'
            }`}
          >
            <Sliders size={14} />
            <span className="text-xs font-medium">Effects</span>
          </button>

          {isConfigured && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 flex-shrink-0">
              <Check size={12} className="text-teal-400" />
            </div>
          )}
        </div>

        <div className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700/30">
          <ClippedWaveformDisplay
            audioUrl={song.url}
            clipStart={clipStart}
            clipEnd={clipEnd}
            progress={playbackProgress}
            height={isMobile ? 50 : 60}
            color="#4b5563"
            progressColor={colors.border.replace('border-', '#').replace('-500', '')}
            onSeek={handleSeek}
            showScrubber={true}
            zoom={zoom}
            renderMode={waveformMode}
          />

          {playbackProgress > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
              style={{
                left: `${playbackProgress * 100}%`,
                boxShadow: '0 0 8px rgba(255,255,255,0.8)'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SongTimelineRow;
