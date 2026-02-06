import React, { useState } from 'react';
import { Volume2, Activity, Play, Pause, SkipForward, SkipBack, Zap } from 'lucide-react';

interface DJCrossfaderProps {
  crossfadePosition?: number;
  masterVolume?: number;
  isPlaying?: boolean;
  isMixing?: boolean;
  onCrossfadeChange?: (position: number) => void;
  onMasterVolumeChange?: (volume: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSync?: () => void;
  vuMeterLevels?: {
    left: number;
    right: number;
  };
}

export const DJCrossfader: React.FC<DJCrossfaderProps> = ({
  crossfadePosition = 0.5,
  masterVolume = 0.8,
  isPlaying = false,
  isMixing = false,
  onCrossfadeChange,
  onMasterVolumeChange,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSync,
  vuMeterLevels = { left: 0.7, right: 0.7 }
}) => {
  const [syncEnabled, setSyncEnabled] = useState(false);

  const handleSync = () => {
    setSyncEnabled(!syncEnabled);
    onSync?.();
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left - Deck A Controls */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Deck A</h3>

          {/* VU Meter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-100"
                  style={{ width: `${vuMeterLevels.left * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8">-{Math.round((1 - vuMeterLevels.left) * 12)}dB</span>
            </div>
          </div>

          {/* Deck A Volume */}
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Level</div>
            <div className="h-32 bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.8"
                className="vertical-slider"
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  height: '100px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Center - Crossfader and Transport */}
        <div className="space-y-4 flex flex-col">
          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onPrevious}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={isPlaying ? onPause : onPlay}
              className={`p-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 transition-all transform hover:scale-105 ${
                isPlaying ? 'animate-pulse' : ''
              }`}
            >
              {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
            </button>

            <button
              onClick={onNext}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            className={`mx-auto px-6 py-2 rounded-lg font-bold transition-all ${
              syncEnabled
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} />
              <span>SYNC</span>
            </div>
          </button>

          {/* Mixing Status */}
          {isMixing && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-bold animate-pulse">
                <Activity size={16} className="animate-bounce" />
                <span>MIXING</span>
              </div>
            </div>
          )}

          {/* Crossfader */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="text-xs text-center text-gray-500 uppercase mb-2">Crossfader</div>
            <div className="relative bg-gray-900 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className={crossfadePosition < 0.4 ? 'text-cyan-400' : 'text-gray-600'}>A</span>
                <span className="text-gray-600">CENTER</span>
                <span className={crossfadePosition > 0.6 ? 'text-blue-400' : 'text-gray-600'}>B</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={crossfadePosition}
                onChange={(e) => onCrossfadeChange?.(Number(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right,
                    rgb(6 182 212) 0%,
                    rgb(99 102 241) ${crossfadePosition * 100}%,
                    rgb(139 92 246) 100%)`
                }}
              />
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Deck B Controls and Master */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Deck B</h3>

          {/* VU Meter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-blue-400" />
              <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-100"
                  style={{ width: `${vuMeterLevels.right * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8">-{Math.round((1 - vuMeterLevels.right) * 12)}dB</span>
            </div>
          </div>

          {/* Deck B Volume */}
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Level</div>
            <div className="h-32 bg-gray-900/50 rounded-lg flex items-center justify-center p-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                defaultValue="0.8"
                className="vertical-slider"
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  height: '100px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Master Volume */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <Volume2 size={20} className="text-gray-400" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Master</span>
              <span className="text-sm text-gray-400">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange?.(Number(e.target.value))}
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
          {/* Master VU Meter */}
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const threshold = (i + 1) / 10;
              const isActive = masterVolume >= threshold;
              let color = 'bg-green-500';
              if (i >= 7) color = 'bg-red-500';
              else if (i >= 5) color = 'bg-yellow-500';

              return (
                <div
                  key={i}
                  className={`w-1.5 h-8 rounded-full transition-all ${
                    isActive ? color : 'bg-gray-700'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
