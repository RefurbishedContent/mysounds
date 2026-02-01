import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { waveformGenerator, WaveformData } from '../lib/audio/WaveformGenerator';

interface ClippedWaveformDisplayProps {
  audioUrl: string;
  clipStart: number;
  clipEnd: number;
  progress?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  onSeek?: (progress: number) => void;
  showScrubber?: boolean;
  zoom?: number;
}

export function ClippedWaveformDisplay({
  audioUrl,
  clipStart,
  clipEnd,
  progress = 0,
  height = 100,
  color = '#3b82f6',
  progressColor = '#60a5fa',
  onSeek,
  showScrubber = false,
  zoom = 1
}: ClippedWaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    let mounted = true;

    const loadClippedWaveform = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const clipDuration = clipEnd - clipStart;
        const startSample = Math.floor(clipStart * audioBuffer.sampleRate);
        const endSample = Math.floor(clipEnd * audioBuffer.sampleRate);
        const clipLength = endSample - startSample;

        const clippedBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          clipLength,
          audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel);
          const clippedData = clippedBuffer.getChannelData(channel);

          for (let i = 0; i < clipLength; i++) {
            clippedData[i] = sourceData[startSample + i] || 0;
          }
        }

        const samples = Math.floor(500 * zoom);
        const peaks = extractPeaks(clippedBuffer, samples);

        if (mounted) {
          setWaveformData({
            peaks,
            duration: clipDuration,
            sampleRate: audioBuffer.sampleRate
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load clipped waveform:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadClippedWaveform();

    return () => {
      mounted = false;
    };
  }, [audioUrl, clipStart, clipEnd, zoom]);

  const extractPeaks = (audioBuffer: AudioBuffer, samples: number): Float32Array => {
    const channelData = audioBuffer.getChannelData(0);
    const peaks = new Float32Array(samples);
    const samplesPerPeak = Math.floor(channelData.length / samples);

    for (let i = 0; i < samples; i++) {
      const start = i * samplesPerPeak;
      const end = start + samplesPerPeak;
      let max = 0;

      for (let j = start; j < end && j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) {
          max = abs;
        }
      }

      peaks[i] = max;
    }

    return peaks;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = containerWidth * zoom;
    canvas.height = height;

    waveformGenerator.drawWaveform(canvas, waveformData, {
      color,
      progressColor,
      progress,
      centerLine: true
    });
  }, [waveformData, progress, color, progressColor, height, containerWidth, zoom]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;

    onSeek(Math.max(0, Math.min(1, progress)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showScrubber || !onSeek) return;

    setIsDragging(true);
    handleClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !showScrubber || !onSeek) return;

    handleClick(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div ref={containerRef} className="relative w-full overflow-x-scroll" style={{ height }}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={containerWidth * zoom}
          height={height}
          className={`h-full rounded ${
            onSeek ? 'cursor-pointer' : ''
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{ width: `${containerWidth * zoom}px`, minWidth: '100%' }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}

      {showScrubber && progress > 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none"
          style={{ left: `${progress * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
        </div>
      )}
    </div>
  );
}
