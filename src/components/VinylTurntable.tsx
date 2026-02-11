import React, { useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface VinylTurntableProps {
  trackName?: string;
  bpm?: number;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  isActive?: boolean;
  canAcceptDrop?: boolean;
  accentColor?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onDrop?: (songId: string) => void;
}

export const VinylTurntable: React.FC<VinylTurntableProps> = ({
  trackName,
  bpm = 120,
  duration = 0,
  currentTime = 0,
  isPlaying = false,
  isActive = false,
  canAcceptDrop = false,
  accentColor = '#06b6d4',
  onPlay,
  onPause,
  onDrop
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const tonearmRotation = 20 + (progress * 0.25);

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAcceptDrop) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canAcceptDrop) return;

    const songId = e.dataTransfer.getData('text/plain');
    if (songId && onDrop) {
      onDrop(songId);
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 ${
        isDragOver && canAcceptDrop ? 'scale-105' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Turntable base/platter */}
      <div className={`relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full transition-all duration-300 ${
        isDragOver && canAcceptDrop
          ? 'ring-4 ring-cyan-400 ring-opacity-80 shadow-lg shadow-cyan-500/50'
          : ''
      }`}>
        {/* Outer platter ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 shadow-xl">
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
        </div>

        {/* Vinyl record */}
        <div
          className={`absolute inset-4 rounded-full overflow-hidden ${
            isPlaying ? 'animate-spin-slow' : ''
          }`}
          style={{
            animationDuration: isPlaying ? `${60 / (bpm / 33.33)}s` : undefined
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id={`vinyl-accent-${trackName || 'empty'}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={accentColor} />
                <stop offset="50%" stopColor={accentColor} stopOpacity="0.7" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.4" />
              </linearGradient>
              <radialGradient id={`vinyl-surface-${trackName || 'empty'}`}>
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0f0f1a" />
              </radialGradient>
              <radialGradient id={`vinyl-label-${trackName || 'empty'}`}>
                <stop offset="0%" stopColor="#2a2a3e" />
                <stop offset="100%" stopColor="#1a1a2e" />
              </radialGradient>
            </defs>

            {/* Main vinyl surface */}
            <circle cx="100" cy="100" r="98" fill={`url(#vinyl-surface-${trackName || 'empty'})`} />

            {/* Grooves */}
            {[...Array(20)].map((_, i) => (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={92 - i * 3}
                fill="none"
                stroke="#0a0a12"
                strokeWidth="1"
                opacity={0.6}
              />
            ))}

            {/* Accent ring */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke={`url(#vinyl-accent-${trackName || 'empty'})`}
              strokeWidth="2"
              opacity={0.6}
            />

            {/* Highlight reflection */}
            <ellipse
              cx="70"
              cy="70"
              rx="30"
              ry="20"
              fill="white"
              opacity="0.03"
              transform="rotate(-45 70 70)"
            />

            {/* Center label */}
            <circle cx="100" cy="100" r="32" fill={`url(#vinyl-label-${trackName || 'empty'})`} />
            <circle
              cx="100"
              cy="100"
              r="32"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.5"
              opacity="0.5"
            />

            {/* Center spindle hole */}
            <circle cx="100" cy="100" r="4" fill="#000" />
            <circle cx="100" cy="100" r="3" fill="#1a1a2e" />
          </svg>

          {/* Center label content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center w-16 md:w-20">
              {trackName ? (
                <>
                  <div className="text-[8px] md:text-[10px] text-gray-400 font-medium truncate px-1">
                    {bpm} BPM
                  </div>
                </>
              ) : (
                <div className="text-[10px] md:text-xs text-gray-500">
                  Drop track
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Play/Pause button overlay */}
        {trackName && (
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-sm"
          >
            <div className={`p-3 md:p-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50 transition-transform hover:scale-110 ${
              isPlaying ? 'animate-pulse' : ''
            }`}>
              {isPlaying ? (
                <Pause size={24} className="text-white" fill="white" />
              ) : (
                <Play size={24} className="text-white ml-0.5" fill="white" />
              )}
            </div>
          </button>
        )}

        {/* Drop zone indicator */}
        {canAcceptDrop && isDragOver && (
          <div className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-400 bg-cyan-500/10 flex items-center justify-center animate-pulse">
            <span className="text-cyan-400 font-bold text-sm">Drop here</span>
          </div>
        )}
      </div>

      {/* Tonearm */}
      <div
        className="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-24 h-24 md:w-32 md:h-32 pointer-events-none"
        style={{
          transformOrigin: '85% 15%',
          transform: `rotate(${isActive ? tonearmRotation : 0}deg)`,
          transition: 'transform 0.5s ease-out'
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Tonearm base */}
          <circle cx="85" cy="15" r="8" fill="#3a3a4a" />
          <circle cx="85" cy="15" r="6" fill="#2a2a3a" />
          <circle cx="85" cy="15" r="3" fill="#4a4a5a" />

          {/* Tonearm */}
          <line
            x1="85"
            y1="15"
            x2="25"
            y2="75"
            stroke="#4a4a5a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="85"
            y1="15"
            x2="25"
            y2="75"
            stroke="#5a5a6a"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Headshell */}
          <rect
            x="15"
            y="70"
            width="20"
            height="8"
            rx="2"
            fill="#3a3a4a"
            transform="rotate(-45 25 74)"
          />

          {/* Cartridge */}
          <rect
            x="8"
            y="78"
            width="10"
            height="5"
            rx="1"
            fill="#2a2a3a"
            transform="rotate(-45 13 80)"
          />

          {/* Stylus */}
          <circle cx="10" cy="85" r="1.5" fill={accentColor} />
        </svg>
      </div>

      {/* Track info below turntable */}
      <div className="mt-3 text-center">
        {trackName ? (
          <div className="space-y-0.5">
            <div className="text-sm md:text-base font-semibold text-white truncate max-w-[180px] md:max-w-[220px] mx-auto">
              {trackName}
            </div>
            <div className="text-xs text-gray-400">
              {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No track loaded</div>
        )}
      </div>
    </div>
  );
};
