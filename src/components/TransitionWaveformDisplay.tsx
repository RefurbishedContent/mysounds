import { useEffect, useRef, useState } from 'react';
import { WaveformData } from '../lib/audio/WaveformGenerator';

interface TransitionWaveformDisplayProps {
  templateAudioUrl: string | null;
  templateDuration: number;
  height?: number;
  fadeInKeyframes?: Array<{ position: number; value: number }>;
  fadeOutKeyframes?: Array<{ position: number; value: number }>;
  zoom?: number;
  progress?: number;
}

export function TransitionWaveformDisplay({
  templateAudioUrl,
  templateDuration,
  height = 100,
  fadeInKeyframes = [],
  fadeOutKeyframes = [],
  zoom = 1,
  progress = 0
}: TransitionWaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTemplateWaveform = async () => {
      if (!templateAudioUrl) {
        if (mounted) {
          setIsLoading(false);
          setWaveformData(null);
          setError(null);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(templateAudioUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch template audio');
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const samples = Math.floor(500 * zoom);
        const peaks = extractPeaksFromBuffer(audioBuffer, 0, audioBuffer.length, samples);

        if (mounted) {
          setWaveformData(peaks);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load template waveform:', error);
        if (mounted) {
          setIsLoading(false);
          setError('Failed to load template audio');
        }
      }
    };

    loadTemplateWaveform();

    return () => {
      mounted = false;
    };
  }, [templateAudioUrl, zoom]);

  const extractPeaksFromBuffer = (
    audioBuffer: AudioBuffer,
    startSample: number,
    length: number,
    samples: number
  ): Float32Array => {
    const channelData = audioBuffer.getChannelData(0);
    const peaks = new Float32Array(samples);
    const samplesPerPeak = Math.floor(length / samples);

    for (let i = 0; i < samples; i++) {
      const start = startSample + (i * samplesPerPeak);
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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / waveformData.length;
    const centerY = canvas.height / 2;

    // Draw waveform with fade visualization
    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const waveProgress = i / waveformData.length;

      // Calculate fade amount at this position
      let fadeInAmount = 1;
      let fadeOutAmount = 1;

      // Apply fade-in curve
      if (fadeInKeyframes.length >= 2) {
        const sortedIn = [...fadeInKeyframes].sort((a, b) => a.position - b.position);
        for (let j = 0; j < sortedIn.length - 1; j++) {
          if (waveProgress >= sortedIn[j].position && waveProgress <= sortedIn[j + 1].position) {
            const segmentProgress = (waveProgress - sortedIn[j].position) / (sortedIn[j + 1].position - sortedIn[j].position);
            fadeInAmount = sortedIn[j].value + segmentProgress * (sortedIn[j + 1].value - sortedIn[j].value);
            break;
          }
        }
        if (waveProgress < sortedIn[0].position) fadeInAmount = sortedIn[0].value;
        if (waveProgress > sortedIn[sortedIn.length - 1].position) fadeInAmount = sortedIn[sortedIn.length - 1].value;
      }

      // Apply fade-out curve
      if (fadeOutKeyframes.length >= 2) {
        const sortedOut = [...fadeOutKeyframes].sort((a, b) => a.position - b.position);
        for (let j = 0; j < sortedOut.length - 1; j++) {
          if (waveProgress >= sortedOut[j].position && waveProgress <= sortedOut[j + 1].position) {
            const segmentProgress = (waveProgress - sortedOut[j].position) / (sortedOut[j + 1].position - sortedOut[j].position);
            fadeOutAmount = sortedOut[j].value + segmentProgress * (sortedOut[j + 1].value - sortedOut[j].value);
            break;
          }
        }
        if (waveProgress < sortedOut[0].position) fadeOutAmount = sortedOut[0].value;
        if (waveProgress > sortedOut[sortedOut.length - 1].position) fadeOutAmount = sortedOut[sortedOut.length - 1].value;
      }

      // Combined fade amount (multiply both)
      const combinedFade = fadeInAmount * fadeOutAmount;
      const peak = waveformData[i];
      const barHeight = peak * (canvas.height / 2) * 0.9 * combinedFade;

      // Create gradient with fade visualization
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);

      // Color based on fade region
      if (fadeInAmount < 1 && fadeOutAmount >= 1) {
        // Fade in region (left side) - pink
        gradient.addColorStop(0, `rgba(236, 72, 153, ${0.9 * fadeInAmount})`);
        gradient.addColorStop(0.5, `rgba(236, 72, 153, ${0.7 * fadeInAmount})`);
        gradient.addColorStop(1, `rgba(236, 72, 153, ${0.9 * fadeInAmount})`);
      } else if (fadeOutAmount < 1 && fadeInAmount >= 1) {
        // Fade out region (right side) - cyan
        gradient.addColorStop(0, `rgba(6, 182, 212, ${0.9 * fadeOutAmount})`);
        gradient.addColorStop(0.5, `rgba(6, 182, 212, ${0.7 * fadeOutAmount})`);
        gradient.addColorStop(1, `rgba(6, 182, 212, ${0.9 * fadeOutAmount})`);
      } else {
        // Full volume region (middle) - purple
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.9)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.7)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.9)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    }

    // Draw center line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Draw playhead if playing
    if (progress > 0) {
      const playheadX = canvas.width * progress;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvas.height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

  }, [waveformData, height, containerWidth, zoom, fadeInKeyframes, fadeOutKeyframes, progress]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {!templateAudioUrl ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded border-2 border-dashed border-purple-500/30">
          <div className="text-center px-4">
            <div className="text-purple-400 text-sm font-semibold mb-1">No Template Selected</div>
            <div className="text-gray-500 text-xs">Select a transition template to view its waveform</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      ) : error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <div className="text-center px-4">
            <div className="text-red-400 text-sm font-semibold mb-1">Error Loading Template</div>
            <div className="text-gray-500 text-xs">{error}</div>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={containerWidth * zoom}
          height={height}
          className="h-full rounded"
          style={{ width: `${containerWidth * zoom}px`, minWidth: '100%' }}
        />
      )}
    </div>
  );
}
