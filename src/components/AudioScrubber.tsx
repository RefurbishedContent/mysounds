import { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { WaveformDisplay } from './WaveformDisplay';
import { WaveformModeToggle } from './WaveformModeToggle';
import { Play, Pause, MapPin } from 'lucide-react';

export interface AudioMarker {
  id: string;
  time: number;
  color: string;
  label: string;
  onDrag?: (newTime: number) => void;
}

interface AudioScrubberProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  onSetInMarker?: (time: number) => void;
  onSetEndMarker?: (time: number) => void;
  inMarkerLabel?: string;
  endMarkerLabel?: string;
  isPlaying: boolean;
  markerTime?: number;
  markerColor?: string;
  markers?: AudioMarker[];
  showGradient?: boolean;
}

export function AudioScrubber({
  audioUrl,
  currentTime,
  duration,
  onSeek,
  onSetInMarker,
  onSetEndMarker,
  inMarkerLabel = 'Set IN',
  endMarkerLabel = 'Set END',
  isPlaying: externalIsPlaying,
  markerTime,
  markerColor = '#06b6d4',
  markers = [],
  showGradient = false
}: AudioScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(currentTime);
  const [flashInMarker, setFlashInMarker] = useState(false);
  const [flashEndMarker, setFlashEndMarker] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [waveformMode, setWaveformMode] = useState<'standard' | 'rgb'>('standard');
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<AudioMarker[]>(markers);
  const durationRef = useRef<number>(duration);
  const draggingMarkerIdRef = useRef<string | null>(null);
  const isScrubbingRef = useRef(false);
  const hasInteractedRef = useRef(false);

  markersRef.current = markers;
  durationRef.current = duration;

  const SNAP_THRESHOLD_SECONDS = 0.5;
  const playbackTimeRef = useRef(playbackTime);
  playbackTimeRef.current = playbackTime;

  useEffect(() => {
    const initializePlayer = async () => {
      if (!playerRef.current) {
        await Tone.start();
        playerRef.current = new Tone.Player(audioUrl).toDestination();
        playerRef.current.loop = false;
      }
    };

    initializePlayer();

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
  }, [audioUrl]);

  useEffect(() => {
    if (!hasInteractedRef.current) {
      setPlaybackTime(currentTime);
      pauseTimeRef.current = currentTime;
    }
  }, [currentTime]);

  const getClipBoundaries = useCallback(() => {
    const currentMarkers = markersRef.current;
    const startMarker = currentMarkers.find(m => m.id.includes('start') || m.label?.toUpperCase() === 'START');
    const endMarker = currentMarkers.find(m => m.id.includes('end') || m.label?.toUpperCase() === 'END');
    return {
      start: startMarker?.time ?? 0,
      end: endMarker?.time ?? durationRef.current
    };
  }, []);

  const updatePlaybackTime = useCallback(() => {
    if (!playerRef.current) return;

    const elapsed = Tone.now() - startTimeRef.current;
    const newTime = pauseTimeRef.current + elapsed;
    const { end } = getClipBoundaries();
    const effectiveEnd = Math.min(end, durationRef.current);

    if (newTime >= effectiveEnd) {
      setIsPlaying(false);
      setPlaybackTime(effectiveEnd);
      try { playerRef.current.stop(); } catch {}
      return;
    }

    setPlaybackTime(newTime);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [getClipBoundaries]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePlaybackTime]);

  const startPlaybackAt = useCallback(async (time: number) => {
    if (!playerRef.current || !playerRef.current.loaded) return;

    try {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      playerRef.current.stop();
      await Tone.start();

      const clampedTime = Math.max(0, Math.min(time, durationRef.current));
      pauseTimeRef.current = clampedTime;
      setPlaybackTime(clampedTime);

      startTimeRef.current = Tone.now();
      playerRef.current.start(Tone.now(), clampedTime);
      setIsPlaying(true);
    } catch (error) {
      console.error('Playback error:', error);
    }
  }, []);

  const handlePlayPause = async () => {
    if (!playerRef.current || !playerRef.current.loaded) return;
    hasInteractedRef.current = true;

    try {
      if (isPlaying) {
        playerRef.current.stop();
        pauseTimeRef.current = playbackTimeRef.current;
        setIsPlaying(false);
      } else {
        await Tone.start();

        const { start, end } = getClipBoundaries();
        const hasClipMarkers = markersRef.current.length >= 2;

        let startPosition = playbackTimeRef.current;

        if (hasClipMarkers) {
          if (startPosition < start || startPosition >= end) {
            startPosition = start;
          }
        } else if (startPosition >= durationRef.current) {
          startPosition = 0;
        }

        pauseTimeRef.current = startPosition;
        setPlaybackTime(startPosition);

        startTimeRef.current = Tone.now();
        playerRef.current.start(Tone.now(), startPosition);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleWaveformClick = useCallback(
    (progress: number) => {
      hasInteractedRef.current = true;
      const time = progress * durationRef.current;

      if (isPlaying) {
        startPlaybackAt(time);
      } else {
        setPlaybackTime(time);
        pauseTimeRef.current = time;
      }
    },
    [isPlaying, startPlaybackAt]
  );

  const handleSetInMarker = () => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    if (onSetInMarker) {
      onSetInMarker(playbackTimeRef.current);
      setFlashInMarker(true);
      setTimeout(() => setFlashInMarker(false), 500);
    }
  };

  const handleSetEndMarker = () => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    if (onSetEndMarker) {
      onSetEndMarker(playbackTimeRef.current);
      setFlashEndMarker(true);
      setTimeout(() => setFlashEndMarker(false), 500);
    }
  };

  const calcTimeFromPointer = useCallback((clientX: number): number => {
    if (!waveformContainerRef.current) return 0;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const progress = rect.width > 0 ? clampedX / rect.width : 0;
    return Math.max(0, Math.min(progress * durationRef.current, durationRef.current));
  }, []);

  const handlePointerDown = useCallback((markerId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasInteractedRef.current = true;
    draggingMarkerIdRef.current = markerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const markerId = draggingMarkerIdRef.current;
    if (!markerId) return;

    e.preventDefault();
    let newTime = calcTimeFromPointer(e.clientX);

    const distanceToPlayhead = Math.abs(newTime - playbackTimeRef.current);
    if (distanceToPlayhead <= SNAP_THRESHOLD_SECONDS) {
      newTime = playbackTimeRef.current;
      setIsSnapping(true);
    } else {
      setIsSnapping(false);
    }

    const marker = markersRef.current.find(m => m.id === markerId);
    if (marker?.onDrag) {
      marker.onDrag(newTime);
    }
  }, [calcTimeFromPointer]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const markerId = draggingMarkerIdRef.current;
    if (!markerId) return;

    draggingMarkerIdRef.current = null;
    setIsSnapping(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleLostPointerCapture = useCallback(() => {
    draggingMarkerIdRef.current = null;
    setIsSnapping(false);
  }, []);

  const handlePlayheadPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasInteractedRef.current = true;
    isScrubbingRef.current = true;
    setIsScrubbing(true);

    if (isPlaying && playerRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      try { playerRef.current.stop(); } catch {}
      setIsPlaying(false);
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isPlaying]);

  const handlePlayheadPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    e.preventDefault();

    const newTime = calcTimeFromPointer(e.clientX);
    setPlaybackTime(newTime);
    pauseTimeRef.current = newTime;

    if (playerRef.current?.loaded) {
      try {
        playerRef.current.stop();
        playerRef.current.start(Tone.now(), newTime);
        playerRef.current.stop(Tone.now() + 0.1);
      } catch {}
    }
  }, [calcTimeFromPointer]);

  const handlePlayheadPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (playerRef.current?.loaded) {
      try { playerRef.current.stop(); } catch {}
    }
  }, []);

  const handlePlayheadLostCapture = useCallback(() => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    if (playerRef.current?.loaded) {
      try { playerRef.current.stop(); } catch {}
    }
  }, []);

  const progress = duration > 0 ? playbackTime / duration : 0;

  const gradientRegion = showGradient && markers.length >= 2 ? {
    startTime: Math.min(markers[0].time, markers[1].time),
    endTime: Math.max(markers[0].time, markers[1].time),
    startColor: '#3b82f6',
    endColor: '#ec4899'
  } : undefined;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePlayPause}
            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>
          <div className="text-sm font-mono text-gray-300">
            {formatTime(playbackTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <WaveformModeToggle
            mode={waveformMode}
            onToggle={() => setWaveformMode(m => m === 'standard' ? 'rgb' : 'standard')}
          />
          <div className="flex items-center space-x-2">
            <div className="w-px h-6 bg-white" style={{ boxShadow: '0 0 6px rgba(255, 255, 255, 0.5)' }}></div>
            <span className="text-xs text-gray-300">Playhead</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-green-500/80 via-green-500 to-green-500/80" style={{ boxShadow: '0 0 8px #10b981' }}></div>
            <span className="text-xs text-gray-300">Start Point</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0.5 h-6 bg-gradient-to-b from-red-500/80 via-red-500 to-red-500/80" style={{ boxShadow: '0 0 8px #ef4444' }}></div>
            <span className="text-xs text-gray-300">End Point</span>
          </div>
        </div>
      </div>

      <div className="relative pt-8" ref={waveformContainerRef}>
        <WaveformDisplay
          audioUrl={audioUrl}
          progress={progress}
          height={120}
          onSeek={handleWaveformClick}
          showScrubber={false}
          progressColor="#ffffff"
          gradientRegion={gradientRegion}
          renderMode={waveformMode}
        />
        {markerTime !== undefined && markerTime > 0 && markers.length === 0 && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: `${(markerTime / duration) * 100}%` }}
          >
            <div
              className="absolute -top-3 -bottom-3 animate-pulse"
              style={{
                width: '3px',
                boxShadow: `0 0 20px ${markerColor}, 0 0 40px ${markerColor}80`,
                background: `linear-gradient(to bottom, ${markerColor}cc, ${markerColor}, ${markerColor}cc)`
              }}
            >
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg flex items-center space-x-1"
                style={{ backgroundColor: markerColor }}
              >
                <MapPin className="w-3 h-3" />
                <span>Marker</span>
              </div>
            </div>
          </div>
        )}
        {markers.map((marker) => {
          const markerProgress = Math.max(0, Math.min(marker.time / duration, 1));
          return (
            <div
              key={marker.id}
              className="absolute top-0 bottom-0 cursor-ew-resize group select-none"
              style={{
                left: `${markerProgress * 100}%`,
                width: '44px',
                marginLeft: '-22px',
                zIndex: 10,
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(marker.id, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onLostPointerCapture={handleLostPointerCapture}
            >
              <div
                className="absolute -top-3 -bottom-3 transition-all group-hover:scale-110 left-1/2 -translate-x-1/2"
                style={{
                  width: '3px',
                  boxShadow: `0 0 20px ${marker.color}, 0 0 40px ${marker.color}80`,
                  background: `linear-gradient(to bottom, ${marker.color}cc, ${marker.color}, ${marker.color}cc)`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 cursor-ew-resize select-none"
          style={{
            left: `${progress * 100}%`,
            width: '36px',
            marginLeft: '-18px',
            zIndex: 15,
            touchAction: 'none',
          }}
          onPointerDown={handlePlayheadPointerDown}
          onPointerMove={handlePlayheadPointerMove}
          onPointerUp={handlePlayheadPointerUp}
          onLostPointerCapture={handlePlayheadLostCapture}
        >
          <div
            className="absolute -top-1 -bottom-1 left-1/2 -translate-x-1/2"
            style={{
              width: isScrubbing ? '3px' : isSnapping ? '3px' : '1.5px',
              backgroundColor: 'rgba(255, 255, 255, 1)',
              boxShadow: isScrubbing || isSnapping
                ? '0 0 12px rgba(255, 255, 255, 0.9), 0 0 24px rgba(255, 255, 255, 0.6)'
                : '0 0 6px rgba(255, 255, 255, 0.5), 0 0 12px rgba(255, 255, 255, 0.3)',
              pointerEvents: 'none',
              transition: 'width 75ms, box-shadow 75ms',
            }}
          />
          {isScrubbing && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap pointer-events-none shadow-lg">
              {formatTime(playbackTime)}
            </div>
          )}
          {isSnapping && !isScrubbing && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap pointer-events-none">
              Snap
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>Click waveform to jump to position</span>
        {isPlaying && (
          <span className="text-blue-400 animate-pulse flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Playing</span>
          </span>
        )}
        {isScrubbing && (
          <span className="text-white flex items-center space-x-1">
            <span className="w-2 h-2 bg-white rounded-full"></span>
            <span>Scrubbing</span>
          </span>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
