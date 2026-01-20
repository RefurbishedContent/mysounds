import { useRef, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { WaveformDisplay } from './WaveformDisplay';

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
  isPlaying
}: AudioScrubberProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const scrubPlayerRef = useRef<Tone.Player | null>(null);
  const scrubTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeScrubPlayer = async () => {
      if (!scrubPlayerRef.current) {
        await Tone.start();
        scrubPlayerRef.current = new Tone.Player(audioUrl).toDestination();
        scrubPlayerRef.current.volume.value = -6;
      }
    };

    initializeScrubPlayer();

    return () => {
      if (scrubPlayerRef.current) {
        scrubPlayerRef.current.dispose();
        scrubPlayerRef.current = null;
      }
    };
  }, [audioUrl]);

  const playScrubSound = useCallback((time: number) => {
    if (!scrubPlayerRef.current || !scrubPlayerRef.current.loaded) return;

    try {
      scrubPlayerRef.current.stop();

      const scrubDuration = 0.05;
      scrubPlayerRef.current.start(Tone.now(), time, scrubDuration);

      if (scrubTimeoutRef.current) {
        clearTimeout(scrubTimeoutRef.current);
      }

      scrubTimeoutRef.current = window.setTimeout(() => {
        scrubPlayerRef.current?.stop();
      }, scrubDuration * 1000);
    } catch (error) {
      console.error('Scrub playback error:', error);
    }
  }, []);

  const handleScrubStart = useCallback(() => {
    setIsScrubbing(true);
  }, []);

  const handleScrubMove = useCallback(
    (progress: number) => {
      const time = progress * duration;
      setScrubTime(time);

      if (isScrubbing) {
        playScrubSound(time);
      }
    },
    [duration, isScrubbing, playScrubSound]
  );

  const handleScrubEnd = useCallback(
    (progress: number) => {
      const time = progress * duration;
      setIsScrubbing(false);
      onSeek(time);
    },
    [duration, onSeek]
  );

  const progress = isScrubbing ? scrubTime / duration : currentTime / duration;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Audio Scrubber</h3>
        <div className="text-xs text-gray-400 font-mono">
          {formatTime(isScrubbing ? scrubTime : currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div
        onMouseDown={handleScrubStart}
        onMouseUp={() => handleScrubEnd(progress)}
        className="relative"
      >
        <WaveformDisplay
          audioUrl={audioUrl}
          progress={progress}
          height={120}
          onSeek={handleScrubMove}
          showScrubber={true}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Drag to scrub with audio preview</span>
        {isScrubbing && (
          <span className="text-blue-400 animate-pulse">Scrubbing...</span>
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
