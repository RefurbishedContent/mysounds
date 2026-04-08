import React, { useMemo } from 'react';

interface CamelotWheelProps {
  keyA?: string;
  keyB?: string;
  size?: number;
}

interface WheelSegment {
  position: number;
  label: string;
  keys: string[];
  isMinor: boolean;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { position: 1,  label: '1B',  keys: ['B', 'Cb'],     isMinor: false },
  { position: 2,  label: '2B',  keys: ['F#', 'Gb'],    isMinor: false },
  { position: 3,  label: '3B',  keys: ['Db', 'C#'],    isMinor: false },
  { position: 4,  label: '4B',  keys: ['Ab', 'G#'],    isMinor: false },
  { position: 5,  label: '5B',  keys: ['Eb', 'D#'],    isMinor: false },
  { position: 6,  label: '6B',  keys: ['Bb', 'A#'],    isMinor: false },
  { position: 7,  label: '7B',  keys: ['F'],            isMinor: false },
  { position: 8,  label: '8B',  keys: ['C'],            isMinor: false },
  { position: 9,  label: '9B',  keys: ['G'],            isMinor: false },
  { position: 10, label: '10B', keys: ['D'],            isMinor: false },
  { position: 11, label: '11B', keys: ['A'],            isMinor: false },
  { position: 12, label: '12B', keys: ['E'],            isMinor: false },
  { position: 1,  label: '1A',  keys: ['Abm', 'G#m'],  isMinor: true },
  { position: 2,  label: '2A',  keys: ['Ebm', 'D#m'],  isMinor: true },
  { position: 3,  label: '3A',  keys: ['Bbm', 'A#m'],  isMinor: true },
  { position: 4,  label: '4A',  keys: ['Fm'],           isMinor: true },
  { position: 5,  label: '5A',  keys: ['Cm'],           isMinor: true },
  { position: 6,  label: '6A',  keys: ['Gm'],           isMinor: true },
  { position: 7,  label: '7A',  keys: ['Dm'],           isMinor: true },
  { position: 8,  label: '8A',  keys: ['Am'],           isMinor: true },
  { position: 9,  label: '9A',  keys: ['Em'],           isMinor: true },
  { position: 10, label: '10A', keys: ['Bm'],           isMinor: true },
  { position: 11, label: '11A', keys: ['F#m', 'Gbm'],  isMinor: true },
  { position: 12, label: '12A', keys: ['C#m', 'Dbm'],  isMinor: true },
];

function findSegment(key: string): WheelSegment | null {
  return WHEEL_SEGMENTS.find((s) => s.keys.includes(key)) ?? null;
}

function segmentToAngle(position: number): number {
  return ((position - 1) / 12) * 2 * Math.PI - Math.PI / 2;
}

export function CamelotWheel({ keyA, keyB, size = 200 }: CamelotWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.24;
  const midR   = size * 0.34;
  const textR  = size * 0.39;
  const textRInner = size * 0.29;

  const segA = useMemo(() => (keyA ? findSegment(keyA) : null), [keyA]);
  const segB = useMemo(() => (keyB ? findSegment(keyB) : null), [keyB]);

  const sliceAngle = (2 * Math.PI) / 12;
  const gap = 0.05;

  function polarToXY(r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  function makeArcPath(r1: number, r2: number, startAngle: number, endAngle: number) {
    const s1 = polarToXY(r1, startAngle);
    const e1 = polarToXY(r1, endAngle);
    const s2 = polarToXY(r2, endAngle);
    const e2 = polarToXY(r2, startAngle);
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${r1} ${r1} 0 0 1 ${e1.x} ${e1.y}`,
      `L ${s2.x} ${s2.y}`,
      `A ${r2} ${r2} 0 0 0 ${e2.x} ${e2.y}`,
      'Z',
    ].join(' ');
  }

  const outerSlices = WHEEL_SEGMENTS.filter((s) => !s.isMinor);
  const innerSlices = WHEEL_SEGMENTS.filter((s) => s.isMinor);

  function isHighlighted(seg: WheelSegment, isMinorRing: boolean) {
    if (segA && segA.position === seg.position && segA.isMinor === isMinorRing) return 'A';
    if (segB && segB.position === seg.position && segB.isMinor === isMinorRing) return 'B';
    return null;
  }

  const lineA = segA
    ? polarToXY(midR, segmentToAngle(segA.position) + sliceAngle / 2)
    : null;
  const lineB = segB
    ? polarToXY(midR, segmentToAngle(segB.position) + sliceAngle / 2)
    : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {outerSlices.map((seg) => {
        const startAngle = segmentToAngle(seg.position) + gap / 2;
        const endAngle   = startAngle + sliceAngle - gap;
        const highlight  = isHighlighted(seg, false);
        const fill = highlight === 'A'
          ? '#0ea5e9'
          : highlight === 'B'
          ? '#f97316'
          : '#1e293b';
        const tp = polarToXY(textR, startAngle + (sliceAngle - gap) / 2);
        return (
          <g key={`outer-${seg.position}`}>
            <path d={makeArcPath(outerR, midR + size * 0.01, startAngle, endAngle)} fill={fill} stroke="#0f172a" strokeWidth="1" />
            <text
              x={tp.x} y={tp.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={size * 0.055}
              fill={highlight ? '#fff' : '#94a3b8'}
              fontWeight={highlight ? '700' : '400'}
            >
              {seg.label}
            </text>
          </g>
        );
      })}

      {innerSlices.map((seg) => {
        const startAngle = segmentToAngle(seg.position) + gap / 2;
        const endAngle   = startAngle + sliceAngle - gap;
        const highlight  = isHighlighted(seg, true);
        const fill = highlight === 'A'
          ? '#0284c7'
          : highlight === 'B'
          ? '#ea580c'
          : '#0f172a';
        const tp = polarToXY(textRInner, startAngle + (sliceAngle - gap) / 2);
        return (
          <g key={`inner-${seg.position}`}>
            <path d={makeArcPath(midR - size * 0.01, innerR, startAngle, endAngle)} fill={fill} stroke="#0f172a" strokeWidth="1" />
            <text
              x={tp.x} y={tp.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={size * 0.045}
              fill={highlight ? '#fff' : '#475569'}
              fontWeight={highlight ? '700' : '400'}
            >
              {seg.label}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={innerR} fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={size * 0.07} fill="#94a3b8" fontWeight="600">
        Camelot
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={size * 0.055} fill="#475569">
        Wheel
      </text>

      {lineA && lineB && (
        <line
          x1={lineA.x} y1={lineA.y}
          x2={lineB.x} y2={lineB.y}
          stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"
        />
      )}

      {lineA && (
        <circle cx={lineA.x} cy={lineA.y} r={size * 0.025} fill="#0ea5e9" stroke="#fff" strokeWidth="1" />
      )}
      {lineB && (
        <circle cx={lineB.x} cy={lineB.y} r={size * 0.025} fill="#f97316" stroke="#fff" strokeWidth="1" />
      )}

      {keyA && lineA && (
        <text x={lineA.x} y={lineA.y - size * 0.04} textAnchor="middle" fontSize={size * 0.05} fill="#0ea5e9" fontWeight="700">A</text>
      )}
      {keyB && lineB && (
        <text x={lineB.x} y={lineB.y - size * 0.04} textAnchor="middle" fontSize={size * 0.05} fill="#f97316" fontWeight="700">B</text>
      )}
    </svg>
  );
}
