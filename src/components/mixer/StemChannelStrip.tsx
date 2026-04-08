import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Disc } from 'lucide-react';
import { StemChannel, StemPlayer } from '../../lib/audio/StemPlayer';
import { WaveformAnalyser } from '../../lib/audio/WaveformAnalyser';

interface StemChannelStripProps {
  stemId: string;
  channel: StemChannel;
  player: StemPlayer;
  analyser: WaveformAnalyser | null;
  onMute: (stemId: string) => void;
  onSolo: (stemId: string) => void;
  onVolumeChange: (stemId: string, value: number) => void;
  onPanChange: (stemId: string, value: number) => void;
}

const STEM_COLORS: Record<string, string> = {
  drums:  '#f97316',
  bass:   '#8b5cf6',
  vocals: '#22d3ee',
  melody: '#4ade80',
  other:  '#94a3b8',
};

export function StemChannelStrip({
  stemId,
  channel,
  player,
  analyser,
  onMute,
  onSolo,
  onVolumeChange,
  onPanChange,
}: StemChannelStripProps) {
  const rmsCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [rms, setRms] = useState(0);

  const color = STEM_COLORS[channel.stemType] ?? '#94a3b8';

  const drawRMS = useCallback(() => {
    if (!analyser || !rmsCanvasRef.current) return;
    const canvas = rmsCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentRms = Math.min(1, analyser.getRMS() * 10);
    setRms(currentRms);

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const barH = currentRms * height;

    const gradient = ctx.createLinearGradient(0, height, 0, height - barH);
    gradient.addColorStop(0, color + '60');
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - barH, width, barH);

    rafRef.current = requestAnimationFrame(drawRMS);
  }, [analyser, color]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawRMS);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawRMS]);

  const stemLabel = channel.stemType.charAt(0).toUpperCase() + channel.stemType.slice(1);
  const isActive = rms > 0.02;

  return (
    <div className="flex flex-col items-center gap-2 w-14">
      <div className="text-xs font-semibold tracking-wider" style={{ color }}>
        {stemLabel.slice(0, 3).toUpperCase()}
      </div>

      <div
        className="relative w-full h-24 rounded overflow-hidden bg-slate-900 border border-slate-800"
        style={{ borderColor: isActive ? color + '40' : undefined }}
      >
        <canvas ref={rmsCanvasRef} width={56} height={96} className="absolute inset-0 w-full h-full" />
        <div
          className="absolute inset-0 flex items-center justify-center opacity-20"
          style={{ color }}
        >
          <Disc size={20} className={isActive ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} />
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={channel.volume}
        onChange={(e) => onVolumeChange(stemId, parseFloat(e.target.value))}
        className="w-full accent-current cursor-pointer"
        style={{ accentColor: color }}
        aria-label={`${stemLabel} volume`}
      />

      <input
        type="range"
        min={-1}
        max={1}
        step={0.01}
        value={channel.pan}
        onChange={(e) => onPanChange(stemId, parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: color + '80' }}
        aria-label={`${stemLabel} pan`}
      />

      <div className="flex gap-1">
        <button
          onClick={() => onMute(stemId)}
          className={`p-1 rounded text-xs transition-colors ${
            channel.isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
          }`}
          aria-label={`${stemLabel} mute`}
          title="Mute"
        >
          {channel.isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
        </button>
        <button
          onClick={() => onSolo(stemId)}
          className={`p-1 rounded text-xs font-bold transition-colors ${
            channel.isSolo
              ? 'text-yellow-300 border border-yellow-500/40'
              : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500'
          }`}
          style={channel.isSolo ? { backgroundColor: '#ca8a04' + '30' } : undefined}
          aria-label={`${stemLabel} solo`}
          title="Solo"
        >
          S
        </button>
      </div>
    </div>
  );
}
