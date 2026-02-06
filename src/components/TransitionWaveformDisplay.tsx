import { useEffect, useRef, useState } from 'react';
import { WaveformData } from '../lib/audio/WaveformGenerator';

interface TransitionWaveformDisplayProps {
  songAUrl: string;
  songBUrl: string;
  songAEndTime: number;
  songBStartTime: number;
  transitionDuration: number;
  height?: number;
  fadeInKeyframes?: Array<{ position: number; value: number }>;
  fadeOutKeyframes?: Array<{ position: number; value: number }>;
  zoom?: number;
}

export function TransitionWaveformDisplay({
  songAUrl,
  songBUrl,
  songAEndTime,
  songBStartTime,
  transitionDuration,
  height = 100,
  fadeInKeyframes = [],
  fadeOutKeyframes = [],
  zoom = 1
}: TransitionWaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformDataA, setWaveformDataA] = useState<Float32Array | null>(null);
  const [waveformDataB, setWaveformDataB] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    let mounted = true;

    const loadTransitionWaveforms = async () => {
      try {
        setIsLoading(true);

        // Load Song A's ending portion
        const responseA = await fetch(songAUrl);
        const arrayBufferA = await responseA.arrayBuffer();
        const audioContextA = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBufferA = await audioContextA.decodeAudioData(arrayBufferA);

        // Load Song B's beginning portion
        const responseB = await fetch(songBUrl);
        const arrayBufferB = await responseB.arrayBuffer();
        const audioContextB = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBufferB = await audioContextB.decodeAudioData(arrayBufferB);

        // Extract transition region from Song A (last transitionDuration seconds before songAEndTime)
        const songATransitionStart = Math.max(0, songAEndTime - transitionDuration);
        const startSampleA = Math.floor(songATransitionStart * audioBufferA.sampleRate);
        const endSampleA = Math.floor(songAEndTime * audioBufferA.sampleRate);
        const lengthA = endSampleA - startSampleA;

        // Extract transition region from Song B (first transitionDuration seconds after songBStartTime)
        const songBTransitionEnd = songBStartTime + transitionDuration;
        const startSampleB = Math.floor(songBStartTime * audioBufferB.sampleRate);
        const endSampleB = Math.floor(songBTransitionEnd * audioBufferB.sampleRate);
        const lengthB = endSampleB - startSampleB;

        // Extract peaks for visualization
        const samples = Math.floor(500 * zoom);
        const peaksA = extractPeaksFromBuffer(audioBufferA, startSampleA, lengthA, samples);
        const peaksB = extractPeaksFromBuffer(audioBufferB, startSampleB, lengthB, samples);

        if (mounted) {
          setWaveformDataA(peaksA);
          setWaveformDataB(peaksB);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load transition waveforms:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadTransitionWaveforms();

    return () => {
      mounted = false;
    };
  }, [songAUrl, songBUrl, songAEndTime, songBStartTime, transitionDuration, zoom]);

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
    if (!waveformDataA || !waveformDataB || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = containerWidth * zoom;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw blended waveform
    const barWidth = canvas.width / waveformDataA.length;
    const centerY = canvas.height / 2;

    for (let i = 0; i < waveformDataA.length; i++) {
      const x = i * barWidth;
      const progress = i / waveformDataA.length;

      // Calculate fade amounts based on position
      let fadeInAmount = 0;
      let fadeOutAmount = 1;

      // Apply fade-in curve (from Song B)
      if (fadeInKeyframes.length >= 2) {
        const sortedIn = [...fadeInKeyframes].sort((a, b) => a.position - b.position);
        for (let j = 0; j < sortedIn.length - 1; j++) {
          if (progress >= sortedIn[j].position && progress <= sortedIn[j + 1].position) {
            const segmentProgress = (progress - sortedIn[j].position) / (sortedIn[j + 1].position - sortedIn[j].position);
            fadeInAmount = sortedIn[j].value + segmentProgress * (sortedIn[j + 1].value - sortedIn[j].value);
            break;
          }
        }
      } else {
        fadeInAmount = progress;
      }

      // Apply fade-out curve (from Song A)
      if (fadeOutKeyframes.length >= 2) {
        const sortedOut = [...fadeOutKeyframes].sort((a, b) => a.position - b.position);
        for (let j = 0; j < sortedOut.length - 1; j++) {
          if (progress >= sortedOut[j].position && progress <= sortedOut[j + 1].position) {
            const segmentProgress = (progress - sortedOut[j].position) / (sortedOut[j + 1].position - sortedOut[j].position);
            fadeOutAmount = sortedOut[j].value + segmentProgress * (sortedOut[j + 1].value - sortedOut[j].value);
            break;
          }
        }
      } else {
        fadeOutAmount = 1 - progress;
      }

      // Blend the two waveforms based on fade amounts
      const peakA = waveformDataA[i] * fadeOutAmount;
      const peakB = waveformDataB[i] * fadeInAmount;
      const blendedPeak = Math.max(peakA, peakB);

      const barHeight = blendedPeak * (canvas.height / 2) * 0.9;

      // Create gradient based on which song is more prominent
      const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);

      if (fadeOutAmount > fadeInAmount) {
        // More Song A (cyan)
        gradient.addColorStop(0, `rgba(6, 182, 212, ${0.8 * fadeOutAmount})`);
        gradient.addColorStop(0.5, `rgba(6, 182, 212, ${0.6 * fadeOutAmount})`);
        gradient.addColorStop(1, `rgba(6, 182, 212, ${0.8 * fadeOutAmount})`);
      } else {
        // More Song B (pink)
        gradient.addColorStop(0, `rgba(236, 72, 153, ${0.8 * fadeInAmount})`);
        gradient.addColorStop(0.5, `rgba(236, 72, 153, ${0.6 * fadeInAmount})`);
        gradient.addColorStop(1, `rgba(236, 72, 153, ${0.8 * fadeInAmount})`);
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

    // Draw transition midpoint marker
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [waveformDataA, waveformDataB, height, containerWidth, zoom, fadeInKeyframes, fadeOutKeyframes]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
