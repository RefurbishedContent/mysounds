import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
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
  { xFrac: 0.10, baseAngle: -Math.PI * 0.70, sweepAmp: 0.30, speed: 0.55, phase: 0,    r: 0,   g: 245, b: 255 },
  { xFrac: 0.30, baseAngle: -Math.PI * 0.58, sweepAmp: 0.25, speed: 0.70, phase: 1.5,  r: 26,  g: 110, b: 255 },
  { xFrac: 0.50, baseAngle: -Math.PI * 0.50, sweepAmp: 0.35, speed: 0.45, phase: 3.0,  r: 255, g: 0,   b: 102 },
  { xFrac: 0.70, baseAngle: -Math.PI * 0.42, sweepAmp: 0.25, speed: 0.65, phase: 0.8,  r: 57,  g: 255, b: 20  },
  { xFrac: 0.90, baseAngle: -Math.PI * 0.30, sweepAmp: 0.30, speed: 0.50, phase: 2.2,  r: 255, g: 170, b: 0   },
];

const STAR_COLORS = [
  '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff',
  '#a5f3fc', '#bae6fd', '#93c5fd',
  '#c4b5fd', '#f9a8d4', '#fde68a',
];

const DJCrowdCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<NebulaCloud[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      const w = canvas.parentElement?.clientWidth ?? window.innerWidth;
      const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      starsRef.current = Array.from({ length: 600 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() < 0.85
          ? 0.3 + Math.random() * 1.0
          : 1.2 + Math.random() * 1.6,
        brightness: 0.1 + Math.random() * 0.8,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.2 + Math.random() * 2.0,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      }));

      nebulaeRef.current = [
        { x: w * 0.35, y: h * 0.30, rx: w * 0.30, ry: h * 0.22, r: 0,   g: 40,  b: 120, opacity: 0.06  },
        { x: w * 0.65, y: h * 0.45, rx: w * 0.28, ry: h * 0.20, r: 20,  g: 60,  b: 140, opacity: 0.05  },
        { x: w * 0.50, y: h * 0.35, rx: w * 0.22, ry: h * 0.18, r: 60,  g: 20,  b: 100, opacity: 0.045 },
        { x: w * 0.20, y: h * 0.60, rx: w * 0.25, ry: h * 0.20, r: 0,   g: 50,  b: 90,  opacity: 0.04  },
        { x: w * 0.80, y: h * 0.25, rx: w * 0.20, ry: h * 0.15, r: 80,  g: 20,  b: 60,  opacity: 0.035 },
        { x: w * 0.45, y: h * 0.65, rx: w * 0.35, ry: h * 0.25, r: 0,   g: 30,  b: 80,  opacity: 0.04  },
        { x: w * 0.70, y: h * 0.70, rx: w * 0.18, ry: h * 0.15, r: 40,  g: 15,  b: 70,  opacity: 0.03  },
        { x: w * 0.15, y: h * 0.35, rx: w * 0.15, ry: h * 0.12, r: 0,   g: 70,  b: 100, opacity: 0.035 },
        { x: w * 0.55, y: h * 0.50, rx: w * 0.12, ry: h * 0.10, r: 100, g: 40,  b: 80,  opacity: 0.04  },
      ];
    };

    init();

    const ro = new ResizeObserver(() => init());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const t = performance.now() / 1000;
      const stageY = h + 20;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      nebulaeRef.current.forEach((n) => {
        const rad = Math.max(n.rx, n.ry);
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
        grad.addColorStop(0, `rgba(${n.r},${n.g},${n.b},${n.opacity})`);
        grad.addColorStop(0.35, `rgba(${n.r},${n.g},${n.b},${n.opacity * 0.55})`);
        grad.addColorStop(0.7, `rgba(${n.r},${n.g},${n.b},${n.opacity * 0.2})`);
        grad.addColorStop(1, `rgba(${n.r},${n.g},${n.b},0)`);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      starsRef.current.forEach((s) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.brightness * (0.4 + 0.6 * twinkle);
        ctx.save();
        ctx.globalAlpha = alpha;

        if (s.size > 1.2) {
          ctx.shadowBlur = s.size * 4;
          ctx.shadowColor = s.color;
        }

        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        if (s.size > 1.8 && s.brightness > 0.5) {
          ctx.globalAlpha = alpha * 0.15;
          ctx.beginPath();
          ctx.moveTo(s.x - s.size * 4, s.y);
          ctx.lineTo(s.x + s.size * 4, s.y);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - s.size * 4);
          ctx.lineTo(s.x, s.y + s.size * 4);
          ctx.stroke();
        }

        ctx.restore();
      });

      LASER_DEFS.forEach((laser) => {
        const originX = w * laser.xFrac;
        const originY = stageY;
        const angle = laser.baseAngle + Math.sin(t * laser.speed + laser.phase) * laser.sweepAmp;
        const len = Math.sqrt(w * w + h * h) * 1.2;
        const tx = originX + Math.cos(angle) * len;
        const ty = originY + Math.sin(angle) * len;

        ctx.save();

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.014)`;
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.045)`;
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.shadowBlur = 16;
        ctx.shadowColor = `rgba(${laser.r},${laser.g},${laser.b},0.5)`;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.11)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      });

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
      }}
    />
  );
};

export default DJCrowdCanvas;
