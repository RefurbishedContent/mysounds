import React, { useRef, useEffect, useCallback } from 'react';

interface MixPointVisualizerProps {
  trackADurationMs: number;
  trackBDurationMs: number;
  mixPointMs: number;
  transitionDurationMs: number;
  currentTimeMs?: number;
  onMixPointChange?: (ms: number) => void;
}

export function MixPointVisualizer({
  trackADurationMs,
  trackBDurationMs,
  mixPointMs,
  transitionDurationMs,
  currentTimeMs = 0,
  onMixPointChange,
}: MixPointVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const totalMs = Math.max(trackADurationMs, trackBDurationMs + mixPointMs);
    const scale = width / totalMs;

    const trackH = height * 0.38;
    const trackAY = height * 0.05;
    const trackBY = height * 0.57;

    const cornerR = 4;
    function roundRect(x: number, y: number, w: number, h: number, r: number, fill: string) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    roundRect(0, trackAY, trackADurationMs * scale, trackH, cornerR, '#0f172a');
    roundRect(0, trackAY, mixPointMs * scale, trackH, cornerR, '#0369a130');

    const transitionX = mixPointMs * scale;
    const transitionW = transitionDurationMs * scale;
    roundRect(transitionX, trackAY, transitionW, trackH, 0, '#0ea5e940');
    ctx.strokeStyle = '#0ea5e960';
    ctx.lineWidth = 1;
    ctx.strokeRect(transitionX, trackAY, transitionW, trackH);

    roundRect(mixPointMs * scale, trackBY, trackBDurationMs * scale, trackH, cornerR, '#0f172a');
    roundRect(mixPointMs * scale, trackBY, transitionDurationMs * scale, trackH, 0, '#f9731640');
    ctx.strokeStyle = '#f9731660';
    ctx.lineWidth = 1;
    ctx.strokeRect(mixPointMs * scale, trackBY, transitionDurationMs * scale, trackH);

    ctx.fillStyle = '#1e293b';
    ctx.font = `10px system-ui`;
    ctx.fillStyle = '#475569';
    ctx.fillText('A', 4, trackAY + trackH / 2 + 4);
    ctx.fillText('B', mixPointMs * scale + 4, trackBY + trackH / 2 + 4);

    const mixX = mixPointMs * scale;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(mixX, trackAY - 4);
    ctx.lineTo(mixX, trackBY + trackH + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(mixX, trackAY - 6, 4, 0, 2 * Math.PI);
    ctx.fill();

    if (currentTimeMs > 0) {
      const curX = currentTimeMs * scale;
      ctx.strokeStyle = '#22d3ee80';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curX, 0);
      ctx.lineTo(curX, height);
      ctx.stroke();
    }
  }, [trackADurationMs, trackBDurationMs, mixPointMs, transitionDurationMs, currentTimeMs]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onMixPointChange) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalMs = Math.max(trackADurationMs, trackBDurationMs + mixPointMs);
    const scale = canvas.width / totalMs;
    const clickedMs = Math.max(0, Math.min(trackADurationMs - transitionDurationMs, x / scale));
    onMixPointChange(Math.round(clickedMs));
  }, [onMixPointChange, trackADurationMs, trackBDurationMs, mixPointMs, transitionDurationMs]);

  const formatTime = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-slate-400">MIX POINT</span>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span><span className="text-amber-400">●</span> Mix point: {formatTime(mixPointMs)}</span>
          <span className="text-sky-400">Transition zone</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={80}
        className="w-full rounded cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        onClick={handleClick}
        title="Click to move mix point"
      />
    </div>
  );
}
