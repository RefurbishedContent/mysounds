import React, { useState, useRef, useCallback, useEffect } from 'react';

interface EQKnobProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  accentColor?: string;
  onChange: (value: number) => void;
}

export const EQKnob: React.FC<EQKnobProps> = ({
  value,
  min = -12,
  max = 12,
  label,
  accentColor = '#06b6d4',
  onChange
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const startValue = useRef(value);

  const normalizedValue = (value - min) / (max - min);
  const rotation = -135 + normalizedValue * 270;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    startY.current = clientY;
    startX.current = clientX;
    startValue.current = value;
  }, [value]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaY = startY.current - clientY;
    const deltaX = clientX - startX.current;
    const delta = (deltaY + deltaX) / 2;
    const sensitivity = 0.5;
    const range = max - min;
    const newValue = Math.max(min, Math.min(max, startValue.current + (delta * sensitivity * range) / 100));

    onChange(Math.round(newValue));
  }, [isDragging, min, max, onChange]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = 24 + radius * Math.cos(startRad);
    const y1 = 24 + radius * Math.sin(startRad);
    const x2 = 24 + radius * Math.cos(endRad);
    const y2 = 24 + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const valueArcEnd = -135 + normalizedValue * 270;
  const showPositiveArc = value > 0;
  const showNegativeArc = value < 0;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={knobRef}
        className={`relative w-12 h-12 cursor-grab transition-transform ${
          isDragging ? 'cursor-grabbing scale-110' : 'hover:scale-105'
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          touchAction: 'none'
        }}
      >
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="2"
          />

          <path
            d={arcPath(-135, 135, 17)}
            fill="none"
            stroke="#4b5563"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {showPositiveArc && (
            <path
              d={arcPath(0, valueArcEnd, 17)}
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                filter: isDragging ? `drop-shadow(0 0 4px ${accentColor})` : undefined
              }}
            />
          )}
          {showNegativeArc && (
            <path
              d={arcPath(valueArcEnd, 0, 17)}
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                filter: isDragging ? `drop-shadow(0 0 4px ${accentColor})` : undefined
              }}
            />
          )}

          <circle
            cx="24"
            cy="24"
            r="14"
            fill="url(#knobGradient)"
            stroke="#4b5563"
            strokeWidth="1"
          />

          <line
            x1="24"
            y1="12"
            x2="24"
            y2="18"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation} 24 24)`}
            style={{
              filter: isDragging ? `drop-shadow(0 0 3px ${accentColor})` : undefined
            }}
          />

          <defs>
            <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
          </defs>
        </svg>

        {isDragging && (
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-bold whitespace-nowrap"
            style={{
              backgroundColor: accentColor,
              color: 'white',
              boxShadow: `0 0 10px ${accentColor}80`
            }}
          >
            {value > 0 ? '+' : ''}{value}dB
          </div>
        )}
      </div>

      <div className="mt-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div
        className="text-[9px] font-medium"
        style={{ color: value !== 0 ? accentColor : '#6b7280' }}
      >
        {value > 0 ? '+' : ''}{value}
      </div>
    </div>
  );
};
