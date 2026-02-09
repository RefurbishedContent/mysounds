import { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { WaveformDisplay } from './WaveformDisplay';
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
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<AudioMarker[]>(markers);
  const durationRef = useRef<number>(duration);
  const draggingMarkerIdRef = useRef<string | null>(null);

  markersRef.current = markers;
  durationRef.current = duration;

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
    setPlaybackTime(currentTime);
  }, [currentTime]);

  const updatePlaybackTime = useCallback(() => {
    if (!playerRef.current || !isPlaying) return;

    const elapsed = Tone.now() - startTimeRef.current;
    const newTime = pauseTimeRef.current + elapsed;

    if (newTime >= duration) {
      setIsPlaying(false);
      setPlaybackTime(duration);
      playerRef.current.stop();
      return;
    }

    setPlaybackTime(newTime);
    animationFrameRef.current = requestAnimationFrame(updatePlaybackTime);
  }, [isPlaying, duration]);

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

  const handlePlayPause = async () => {
    if (!playerRef.current || !playerRef.current.loaded) {
      console.warn('Player not ready');
      return;
    }

    try {
      if (isPlaying) {
        playerRef.current.stop();
        pauseTimeRef.current = playbackTime;
        setIsPlaying(false);
      } else {
        await Tone.start();

        if (playbackTime >= duration) {
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
      console.error('Playback error:', error);
    }
  };

  const handleWaveformClick = useCallback(
    (progress: number) => {
      const time = progress * duration;

      if (playerRef.current) {
        playerRef.current.stop();
      }

      setPlaybackTime(time);
      pauseTimeRef.current = time;
      setIsPlaying(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [duration]
  );

  const handleSetInMarker = () => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    if (onSetInMarker) {
      onSetInMarker(playbackTime);
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
      onSetEndMarker(playbackTime);
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
    draggingMarkerIdRef.current = markerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const markerId = draggingMarkerIdRef.current;
    if (!markerId) return;

    e.preventDefault();
    const newTime = calcTimeFromPointer(e.clientX);
    const marker = markersRef.current.find(m => m.id === markerId);
    if (marker?.onDrag) {
      marker.onDrag(newTime);
    }
  }, [calcTimeFromPointer]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingMarkerIdRef.current) return;
    draggingMarkerIdRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleLostPointerCapture = useCallback(() => {
    draggingMarkerIdRef.current = null;
  }, []);

  const progress = playbackTime / duration;

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
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>Click waveform to jump to position</span>
        {isPlaying && (
          <span className="text-blue-400 animate-pulse flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Playing</span>
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
