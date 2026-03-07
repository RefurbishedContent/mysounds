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
  gv: number;
  b: number;
  opacity: number;
}

interface Props {
  sidebarWidth?: number;
  heroBottomY?: number;
}

// Matches DJLaserCanvas laser definitions exactly
const LASER_DEFS = [
  { xFrac: 0,    baseAngle: -Math.PI * 0.75, sweepAmp: 0.55, sweepSpeed: 0.9,  phase: 0,    r: 0,   gv: 245, b: 255 },
  { xFrac: 0.25, baseAngle: -Math.PI * 0.65, sweepAmp: 0.45, sweepSpeed: 1.1,  phase: 1.2,  r: 26,  gv: 110, b: 255 },
  { xFrac: 0.5,  baseAngle: -Math.PI * 0.5,  sweepAmp: 0.5,  sweepSpeed: 0.75, phase: 2.4,  r: 255, gv: 0,   b: 102 },
  { xFrac: 0.75, baseAngle: -Math.PI * 0.35, sweepAmp: 0.45, sweepSpeed: 1.0,  phase: 0.6,  r: 57,  gv: 255, b: 20  },
  { xFrac: 1.0,  baseAngle: -Math.PI * 0.25, sweepAmp: 0.55, sweepSpeed: 0.85, phase: 1.8,  r: 255, gv: 170, b: 0   },
];

// Background runs at reduced speed/amplitude — ambient echo of the hero
const BG_AMP_SCALE = 0.28;
const BG_SPD_SCALE = 0.30;

const GalaxyBackground: React.FC<Props> = ({ sidebarWidth = 224, heroBottomY = 272 }) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const starsRef   = useRef<Star[]>([]);
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
          ? (Math.random() > 0.5 ? '#a5f3fc' : '#bae6fd')
          : '#ffffff',
      }));

      nebulaeRef.current = [
        { x: w * 0.15, y: h * 0.55, rx: w * 0.35, ry: h * 0.30, r: 0,  gv: 30, b: 80,  opacity: 0.055 },
        { x: w * 0.80, y: h * 0.45, rx: w * 0.30, ry: h * 0.28, r: 0,  gv: 50, b: 90,  opacity: 0.045 },
        { x: w * 0.50, y: h * 0.75, rx: w * 0.55, ry: h * 0.30, r: 0,  gv: 20, b: 60,  opacity: 0.04  },
        { x: w * 0.10, y: h * 0.80, rx: w * 0.28, ry: h * 0.25, r: 10, gv: 15, b: 50,  opacity: 0.035 },
        { x: w * 0.85, y: h * 0.65, rx: w * 0.25, ry: h * 0.25, r: 0,  gv: 60, b: 100, opacity: 0.04  },
        { x: w * 0.40, y: h * 0.60, rx: w * 0.20, ry: h * 0.20, r: 5,  gv: 40, b: 75,  opacity: 0.03  },
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

      // Nebula clouds — concentrated below the hero card
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

      // Stars
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

      // Content area width (right of sidebar)
      const contentW = w - sidebarWidth;
      const originY  = heroBottomY;

      LASER_DEFS.forEach((laser) => {
        // X origin aligned with DJLaserCanvas origin fractions, offset by sidebar
        const originX = sidebarWidth + laser.xFrac * contentW;

        // Angle flipped (+π) so the beam shoots DOWNWARD through the hero floor
        const downAngle = laser.baseAngle + Math.PI;
        const angle = downAngle
          + Math.sin(t * laser.sweepSpeed * BG_SPD_SCALE + laser.phase)
          * laser.sweepAmp
          * BG_AMP_SCALE;

        const len = Math.sqrt(w * w + h * h) * 1.4;
        const tx  = originX + Math.cos(angle) * len;
        const ty  = originY + Math.sin(angle) * len;

        ctx.save();

        // Wide soft halo
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.016)`;
        ctx.lineWidth   = 28;
        ctx.lineCap     = 'round';
        ctx.stroke();

        // Mid beam
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.052)`;
        ctx.lineWidth   = 5;
        ctx.stroke();

        // Core with glow
        ctx.shadowBlur  = 14;
        ctx.shadowColor = `rgba(${laser.r},${laser.gv},${laser.b},0.5)`;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.gv},${laser.b},0.13)`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        ctx.restore();

        // Breakthrough glow dot at the origin (hero card floor)
        ctx.save();
        const dotGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, 36);
        dotGrad.addColorStop(0,   `rgba(${laser.r},${laser.gv},${laser.b},0.28)`);
        dotGrad.addColorStop(0.4, `rgba(${laser.r},${laser.gv},${laser.b},0.10)`);
        dotGrad.addColorStop(1,   `rgba(${laser.r},${laser.gv},${laser.b},0)`);
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.ellipse(originX, originY, 36, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Fade out the galaxy above the hero card seam — but leave a glow window near the origin
      const heroMask = ctx.createLinearGradient(0, 0, 0, originY + 48);
      heroMask.addColorStop(0,    'rgba(5,5,16,1)');
      heroMask.addColorStop(0.60, 'rgba(5,5,16,0.92)');
      heroMask.addColorStop(0.82, 'rgba(5,5,16,0.45)');
      heroMask.addColorStop(1,    'rgba(5,5,16,0)');
      ctx.fillStyle = heroMask;
      ctx.fillRect(0, 0, w, originY + 48);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [sidebarWidth, heroBottomY]);

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
