import { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { WaveformDisplay } from './WaveformDisplay';
import { Play, Pause, MapPin } from 'lucide-react';

interface AudioScrubberProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying: boolean;
}

export function AudioScrubber({
  audioUrl,
  currentTime,
  duration,
  onSeek,
  isPlaying: externalIsPlaying
}: AudioScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(currentTime);
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

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

  const handleSetMarker = () => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
    }
    onSeek(playbackTime);
  };

  const progress = playbackTime / duration;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
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
        <button
          onClick={handleSetMarker}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors text-white text-sm font-medium"
        >
          <MapPin className="w-4 h-4" />
          <span>Set Marker Here</span>
        </button>
      </div>

      <div className="relative">
        <WaveformDisplay
          audioUrl={audioUrl}
          progress={progress}
          height={120}
          onSeek={handleWaveformClick}
          showScrubber={true}
        />
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
