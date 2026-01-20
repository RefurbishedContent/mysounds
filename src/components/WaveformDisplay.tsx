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
}

export function WaveformDisplay({
  audioUrl,
  progress = 0,
  height = 100,
  color = '#3b82f6',
  progressColor = '#60a5fa',
  onSeek,
  showScrubber = false
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadWaveform = async () => {
      try {
        setIsLoading(true);
        const data = await waveformGenerator.generateWaveform(audioUrl, 500);
        if (mounted) {
          setWaveformData(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load waveform:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadWaveform();

    return () => {
      mounted = false;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    waveformGenerator.drawWaveform(canvas, waveformData, {
      color,
      progressColor,
      progress,
      centerLine: true
    });
  }, [waveformData, progress, color, progressColor]);

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
      ) : (
        <canvas
          ref={canvasRef}
          width={containerRef.current?.clientWidth || 800}
          height={height}
          className={`w-full rounded ${
            onSeek ? 'cursor-pointer' : ''
          } ${isDragging ? 'cursor-grabbing' : ''}`}
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
