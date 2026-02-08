import React, { useState } from 'react';
import { Play, Pause, Lock, Repeat, Sparkles } from 'lucide-react';
import { DeckColors } from '../lib/themeUtils';

interface DJDeckProps {
  deckId: 'A' | 'B';
  trackName?: string;
  artist?: string;
  bpm?: number;
  key?: string;
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  isCueing?: boolean;
  volume?: number;
  eq?: {
    high: number;
    mid: number;
    low: number;
  };
  waveformData?: number[];
  deckColors?: DeckColors;
  onPlay?: () => void;
  onPause?: () => void;
  onCue?: (index: number) => void;
  onVolumeChange?: (volume: number) => void;
  onEQChange?: (type: 'high' | 'mid' | 'low', value: number) => void;
  className?: string;
}

export const DJDeck: React.FC<DJDeckProps> = ({
  deckId,
  trackName = 'No Track Loaded',
  artist = '',
  bpm = 120,
  key = 'Am',
  duration = 0,
  currentTime = 0,
  isPlaying = false,
  isCueing = false,
  volume = 0.8,
  eq = { high: 0, mid: 0, low: 0 },
  waveformData = [],
  deckColors,
  onPlay,
  onPause,
  onCue,
  onVolumeChange,
  onEQChange,
  className = ''
}) => {
  const [keyLocked, setKeyLocked] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [fxEnabled, setFxEnabled] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const defaultColors = deckId === 'A'
    ? { from: '#06b6d4', to: '#3b82f6' }
    : { from: '#3b82f6', to: '#9333ea' };

  const colors = deckColors || defaultColors;
  const gradientStyle = { background: `linear-gradient(to right, ${colors.from}, ${colors.to})` };
  const deckColor = deckId === 'A' ? 'cyan' : 'blue';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const waveform = waveformData.length > 0
    ? waveformData
    : Array.from({ length: 100 }, () => Math.random());

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 p-3 md:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
            style={gradientStyle}
          >
            {deckId}
          </div>
          <div>
            <h3 className="text-xs text-gray-500 uppercase">Deck {deckId}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium text-${deckColor}-400`}>{key}</span>
              <span className="text-xs text-gray-600">&#8226;</span>
              <span className="text-xs text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {keyLocked && (
            <div className={`px-2 py-1 bg-${deckColor}-500/20 text-${deckColor}-400 text-xs font-medium rounded flex items-center gap-1`}>
              <Lock size={12} />
              <span>LOCK</span>
            </div>
          )}
          {isPlaying && (
            <div className={`px-2 py-1 bg-${deckColor}-500/20 text-${deckColor}-400 text-xs font-medium rounded animate-pulse`}>
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout: Compact horizontal BPM + track info row */}
      <div className="md:hidden">
        {/* BPM + Track Info Row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Compact BPM Circle */}
          <div className="relative flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90">
              <circle cx="40" cy="40" r="36" className="stroke-gray-700" strokeWidth="3" fill="none" />
              <circle
                cx="40" cy="40" r="36"
                className={`stroke-${deckColor}-500`}
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-xl font-bold text-${deckColor}-400`}>{bpm.toFixed(1)}</div>
                <div className="text-[9px] text-gray-500 uppercase">BPM</div>
              </div>
            </div>
            <button
              onClick={isPlaying ? onPause : onPlay}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full hover:scale-110 transition-transform shadow-lg"
              style={gradientStyle}
            >
              {isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" className="ml-0.5" />}
            </button>
          </div>

          {/* Track Info + Quick Controls */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate mb-1" title={trackName}>
              {trackName}
            </h2>
            {artist && <p className="text-xs text-gray-400 truncate mb-2">{artist}</p>}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setKeyLocked(!keyLocked)}
                className={`p-1.5 rounded transition-colors ${
                  keyLocked ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400'
                }`}
              >
                <Lock size={12} />
              </button>
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`p-1.5 rounded transition-colors ${
                  loopEnabled ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400'
                }`}
              >
                <Repeat size={12} />
              </button>
              <button
                onClick={() => setFxEnabled(!fxEnabled)}
                className={`p-1.5 rounded transition-colors ${
                  fxEnabled ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400'
                }`}
              >
                <Sparkles size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="bg-gray-900/50 rounded-lg p-2 mb-3 relative overflow-hidden h-16">
          <div className="h-full flex items-end gap-0.5">
            {waveform.map((height, i) => {
              const isActive = (i / waveform.length) * 100 <= progress;
              const waveformStyle = isActive
                ? { height: `${height * 100}%`, background: `linear-gradient(to top, ${colors.from}, ${colors.to})` }
                : { height: `${height * 100}%` };
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${isActive ? '' : 'bg-gray-700'}`}
                  style={waveformStyle}
                />
              );
            })}
          </div>
          <div
            className={`absolute top-0 bottom-0 w-0.5 bg-${deckColor}-400`}
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* EQ + Tempo Row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {(['high', 'mid', 'low'] as const).map((eqType) => (
              <div key={eqType} className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-0.5">{eqType}</div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eq[eqType]}
                  onChange={(e) => onEQChange?.(eqType, Number(e.target.value))}
                  className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${deckColor}-500`}
                />
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {eq[eqType] > 0 ? '+' : ''}{eq[eqType]}dB
                </div>
              </div>
            ))}
          </div>
          <div className="w-12 flex flex-col items-center">
            <div className="text-[10px] text-gray-500 uppercase mb-0.5">Tempo</div>
            <input
              type="range"
              min="-8"
              max="8"
              step="0.1"
              defaultValue="0"
              className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${deckColor}-500`}
              style={{ writingMode: 'vertical-lr', height: '48px', width: '16px' }}
            />
          </div>
        </div>

        {/* Hot Cues */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[1, 2, 3, 4].map((cueIndex) => (
            <button
              key={cueIndex}
              onClick={() => onCue?.(cueIndex)}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                isCueing
                  ? `bg-${deckColor}-500 text-white`
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              CUE {cueIndex}
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
          <span className="text-[10px] text-gray-500 uppercase font-medium w-12">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange?.(Number(e.target.value))}
            className={`flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${deckColor}-500`}
          />
          <span className="text-xs text-gray-400 w-10 text-right">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Desktop Layout: Original 12-column grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <svg className="w-36 h-36 -rotate-90">
                <circle cx="72" cy="72" r="66" className="stroke-gray-700" strokeWidth="4" fill="none" />
                <circle
                  cx="72" cy="72" r="66"
                  className={`stroke-${deckColor}-500`}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 66}`}
                  strokeDashoffset={`${2 * Math.PI * 66 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-4xl font-bold text-${deckColor}-400`}>{bpm.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 uppercase">BPM</div>
                </div>
              </div>
              <button
                onClick={isPlaying ? onPause : onPlay}
                className="absolute bottom-2 right-2 p-2 rounded-full hover:scale-110 transition-transform shadow-lg"
                style={gradientStyle}
              >
                {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setKeyLocked(!keyLocked)}
                className={`p-2 rounded transition-colors ${
                  keyLocked ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title="Key Lock"
              >
                <Lock size={14} />
              </button>
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`p-2 rounded transition-colors ${
                  loopEnabled ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title="Loop"
              >
                <Repeat size={14} />
              </button>
              <button
                onClick={() => setFxEnabled(!fxEnabled)}
                className={`p-2 rounded transition-colors ${
                  fxEnabled ? `bg-${deckColor}-500 text-white` : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title="FX"
              >
                <Sparkles size={14} />
              </button>
            </div>

            <div className="w-full">
              <div className="text-xs text-center text-gray-500 mb-1">TEMPO</div>
              <div className="h-24 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.1"
                  defaultValue="0"
                  className="vertical-slider"
                  style={{
                    writingMode: 'bt-lr',
                    WebkitAppearance: 'slider-vertical',
                    height: '80px'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="col-span-8 flex flex-col">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-white truncate mb-1" title={trackName}>
                {trackName}
              </h2>
              {artist && <p className="text-sm text-gray-400 truncate">{artist}</p>}
            </div>

            <div className="flex-1 bg-gray-900/50 rounded-lg p-3 mb-3 relative overflow-hidden">
              <div className="h-full flex items-end gap-0.5">
                {waveform.map((height, i) => {
                  const isActive = (i / waveform.length) * 100 <= progress;
                  const waveformStyle = isActive
                    ? { height: `${height * 100}%`, background: `linear-gradient(to top, ${colors.from}, ${colors.to})` }
                    : { height: `${height * 100}%` };
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${isActive ? '' : 'bg-gray-700'}`}
                      style={waveformStyle}
                    />
                  );
                })}
              </div>
              <div
                className={`absolute top-0 bottom-0 w-0.5 bg-${deckColor}-400`}
                style={{ left: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['high', 'mid', 'low'] as const).map((eqType) => (
                <div key={eqType} className="text-center">
                  <div className="text-xs text-gray-500 uppercase mb-1">{eqType}</div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    value={eq[eqType]}
                    onChange={(e) => onEQChange?.(eqType, Number(e.target.value))}
                    className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${deckColor}-500`}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {eq[eqType] > 0 ? '+' : ''}{eq[eqType]}dB
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((cueIndex) => (
                <button
                  key={cueIndex}
                  onClick={() => onCue?.(cueIndex)}
                  className={`py-1.5 text-xs font-medium rounded transition-colors ${
                    isCueing
                      ? `bg-${deckColor}-500 text-white`
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  CUE {cueIndex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 uppercase font-medium w-16">Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange?.(Number(e.target.value))}
              className={`flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${deckColor}-500`}
            />
            <span className="text-sm text-gray-400 w-12 text-right">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
