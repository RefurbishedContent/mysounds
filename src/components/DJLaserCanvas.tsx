import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface Laser {
  originX: number;
  originY: number;
  baseAngle: number;
  sweepAmp: number;
  sweepSpeed: number;
  phase: number;
  color: string;
  rgb: string;
}

const LASER_COLORS: Array<{ hex: string; rgb: string }> = [
  { hex: '#00f5ff', rgb: '0,245,255' },
  { hex: '#1a6eff', rgb: '26,110,255' },
  { hex: '#ff0066', rgb: '255,0,102' },
  { hex: '#39ff14', rgb: '57,255,20' },
  { hex: '#ffaa00', rgb: '255,170,0' },
  { hex: '#00f5ff', rgb: '0,245,255' },
];

const ENTRY_DURATION_MS = 3200;

const DJLaserCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mountTimeRef = useRef<number>(Date.now());
  const particlesRef = useRef<Particle[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const scanLinesRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mountTimeRef.current = Date.now();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initScene(canvas.width, canvas.height);
    };

    const initScene = (w: number, h: number) => {
      particlesRef.current = Array.from({ length: 55 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 0.12 + Math.random() * 0.22,
        size: 0.5 + Math.random() * 1.6,
        opacity: 0.15 + Math.random() * 0.65,
        color: Math.random() > 0.5 ? '#ffffff' : '#00f5ff',
      }));

      lasersRef.current = [
        { originX: 0,     originY: h, baseAngle: -Math.PI * 0.75, sweepAmp: 0.55, sweepSpeed: 0.9,  phase: 0,    color: LASER_COLORS[0].hex, rgb: LASER_COLORS[0].rgb },
        { originX: w * 0.25, originY: h, baseAngle: -Math.PI * 0.65, sweepAmp: 0.45, sweepSpeed: 1.1,  phase: 1.2,  color: LASER_COLORS[1].hex, rgb: LASER_COLORS[1].rgb },
        { originX: w * 0.5,  originY: h, baseAngle: -Math.PI * 0.5,  sweepAmp: 0.5,  sweepSpeed: 0.75, phase: 2.4,  color: LASER_COLORS[2].hex, rgb: LASER_COLORS[2].rgb },
        { originX: w * 0.75, originY: h, baseAngle: -Math.PI * 0.35, sweepAmp: 0.45, sweepSpeed: 1.0,  phase: 0.6,  color: LASER_COLORS[3].hex, rgb: LASER_COLORS[3].rgb },
        { originX: w,        originY: h, baseAngle: -Math.PI * 0.25, sweepAmp: 0.55, sweepSpeed: 0.85, phase: 1.8,  color: LASER_COLORS[4].hex, rgb: LASER_COLORS[4].rgb },
        { originX: w * 0.5,  originY: 0, baseAngle: Math.PI * 0.5,   sweepAmp: 0.3,  sweepSpeed: 0.6,  phase: 3.0,  color: LASER_COLORS[5].hex, rgb: LASER_COLORS[5].rgb },
      ];

      scanLinesRef.current = [
        h * 0.15,
        h * 0.4,
        h * 0.68,
      ];
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas.parentElement!);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const now = Date.now();
      const elapsed = (now - mountTimeRef.current) / 1000;

      const entryProgress = Math.min(elapsed / (ENTRY_DURATION_MS / 1000), 1);
      const entryEase = entryProgress < 1
        ? 1 - Math.pow(1 - entryProgress, 3)
        : 1;
      const idleBlend = entryEase;
      const ampScale = entryProgress < 1
        ? 1.0 + (1 - entryProgress) * 0.8
        : 0.42;
      const speedScale = entryProgress < 1
        ? 1.0 + (1 - entryProgress) * 0.6
        : 0.38;

      ctx.fillStyle = '#09090f';
      ctx.fillRect(0, 0, w, h);

      const globalAlpha = Math.min(elapsed / 0.6, 1);

      lasersRef.current.forEach((laser) => {
        const angle = laser.baseAngle + Math.sin(elapsed * laser.sweepSpeed * speedScale + laser.phase) * laser.sweepAmp * ampScale;
        const len = Math.sqrt(w * w + h * h) * 1.2;
        const tx = laser.originX + Math.cos(angle) * len;
        const ty = laser.originY + Math.sin(angle) * len;

        ctx.save();
        ctx.globalAlpha = globalAlpha;

        ctx.beginPath();
        ctx.moveTo(laser.originX, laser.originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.rgb},0.08)`;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(laser.originX, laser.originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.rgb},0.35)`;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.shadowBlur = 14;
        ctx.shadowColor = laser.color;
        ctx.beginPath();
        ctx.moveTo(laser.originX, laser.originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.rgb},1)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      });

      const hazeGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
      hazeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      hazeGrad.addColorStop(1, 'rgba(0,4,16,0.72)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, 0, w, h);

      const spotGrad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.65);
      spotGrad.addColorStop(0, `rgba(0,245,255,${0.04 * globalAlpha})`);
      spotGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
      spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);

      scanLinesRef.current = scanLinesRef.current.map((y) => {
        const newY = y + 0.15;
        return newY > h ? 0 : newY;
      });

      ctx.save();
      ctx.globalAlpha = 0.04 * globalAlpha;
      scanLinesRef.current.forEach((y) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, y, w, 1);
      });
      ctx.restore();

      particlesRef.current.forEach((p) => {
        p.y -= p.vy;
        if (p.y < -2) {
          p.y = h + 2;
          p.x = Math.random() * w;
        }
        ctx.save();
        ctx.globalAlpha = p.opacity * 0.7 * globalAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, w * 0.75);
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      edgeGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  );
};

export default DJLaserCanvas;
