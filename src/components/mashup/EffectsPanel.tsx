import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors, Zap, Clock, Timer, LayoutGrid, Check,
  Play, Pause, X, Sparkles
} from 'lucide-react';
import * as Tone from 'tone';
import { TemplateData } from '../../lib/database';
import { UploadResult } from '../../lib/storage';
import TemplateGallery from '../TemplateGallery';
import { WaveformDisplay } from '../WaveformDisplay';
import { WaveformModeToggle } from '../WaveformModeToggle';

type DurationSize = 'short' | 'medium' | 'long';

const DURATION_RANGES: Record<DurationSize, { min: number; max: number; default: number }> = {
  short: { min: 4, max: 8, default: 6 },
  medium: { min: 8, max: 15, default: 12 },
  long: { min: 16, max: 25, default: 20 },
};

const getDurationSizeFromValue = (duration: number): DurationSize => {
  if (duration >= 4 && duration <= 8) return 'short';
  if (duration > 8 && duration <= 15) return 'medium';
  return 'long';
};

interface EffectsPanelProps {
  isExpanded: boolean;
  songA: UploadResult;
  songB: UploadResult;
  selectedTemplate: TemplateData | null;
  directCut: boolean;
  transitionDuration: number;
  onTemplateSelect: (template: TemplateData) => void;
  onDirectCutToggle: (enabled: boolean) => void;
  onClearTemplate: () => void;
  isMobile: boolean;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  isExpanded,
  songA,
  songB,
  selectedTemplate,
  directCut,
  transitionDuration,
  onTemplateSelect,
  onDirectCutToggle,
  onClearTemplate,
  isMobile,
}) => {
  const [durationSize, setDurationSize] = useState<DurationSize>(
    getDurationSizeFromValue(transitionDuration)
  );
  const [showLibrary, setShowLibrary] = useState(!directCut);

  useEffect(() => {
    if (isExpanded && !directCut) {
      setShowLibrary(true);
    }
  }, [isExpanded, directCut]);

  const handleDurationChange = (size: DurationSize) => {
    setDurationSize(size);
  };

  const handleTemplateSelect = (template: TemplateData) => {
    onTemplateSelect(template);
    setShowLibrary(false);
  };

  const handleDirectCut = () => {
    onDirectCutToggle(true);
    setShowLibrary(false);
  };

  const handleBrowseEffects = () => {
    onDirectCutToggle(false);
    setShowLibrary(true);
  };

  const handleChangeEffect = () => {
    setShowLibrary(true);
  };

  if (!isExpanded) return null;

  return (
    <div className="overflow-hidden transition-all duration-300 ease-in-out">
      <div className="px-4 pb-4 pt-0">
        <div className="bg-gray-900/60 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="p-3 border-b border-gray-700/30">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleDirectCut}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all font-medium text-sm ${
                  directCut
                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                    : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                }`}
              >
                <Scissors size={16} />
                <span>Direct Cut</span>
                {directCut && <Check size={14} className="ml-1" />}
              </button>

              <button
                onClick={handleBrowseEffects}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                  !directCut && (showLibrary || selectedTemplate)
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-gradient-to-r from-cyan-600/80 to-teal-600/80 text-white hover:from-cyan-600 hover:to-teal-600 hover:shadow-lg hover:shadow-cyan-500/40'
                }`}
              >
                <Sparkles size={16} />
                <span>Browse Effects</span>
                {!directCut && selectedTemplate && <Check size={14} className="ml-1" />}
              </button>
            </div>

            {directCut && !showLibrary && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 text-center">
                <Scissors size={20} className="text-teal-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">
                  Songs will be joined with a clean splice - no effect added
                </p>
              </div>
            )}

            {!directCut && selectedTemplate && !showLibrary && (
              <SelectedTemplateCard
                template={selectedTemplate}
                onClear={onClearTemplate}
                onChangeEffect={handleChangeEffect}
              />
            )}
          </div>

          {showLibrary && (
            <div className="border-t border-gray-700/30">
              <div className="bg-gray-800/40 px-3 py-2 border-b border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <LayoutGrid size={12} className="text-cyan-400" />
                    <span className="text-[11px] font-medium text-gray-300">Effect Library</span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {DURATION_RANGES[durationSize].min}-{DURATION_RANGES[durationSize].max}s
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {(['short', 'medium', 'long'] as DurationSize[]).map(size => {
                    const icons = { short: Zap, medium: Clock, long: Timer };
                    const Icon = icons[size];
                    const isActive = durationSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => handleDurationChange(size)}
                        className={`flex-1 py-1.5 px-2 rounded-md border transition-all flex items-center justify-center gap-1 ${
                          isActive
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                            : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        <Icon size={11} />
                        <span className="text-[10px] font-medium capitalize">{size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={`${isMobile ? 'max-h-[35vh]' : 'max-h-[30vh]'} overflow-y-auto p-2`}>
                <TemplateGallery
                  onSelectTemplate={handleTemplateSelect}
                  compact={true}
                  trackA={songA}
                  trackB={songB}
                  durationFilter={durationSize}
                  selectedTemplateId={selectedTemplate?.id}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SelectedTemplateCard: React.FC<{
  template: TemplateData;
  onClear: () => void;
  onChangeEffect: () => void;
}> = ({ template, onClear, onChangeEffect }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [waveformMode, setWaveformMode] = useState<'standard' | 'rgb'>('standard');
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const audioUrl = template.templateData?.previewUrl || '';
  const duration = actualDuration ?? template.duration ?? 10;

  useEffect(() => {
    if (!audioUrl) return;

    const initPlayer = async () => {
      try {
        await Tone.start();
        const player = new Tone.Player({
          url: audioUrl,
          onload: () => {
            if (player.buffer && player.buffer.duration > 0) {
              setActualDuration(player.buffer.duration);
            }
          },
          onstop: () => {
            setIsPlaying(false);
          }
        }).toDestination();
        playerRef.current = player;
      } catch (err) {
        console.error('Failed to init template player:', err);
      }
    };

    initPlayer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setActualDuration(null);
    };
  }, [audioUrl]);

  const updatePlaybackTime = useCallback(() => {
    if (!playerRef.current || !isPlaying) return;

    const elapsed = Tone.now() - startTimeRef.current;
    const newTime = pauseTimeRef.current + elapsed;

    if (newTime >= duration) {
      setIsPlaying(false);
      setPlaybackTime(0);
      pauseTimeRef.current = 0;
      if (playerRef.current.state === 'started') {
        playerRef.current.stop();
      }
      return;
    }

    setPlaybackTime(newTime);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackTime]);

  const handlePlayPause = async () => {
    if (!playerRef.current || !playerRef.current.loaded) return;

    try {
      if (isPlaying) {
        if (playerRef.current.state === 'started') {
          playerRef.current.stop();
        }
        pauseTimeRef.current = playbackTime;
        setIsPlaying(false);
      } else {
        await Tone.start();

        const currentDuration = playerRef.current.buffer?.duration || duration;
        if (playbackTime >= currentDuration - 0.1) {
          pauseTimeRef.current = 0;
          setPlaybackTime(0);
        } else {
          pauseTimeRef.current = playbackTime;
        }

        startTimeRef.current = Tone.now();
        playerRef.current.start(Tone.now(), pauseTimeRef.current);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Template playback error:', error);
    }
  };

  const handleSeek = (progress: number) => {
    const time = progress * duration;
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    setPlaybackTime(time);
    pauseTimeRef.current = time;
  };

  const progress = duration > 0 ? playbackTime / duration : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-cyan-500/30 overflow-hidden" style={{ boxShadow: '0 0 15px rgba(6,182,212,0.08)' }}>
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Check className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{template.name}</p>
            <p className="text-[10px] text-cyan-400/80">{template.duration}s effect</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onChangeEffect}
            className="px-2 py-1 rounded-lg text-[10px] font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            Change
          </button>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={handlePlayPause}
            disabled={!audioUrl}
            className="p-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-lg shadow-cyan-500/20"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </button>
          <WaveformModeToggle
            mode={waveformMode}
            onToggle={() => setWaveformMode(m => m === 'standard' ? 'rgb' : 'standard')}
          />
          <div className="flex-1 flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">
              {formatTime(playbackTime)} / {formatTime(duration)}
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-400">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                Playing
              </span>
            )}
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700/30">
          {audioUrl ? (
            <WaveformDisplay
              audioUrl={audioUrl}
              progress={progress}
              height={50}
              onSeek={handleSeek}
              showScrubber={false}
              progressColor="#ffffff"
              gradientRegion={{
                startTime: 0,
                endTime: duration,
                startColor: '#06b6d4',
                endColor: '#14b8a6'
              }}
              renderMode={waveformMode}
            />
          ) : (
            <div className="h-[50px] flex items-center justify-center">
              <span className="text-xs text-gray-500">No preview available</span>
            </div>
          )}

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
            style={{
              left: `${progress * 100}%`,
              boxShadow: '0 0 8px rgba(255,255,255,0.8)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface EffectTimelineRowProps {
  template: TemplateData;
  onClear: () => void;
  isMobile: boolean;
}

export const EffectTimelineRow: React.FC<EffectTimelineRowProps> = ({
  template,
  onClear,
  isMobile,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [waveformMode, setWaveformMode] = useState<'standard' | 'rgb'>('standard');
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const audioUrl = template.templateData?.previewUrl || '';
  const duration = actualDuration ?? template.duration ?? 10;

  useEffect(() => {
    if (!audioUrl) return;

    const initPlayer = async () => {
      try {
        await Tone.start();
        const player = new Tone.Player({
          url: audioUrl,
          onload: () => {
            if (player.buffer && player.buffer.duration > 0) {
              setActualDuration(player.buffer.duration);
            }
          },
          onstop: () => {
            setIsPlaying(false);
          }
        }).toDestination();
        playerRef.current = player;
      } catch (err) {
        console.error('Failed to init effect player:', err);
      }
    };

    initPlayer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
        playerRef.current = null;
      }
      setActualDuration(null);
    };
  }, [audioUrl]);

  const updatePlaybackTime = useCallback(() => {
    if (!playerRef.current || !isPlaying) return;

    const elapsed = Tone.now() - startTimeRef.current;
    const newTime = pauseTimeRef.current + elapsed;

    if (newTime >= duration) {
      setIsPlaying(false);
      setPlaybackTime(0);
      pauseTimeRef.current = 0;
      if (playerRef.current.state === 'started') {
        playerRef.current.stop();
      }
      return;
    }

    setPlaybackTime(newTime);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackTime]);

  const handlePlayPause = async () => {
    if (!playerRef.current || !playerRef.current.loaded) return;

    try {
      if (isPlaying) {
        if (playerRef.current.state === 'started') {
          playerRef.current.stop();
        }
        pauseTimeRef.current = playbackTime;
        setIsPlaying(false);
      } else {
        await Tone.start();

        const currentDuration = playerRef.current.buffer?.duration || duration;
        if (playbackTime >= currentDuration - 0.1) {
          pauseTimeRef.current = 0;
          setPlaybackTime(0);
        } else {
          pauseTimeRef.current = playbackTime;
        }

        startTimeRef.current = Tone.now();
        playerRef.current.start(Tone.now(), pauseTimeRef.current);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Effect playback error:', error);
    }
  };

  const handleSeek = (progress: number) => {
    const time = progress * duration;
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    setPlaybackTime(time);
    pauseTimeRef.current = time;
  };

  const progress = duration > 0 ? playbackTime / duration : 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="ml-4 mr-4 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-teal-500/5 transition-all"
      style={{ boxShadow: '0 0 20px rgba(6,182,212,0.1)' }}
    >
      <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
            <Sparkles size={16} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" title={template.name}>
              {template.name}
            </p>
            <p className="text-[10px] text-cyan-400/80">
              {template.duration}s effect
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">
              {formatTime(playbackTime)} / {formatTime(duration)}
            </span>

            <WaveformModeToggle
              mode={waveformMode}
              onToggle={() => setWaveformMode(m => m === 'standard' ? 'rgb' : 'standard')}
            />

            <button
              onClick={handlePlayPause}
              disabled={!audioUrl}
              className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                isPlaying
                  ? 'bg-white/10 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20`}
              title={isPlaying ? 'Pause' : 'Play effect'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={onClear}
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
              title="Remove effect"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-gray-900/50 border border-gray-700/30">
          {audioUrl ? (
            <WaveformDisplay
              audioUrl={audioUrl}
              progress={progress}
              height={isMobile ? 50 : 60}
              onSeek={handleSeek}
              showScrubber={false}
              progressColor="#ffffff"
              gradientRegion={{
                startTime: 0,
                endTime: duration,
                startColor: '#06b6d4',
                endColor: '#14b8a6'
              }}
              renderMode={waveformMode}
            />
          ) : (
            <div className={`${isMobile ? 'h-[50px]' : 'h-[60px]'} flex items-center justify-center`}>
              <span className="text-xs text-gray-500">No preview available</span>
            </div>
          )}

          {progress > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
              style={{
                left: `${progress * 100}%`,
                boxShadow: '0 0 8px rgba(255,255,255,0.8)'
              }}
            />
          )}
        </div>

        {isPlaying && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-cyan-400">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            Playing Effect
          </div>
        )}
      </div>
    </div>
  );
};

export default EffectsPanel;
