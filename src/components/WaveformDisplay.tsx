import { useEffect, useRef, useState } from 'react';
import { waveformGenerator, WaveformData } from '../lib/audio/WaveformGenerator';

interface WaveformDisplayProps {
  audioUrl: string;
  progress?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  onSeek?: (progress: number) => void;
  showScrubber?: boolean;
  gradientRegion?: {
    startTime: number;
    endTime: number;
    startColor: string;
    endColor: string;
  };
}

export function WaveformDisplay({
  audioUrl,
  progress = 0,
  height = 100,
  color = '#3b82f6',
  progressColor = '#60a5fa',
  onSeek,
  showScrubber = false,
  gradientRegion
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    let mounted = true;

    const loadWaveform = async () => {
      if (!audioUrl) {
        setIsLoading(false);
        setLoadError(true);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(false);
        const data = await waveformGenerator.generateWaveform(audioUrl, 500);
        if (mounted) {
          setWaveformData(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load waveform:', error);
        if (mounted) {
          setIsLoading(false);
          setLoadError(true);
        }
      }
    };

    loadWaveform();

    return () => {
      mounted = false;
    };
  }, [audioUrl]);

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
    canvas.width = containerWidth;
    canvas.height = height;

    waveformGenerator.drawWaveform(canvas, waveformData, {
      color,
      progressColor,
      progress,
      centerLine: true,
      gradientRegion
    });
  }, [waveformData, progress, color, progressColor, height, containerWidth, gradientRegion]);

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
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : loadError || !waveformData ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded">
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-0.5">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gray-600 rounded-full"
                  style={{ height: `${10 + Math.sin(i * 0.5) * 8}px` }}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-500">Waveform unavailable</span>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={containerWidth}
          height={height}
          className={`w-full h-full rounded ${
            onSeek ? 'cursor-pointer' : ''
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
    </div>
  );
}
