import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseBrightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
}

const LASER_DEFS = [
  { baseAngle: -Math.PI * 0.75, sweepAmp: 0.55, sweepSpeed: 0.9,  phase: 0,    r: 0,   gv: 245, b: 255 },
  { baseAngle: -Math.PI * 0.65, sweepAmp: 0.45, sweepSpeed: 1.1,  phase: 1.2,  r: 26,  gv: 110, b: 255 },
  { baseAngle: -Math.PI * 0.5,  sweepAmp: 0.5,  sweepSpeed: 0.75, phase: 2.4,  r: 255, gv: 0,   b: 102 },
  { baseAngle: -Math.PI * 0.35, sweepAmp: 0.45, sweepSpeed: 1.0,  phase: 0.6,  r: 57,  gv: 255, b: 20  },
  { baseAngle: -Math.PI * 0.25, sweepAmp: 0.55, sweepSpeed: 0.85, phase: 1.8,  r: 255, gv: 170, b: 0   },
];

const IDLE_AMP_SCALE  = 0.32;
const IDLE_SPD_SCALE  = 0.28;

const GalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const starsRef  = useRef<Star[]>([]);
  const nebulaeRef = useRef<NebulaCloud[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      const w = canvas.parentElement?.clientWidth  ?? window.innerWidth;
      const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width  = w;
      canvas.height = h;

      starsRef.current = Array.from({ length: 340 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.4 + Math.random() * 1.8,
        baseBrightness: 0.2 + Math.random() * 0.75,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 1.8,
        color: Math.random() > 0.85
          ? Math.random() > 0.5 ? '#a5f3fc' : '#bae6fd'
          : '#ffffff',
      }));

      nebulaeRef.current = [
        { x: w * 0.15, y: h * 0.25, rx: w * 0.35, ry: h * 0.28, r: 0,  gv: 30, b: 80,  opacity: 0.055 },
        { x: w * 0.80, y: h * 0.15, rx: w * 0.30, ry: h * 0.22, r: 0,  gv: 50, b: 90,  opacity: 0.045 },
        { x: w * 0.50, y: h * 0.60, rx: w * 0.55, ry: h * 0.35, r: 0,  gv: 20, b: 60,  opacity: 0.04  },
        { x: w * 0.10, y: h * 0.70, rx: w * 0.28, ry: h * 0.30, r: 10, gv: 15, b: 50,  opacity: 0.035 },
        { x: w * 0.85, y: h * 0.55, rx: w * 0.25, ry: h * 0.25, r: 0,  gv: 60, b: 100, opacity: 0.04  },
        { x: w * 0.40, y: h * 0.35, rx: w * 0.20, ry: h * 0.18, r: 5,  gv: 40, b: 75,  opacity: 0.03  },
      ];
    };

    init();

    const ro = new ResizeObserver(() => init());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    const onResize = () => init();
    window.addEventListener('resize', onResize);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const t = performance.now() / 1000;

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      nebulaeRef.current.forEach((n) => {
        const rad  = Math.max(n.rx, n.ry);
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
        grad.addColorStop(0,   `rgba(${n.r},${n.gv},${n.b},${n.opacity})`);
        grad.addColorStop(0.5, `rgba(${n.r},${n.gv},${n.b},${n.opacity * 0.4})`);
        grad.addColorStop(1,   `rgba(${n.r},${n.gv},${n.b},0)`);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      starsRef.current.forEach((s) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha   = s.baseBrightness * (0.55 + 0.45 * twinkle);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (s.size > 1.2) {
          ctx.shadowBlur  = s.size * 3;
          ctx.shadowColor = s.color;
        }
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const heroOriginY = 220;

      LASER_DEFS.forEach((laser, i) => {
        const originX = (i / (LASER_DEFS.length - 1)) * w;
        const angle = laser.baseAngle + Math.sin(t * laser.sweepSpeed * IDLE_SPD_SCALE + laser.phase) * laser.sweepAmp * IDLE_AMP_SCALE;

        const len = Math.sqrt(w * w + h * h) * 1.5;
        const tx  = originX + Math.cos(angle) * len;
        const ty  = heroOriginY + Math.sin(angle) * len;

        ctx.save();

        ctx.beginPath();
        ctx.moveTo(originX, heroOriginY);
        ctx.lineTo(tx, ty);

        const midX = (originX + tx) / 2;
        const midY = (heroOriginY + ty) / 2;
        const laserGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, len * 0.5);
        laserGrad.addColorStop(0,   `rgba(${laser.r},${laser.gv},${laser.b},0.022)`);
        laserGrad.addColorStop(0.6, `rgba(${laser.r},${laser.gv},${laser.b},0.010)`);
        laserGrad.addColorStop(1,   `rgba(${laser.r},${laser.gv},${laser.b},0)`);

        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.018)`;
        ctx.lineWidth   = 22;
        ctx.lineCap     = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(originX, heroOriginY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.055)`;
        ctx.lineWidth   = 5;
        ctx.stroke();

        ctx.shadowBlur  = 12;
        ctx.shadowColor = `rgba(${laser.r},${laser.gv},${laser.b},0.4)`;
        ctx.beginPath();
        ctx.moveTo(originX, heroOriginY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.12)`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        ctx.restore();
      });

      const heroFade = ctx.createLinearGradient(0, heroOriginY - 120, 0, heroOriginY + 60);
      heroFade.addColorStop(0, 'rgba(0,4,22,0)');
      heroFade.addColorStop(1, 'rgba(0,4,22,0.55)');
      ctx.fillStyle = heroFade;
      ctx.fillRect(0, 0, w, heroOriginY + 60);

      const topGrad = ctx.createLinearGradient(0, 0, 0, 50);
      topGrad.addColorStop(0, 'rgba(5,5,16,1)');
      topGrad.addColorStop(1, 'rgba(5,5,16,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, 50);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
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
      }}
    />
  );
};

export default GalaxyBackground;
