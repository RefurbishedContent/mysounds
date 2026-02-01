import React, { useState, useRef, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';

export interface FadeKeyframe {
  position: number;
  value: number;
}

interface KeyframeFadeEditorProps {
  keyframes: FadeKeyframe[];
  onChange: (keyframes: FadeKeyframe[]) => void;
  color: string;
  direction: 'fadeOut' | 'fadeIn';
  height: number;
}

export const KeyframeFadeEditor: React.FC<KeyframeFadeEditorProps> = ({
  keyframes,
  onChange,
  color,
  direction,
  height
}) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawCurve();
  }, [keyframes, height]);

  const drawCurve = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (keyframes.length < 2) return;

    const sortedKeyframes = [...keyframes].sort((a, b) => a.position - b.position);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    sortedKeyframes.forEach((kf, index) => {
      const x = kf.position * canvas.width;
      const y = direction === 'fadeOut'
        ? (1 - kf.value) * canvas.height
        : kf.value * canvas.height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    ctx.fillStyle = color + '40';
    ctx.beginPath();
    ctx.moveTo(sortedKeyframes[0].position * canvas.width, canvas.height);
    sortedKeyframes.forEach(kf => {
      const x = kf.position * canvas.width;
      const y = direction === 'fadeOut'
        ? (1 - kf.value) * canvas.height
        : kf.value * canvas.height;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(sortedKeyframes[sortedKeyframes.length - 1].position * canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  };

  const handleMouseDown = (index: number) => {
    setDraggingIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingIndex === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const position = Math.max(0, Math.min(1, x / rect.width));
    const value = direction === 'fadeOut'
      ? 1 - Math.max(0, Math.min(1, y / rect.height))
      : Math.max(0, Math.min(1, y / rect.height));

    const newKeyframes = [...keyframes];

    if (draggingIndex === 0 || draggingIndex === keyframes.length - 1) {
      newKeyframes[draggingIndex] = { ...newKeyframes[draggingIndex], value };
    } else {
      newKeyframes[draggingIndex] = { position, value };
    }

    onChange(newKeyframes);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (draggingIndex !== null) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const position = Math.max(0, Math.min(1, x / rect.width));
    const value = direction === 'fadeOut'
      ? 1 - Math.max(0, Math.min(1, y / rect.height))
      : Math.max(0, Math.min(1, y / rect.height));

    const clickedOnExisting = keyframes.some((kf, index) => {
      const kfX = kf.position * rect.width;
      const kfY = direction === 'fadeOut'
        ? (1 - kf.value) * rect.height
        : kf.value * rect.height;
      const distance = Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - kfY, 2));
      return distance < 10;
    });

    if (!clickedOnExisting) {
      const newKeyframes = [...keyframes, { position, value }].sort((a, b) => a.position - b.position);
      onChange(newKeyframes);
    }
  };

  const handleRemoveKeyframe = (index: number) => {
    if (keyframes.length <= 2) return;
    if (index === 0 || index === keyframes.length - 1) return;

    const newKeyframes = keyframes.filter((_, i) => i !== index);
    onChange(newKeyframes);
  };

  useEffect(() => {
    if (draggingIndex !== null) {
      const handleGlobalMouseUp = () => setDraggingIndex(null);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [draggingIndex]);

  return (
    <div
      ref={containerRef}
      className="relative w-full cursor-crosshair"
      style={{ height }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ height }}
      />

      <div
        className="absolute inset-0"
        onClick={handleCanvasClick}
      />

      {keyframes.map((kf, index) => {
        const x = kf.position * 100;
        const y = direction === 'fadeOut'
          ? (1 - kf.value) * 100
          : kf.value * 100;

        const isEndpoint = index === 0 || index === keyframes.length - 1;
        const isDragging = draggingIndex === index;
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={index}
            className="absolute group"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isDragging ? 50 : 10
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(index);
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                ${isDragging ? 'scale-125 shadow-lg' : isHovered ? 'scale-110' : ''}
                ${isEndpoint ? 'cursor-ns-resize' : 'cursor-move'}
              `}
              style={{
                backgroundColor: color,
                borderColor: 'white',
                boxShadow: `0 0 10px ${color}80`
              }}
            >
              <Volume2 className="w-2 h-2 text-white" />
            </div>

            {!isEndpoint && isHovered && (
              <button
                className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveKeyframe(index);
                }}
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}

            {isHovered && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {Math.round(kf.value * 100)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
