import React, { useEffect, useRef } from 'react';

interface CrowdDot {
  x: number;
  y: number;
  size: number;
  phase: number;
  bounceSpeed: number;
  bounceAmp: number;
  brightness: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const LASER_DEFS = [
  { xFrac: 0.15, baseAngle: -Math.PI * 0.65, sweepAmp: 0.30, speed: 0.55, phase: 0,    r: 0,   g: 245, b: 255 },
  { xFrac: 0.35, baseAngle: -Math.PI * 0.55, sweepAmp: 0.25, speed: 0.70, phase: 1.5,  r: 26,  g: 110, b: 255 },
  { xFrac: 0.50, baseAngle: -Math.PI * 0.50, sweepAmp: 0.35, speed: 0.45, phase: 3.0,  r: 255, g: 0,   b: 102 },
  { xFrac: 0.65, baseAngle: -Math.PI * 0.45, sweepAmp: 0.25, speed: 0.65, phase: 0.8,  r: 57,  g: 255, b: 20  },
  { xFrac: 0.85, baseAngle: -Math.PI * 0.35, sweepAmp: 0.30, speed: 0.50, phase: 2.2,  r: 255, g: 170, b: 0   },
];

const DJCrowdCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const crowdRef = useRef<CrowdDot[]>([]);
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      const w = canvas.parentElement?.clientWidth ?? window.innerWidth;
      const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      const horizonY = h * 0.45;

      crowdRef.current = [];
      const crowdCount = Math.min(400, Math.floor(w * 0.35));
      for (let i = 0; i < crowdCount; i++) {
        const depth = Math.random();
        const yPos = horizonY + depth * (h * 0.50);
        const spread = 0.3 + depth * 0.7;
        const xPos = w * 0.5 + (Math.random() - 0.5) * w * spread;

        crowdRef.current.push({
          x: xPos,
          y: yPos,
          size: 1.5 + (1 - depth) * 3,
          phase: Math.random() * Math.PI * 2,
          bounceSpeed: 1.5 + Math.random() * 2.5,
          bounceAmp: 1 + depth * 3,
          brightness: 0.15 + (1 - depth) * 0.35,
        });
      }

      starsRef.current = Array.from({ length: 180 }, () => ({
        x: Math.random() * w,
        y: Math.random() * horizonY * 0.85,
        size: 0.3 + Math.random() * 1.5,
        brightness: 0.15 + Math.random() * 0.6,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.3 + Math.random() * 1.5,
      }));
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
      const horizonY = h * 0.45;
      const stageY = h * 0.92;

      ctx.clearRect(0, 0, w, h);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#030308');
      skyGrad.addColorStop(0.5, '#050510');
      skyGrad.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);

      const venueGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      venueGrad.addColorStop(0, '#0a0a1a');
      venueGrad.addColorStop(0.4, '#080814');
      venueGrad.addColorStop(1, '#050510');
      ctx.fillStyle = venueGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      const horizonGlow = ctx.createRadialGradient(w * 0.5, horizonY, 0, w * 0.5, horizonY, w * 0.6);
      horizonGlow.addColorStop(0, 'rgba(0,100,180,0.06)');
      horizonGlow.addColorStop(0.5, 'rgba(0,60,120,0.03)');
      horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, horizonY - h * 0.15, w, h * 0.3);

      starsRef.current.forEach((s) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.brightness * (0.5 + 0.5 * twinkle);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (s.size > 1) {
          ctx.shadowBlur = s.size * 3;
          ctx.shadowColor = '#a5f3fc';
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.012)`;
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.04)`;
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(${laser.r},${laser.g},${laser.b},0.5)`;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = `rgba(${laser.r},${laser.g},${laser.b},0.10)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        const dotGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, 24);
        dotGrad.addColorStop(0, `rgba(${laser.r},${laser.g},${laser.b},0.20)`);
        dotGrad.addColorStop(0.5, `rgba(${laser.r},${laser.g},${laser.b},0.06)`);
        dotGrad.addColorStop(1, `rgba(${laser.r},${laser.g},${laser.b},0)`);
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(originX, originY, 24, 0, Math.PI * 2);
        ctx.fill();
      });

      const spotCount = 3;
      for (let i = 0; i < spotCount; i++) {
        const sweepAngle = Math.sin(t * (0.3 + i * 0.15) + i * 2.1) * 0.6;
        const spotX = w * (0.3 + i * 0.2) + Math.sin(t * 0.4 + i) * w * 0.1;
        const spotAngle = -Math.PI * 0.5 + sweepAngle;
        const spotLen = h * 0.7;
        const spotEndX = spotX + Math.cos(spotAngle) * spotLen;
        const spotEndY = stageY + Math.sin(spotAngle) * spotLen;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(spotX, stageY);
        ctx.lineTo(spotEndX - 60, spotEndY);
        ctx.lineTo(spotEndX + 60, spotEndY);
        ctx.closePath();
        const spotGrad = ctx.createLinearGradient(spotX, stageY, spotEndX, spotEndY);
        spotGrad.addColorStop(0, 'rgba(255,255,255,0.025)');
        spotGrad.addColorStop(0.5, 'rgba(200,220,255,0.008)');
        spotGrad.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = spotGrad;
        ctx.fill();
        ctx.restore();
      }

      crowdRef.current.forEach((dot) => {
        const bounce = Math.sin(t * dot.bounceSpeed + dot.phase) * dot.bounceAmp;
        const dy = dot.y + bounce;

        const laserInfluence = LASER_DEFS.reduce((acc, laser) => {
          const lx = w * laser.xFrac;
          const dist = Math.abs(dot.x - lx);
          if (dist < 120) {
            const influence = (1 - dist / 120) * 0.3;
            return acc + influence;
          }
          return acc;
        }, 0);

        const alpha = Math.min(dot.brightness + laserInfluence, 0.65);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(dot.x, dy, dot.size, 0, Math.PI * 2);
        ctx.fill();

        if (dot.size > 2.5) {
          ctx.beginPath();
          ctx.arc(dot.x, dy - dot.size * 1.8, dot.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      const fogGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + h * 0.25);
      fogGrad.addColorStop(0, 'rgba(100,140,200,0.02)');
      fogGrad.addColorStop(0.5, 'rgba(80,100,160,0.015)');
      fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, horizonY, w, h * 0.25);

      const stageGlow = ctx.createLinearGradient(0, stageY - 30, 0, h);
      stageGlow.addColorStop(0, 'rgba(0,180,255,0.03)');
      stageGlow.addColorStop(0.5, 'rgba(0,100,200,0.015)');
      stageGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = stageGlow;
      ctx.fillRect(0, stageY - 30, w, h - stageY + 30);

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
