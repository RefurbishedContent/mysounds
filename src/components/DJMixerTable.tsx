import React from 'react';
import { Volume2, Activity, Play, Pause, SkipForward, SkipBack, Zap } from 'lucide-react';
import { VinylTurntable } from './VinylTurntable';
import { DeckEQPanel } from './mixer/DeckEQPanel';
import { MixTrack } from '../lib/mixerService';
import { MixerTheme } from '../lib/themeUtils';

interface DJMixerTableProps {
  tracks: MixTrack[];
  currentTrackIndex: number;
  currentTime: number;
  isPlaying: boolean;
  isMixing: boolean;
  masterVolume: number;
  crossfadePosition: number;
  deckAVolume: number;
  deckBVolume: number;
  deckAEQ: { high: number; mid: number; low: number };
  deckBEQ: { high: number; mid: number; low: number };
  mixerTheme: MixerTheme;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSync: () => void;
  onCrossfadeChange: (value: number) => void;
  onMasterVolumeChange: (value: number) => void;
  onDeckAVolumeChange: (value: number) => void;
  onDeckBVolumeChange: (value: number) => void;
  onDeckAEQChange: (type: 'high' | 'mid' | 'low', value: number) => void;
  onDeckBEQChange: (type: 'high' | 'mid' | 'low', value: number) => void;
  onSelectTrack: (index: number) => void;
  onLoadTrackToDeck: (trackId: string, deck: 'A' | 'B') => void;
  isAIActive?: boolean;
}

export const DJMixerTable: React.FC<DJMixerTableProps> = ({
  tracks,
  currentTrackIndex,
  currentTime,
  isPlaying,
  isMixing,
  masterVolume,
  crossfadePosition,
  deckAVolume,
  deckBVolume,
  deckAEQ,
  deckBEQ,
  mixerTheme,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSync,
  onCrossfadeChange,
  onMasterVolumeChange,
  onDeckAVolumeChange,
  onDeckBVolumeChange,
  onDeckAEQChange,
  onDeckBEQChange,
  onSelectTrack,
  onLoadTrackToDeck,
  isAIActive = false
}) => {
  const [syncEnabled, setSyncEnabled] = React.useState(false);

  const currentTrack = tracks[currentTrackIndex];
  const nextTrack = tracks[currentTrackIndex + 1];

  const currentBPM = currentTrack?.blend?.duration ? 120 + (currentTrack.blend.duration % 20) : 120;
  const nextBPM = nextTrack?.blend?.duration ? 120 + (nextTrack.blend.duration % 20) : 120;

  const glowColorA = mixerTheme.deckAColors?.glow || '#06b6d4';
  const glowColorB = mixerTheme.deckBColors?.glow || '#3b82f6';
  const isNightclub = mixerTheme.isNightclub;

  const handleSync = () => {
    setSyncEnabled(!syncEnabled);
    onSync();
  };

  const handleDropOnDeckA = (songId: string) => {
    if (!isPlaying) {
      onLoadTrackToDeck(songId, 'A');
    }
  };

  const handleDropOnDeckB = (songId: string) => {
    onLoadTrackToDeck(songId, 'B');
  };

  const vuMeterLevels = {
    left: deckAVolume * (1 - crossfadePosition * 0.5),
    right: deckBVolume * (crossfadePosition * 0.5 + 0.5)
  };

  return (
    <div className="relative w-full">
      {/* 3D Perspective Container */}
      <div
        className="relative"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 30%'
        }}
      >
        {/* Main Mixer Table Surface */}
        <div
          className={`relative rounded-t-2xl overflow-hidden transition-all duration-500 ${
            isNightclub
              ? 'bg-gradient-to-b from-gray-900 via-black to-gray-900'
              : 'bg-gradient-to-b from-gray-800 via-gray-850 to-gray-900'
          }`}
          style={{
            transform: 'rotateX(5deg)',
            transformOrigin: 'center bottom',
            boxShadow: isNightclub && isPlaying
              ? `
                0 20px 60px -20px rgba(0, 0, 0, 0.9),
                0 40px 80px -40px rgba(0, 0, 0, 0.7),
                inset 0 1px 0 ${glowColorA}40,
                inset 0 -1px 0 ${glowColorB}30,
                0 0 40px ${glowColorA}15
              `
              : `
                0 20px 60px -20px rgba(0, 0, 0, 0.8),
                0 40px 80px -40px rgba(0, 0, 0, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.1),
                inset 0 -1px 0 rgba(0, 0, 0, 0.3)
              `
          }}
        >
          {/* Surface texture overlay */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)
              `
            }}
          />

          {/* Top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />

          {/* LED strip indicator */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[...Array(12)].map((_, i) => {
              const isActive = isPlaying && (vuMeterLevels.left + vuMeterLevels.right) / 2 > i / 12;
              return (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-100"
                  style={{
                    backgroundColor: isPlaying
                      ? isNightclub
                        ? i < 8 ? glowColorA : i < 10 ? glowColorB : '#ef4444'
                        : i < 8 ? '#22c55e' : i < 10 ? '#eab308' : '#ef4444'
                      : '#374151',
                    opacity: isActive ? 1 : 0.3,
                    boxShadow: isActive && isNightclub
                      ? `0 0 6px ${i < 8 ? glowColorA : glowColorB}`
                      : undefined
                  }}
                />
              );
            })}
          </div>

          {/* Main content area */}
          <div className="relative px-4 md:px-8 py-6 md:py-8">
            {/* Desktop Layout */}
            <div className="hidden md:flex items-start justify-between gap-6 lg:gap-8">
              {/* Left Turntable - Deck A */}
              <div className="flex flex-col items-center">
                <VinylTurntable
                  trackName={currentTrack?.blend?.name}
                  bpm={currentBPM}
                  duration={currentTrack?.blend?.duration || 0}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  isActive={isPlaying}
                  canAcceptDrop={!isPlaying}
                  accentColor={mixerTheme.deckAColors?.primary || '#06b6d4'}
                  deckLabel="A"
                  onPlay={onPlay}
                  onPause={onPause}
                  onDrop={handleDropOnDeckA}
                />

                {/* Deck A Pitch Fader */}
                <div className="mt-4 w-full max-w-[200px]">
                  <div className="text-[10px] text-gray-500 text-center mb-1">PITCH</div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.1"
                    defaultValue="0"
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>-8%</span>
                    <span>0</span>
                    <span>+8%</span>
                  </div>
                </div>

                {/* Deck A EQ Knobs */}
                <div className="mt-4 w-full">
                  <DeckEQPanel
                    eq={deckAEQ}
                    accentColor={mixerTheme.deckAColors?.primary || '#06b6d4'}
                    deckLabel="A"
                    isNightclub={isNightclub}
                    onChange={onDeckAEQChange}
                  />
                </div>
              </div>

              {/* Center Mixer Panel */}
              <div className="flex-1 max-w-md space-y-4">
                {/* Transport Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={onPrevious}
                    className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={isPlaying ? onPause : onPlay}
                    className={`p-5 rounded-full text-white transition-all transform hover:scale-105 ${
                      isPlaying && !isNightclub ? 'animate-pulse' : ''
                    }`}
                    style={{
                      background: isNightclub
                        ? `linear-gradient(135deg, ${glowColorA}, ${glowColorB})`
                        : 'linear-gradient(to right, #06b6d4, #3b82f6)',
                      boxShadow: isNightclub
                        ? `0 0 30px ${glowColorA}60, 0 0 60px ${glowColorA}30`
                        : '0 10px 30px -10px rgba(6, 182, 212, 0.4)'
                    }}
                  >
                    {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-0.5" />}
                  </button>
                  <button
                    onClick={onNext}
                    className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Sync Button & Mixing Status */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleSync}
                    className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${
                      syncEnabled
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} />
                      <span>SYNC</span>
                    </div>
                  </button>
                  {isMixing && (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold animate-pulse"
                      style={{
                        backgroundColor: `${glowColorA}20`,
                        color: glowColorA,
                        boxShadow: isNightclub ? `0 0 15px ${glowColorA}40` : undefined
                      }}
                    >
                      <Activity size={14} className="animate-bounce" />
                      <span>{isAIActive ? 'AI MIXING' : 'MIXING'}</span>
                    </div>
                  )}
                </div>

                {/* Volume Faders */}
                <div className="flex items-end justify-center gap-8">
                  {/* Deck A Volume */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-24 flex flex-col items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={deckAVolume}
                        onChange={(e) => onDeckAVolumeChange(Number(e.target.value))}
                        className="w-2 h-full appearance-none bg-gray-700 rounded-full cursor-pointer"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl'
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500">{Math.round(deckAVolume * 100)}%</div>
                  </div>

                  {/* VU Meters */}
                  <div className="flex gap-1">
                    <div className="flex flex-col-reverse gap-0.5">
                      {[...Array(10)].map((_, i) => {
                        const isActive = vuMeterLevels.left > i / 10;
                        return (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-sm transition-all"
                            style={{
                              backgroundColor: isActive
                                ? isNightclub
                                  ? i >= 8 ? '#ef4444' : i >= 6 ? glowColorB : glowColorA
                                  : i >= 8 ? '#ef4444' : i >= 6 ? '#eab308' : '#22c55e'
                                : '#374151',
                              boxShadow: isActive && isNightclub
                                ? `0 0 4px ${i >= 8 ? '#ef4444' : i >= 6 ? glowColorB : glowColorA}`
                                : undefined
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-col-reverse gap-0.5">
                      {[...Array(10)].map((_, i) => {
                        const isActive = vuMeterLevels.right > i / 10;
                        return (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-sm transition-all"
                            style={{
                              backgroundColor: isActive
                                ? isNightclub
                                  ? i >= 8 ? '#ef4444' : i >= 6 ? glowColorA : glowColorB
                                  : i >= 8 ? '#ef4444' : i >= 6 ? '#eab308' : '#22c55e'
                                : '#374151',
                              boxShadow: isActive && isNightclub
                                ? `0 0 4px ${i >= 8 ? '#ef4444' : i >= 6 ? glowColorA : glowColorB}`
                                : undefined
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Deck B Volume */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-24 flex flex-col items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={deckBVolume}
                        onChange={(e) => onDeckBVolumeChange(Number(e.target.value))}
                        className="w-2 h-full appearance-none bg-gray-700 rounded-full cursor-pointer"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl'
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500">{Math.round(deckBVolume * 100)}%</div>
                  </div>
                </div>

                {/* Crossfader */}
                <div
                  className="rounded-lg p-3"
                  style={{
                    backgroundColor: isNightclub ? 'rgba(0,0,0,0.4)' : 'rgba(17,24,39,0.6)'
                  }}
                >
                  <div className="text-[10px] text-center text-gray-500 uppercase mb-2">Crossfader</div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={crossfadePosition}
                    onChange={(e) => onCrossfadeChange(Number(e.target.value))}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right,
                        ${glowColorA} 0%,
                        ${glowColorB} ${crossfadePosition * 100}%,
                        ${glowColorB} 100%)`,
                      boxShadow: isNightclub && isPlaying
                        ? `0 0 10px ${crossfadePosition < 0.5 ? glowColorA : glowColorB}40`
                        : undefined
                    }}
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-gray-600">
                    <span>A</span>
                    <span>CENTER</span>
                    <span>B</span>
                  </div>
                </div>

                {/* Master Volume */}
                <div className="flex items-center gap-3 bg-gray-900/60 rounded-lg p-3">
                  <Volume2 size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Master</span>
                      <span className="text-[10px] text-gray-400">{Math.round(masterVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={masterVolume}
                      onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Turntable - Deck B */}
              <div className="flex flex-col items-center">
                <VinylTurntable
                  trackName={nextTrack?.blend?.name}
                  bpm={nextBPM}
                  duration={nextTrack?.blend?.duration || 0}
                  currentTime={0}
                  isPlaying={false}
                  isActive={isMixing}
                  canAcceptDrop={true}
                  accentColor={mixerTheme.deckBColors?.primary || '#3b82f6'}
                  deckLabel="B"
                  onDrop={handleDropOnDeckB}
                />

                {/* Deck B Pitch Fader */}
                <div className="mt-4 w-full max-w-[200px]">
                  <div className="text-[10px] text-gray-500 text-center mb-1">PITCH</div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.1"
                    defaultValue="0"
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>-8%</span>
                    <span>0</span>
                    <span>+8%</span>
                  </div>
                </div>

                {/* Deck B EQ Knobs */}
                <div className="mt-4 w-full">
                  <DeckEQPanel
                    eq={deckBEQ}
                    accentColor={mixerTheme.deckBColors?.primary || '#3b82f6'}
                    deckLabel="B"
                    isNightclub={isNightclub}
                    onChange={onDeckBEQChange}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              {/* Turntables row */}
              <div className="flex justify-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="scale-75 origin-center">
                    <VinylTurntable
                      trackName={currentTrack?.blend?.name}
                      bpm={currentBPM}
                      duration={currentTrack?.blend?.duration || 0}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      isActive={isPlaying}
                      canAcceptDrop={!isPlaying}
                      accentColor={mixerTheme.deckAColors?.primary || '#06b6d4'}
                      deckLabel="A"
                      onPlay={onPlay}
                      onPause={onPause}
                      onDrop={handleDropOnDeckA}
                    />
                  </div>
                  <div className="mt-2 scale-90">
                    <DeckEQPanel
                      eq={deckAEQ}
                      accentColor={mixerTheme.deckAColors?.primary || '#06b6d4'}
                      deckLabel="A"
                      isNightclub={isNightclub}
                      onChange={onDeckAEQChange}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="scale-75 origin-center">
                    <VinylTurntable
                      trackName={nextTrack?.blend?.name}
                      bpm={nextBPM}
                      duration={nextTrack?.blend?.duration || 0}
                      currentTime={0}
                      isPlaying={false}
                      isActive={isMixing}
                      canAcceptDrop={true}
                      accentColor={mixerTheme.deckBColors?.primary || '#3b82f6'}
                      deckLabel="B"
                      onDrop={handleDropOnDeckB}
                    />
                  </div>
                  <div className="mt-2 scale-90">
                    <DeckEQPanel
                      eq={deckBEQ}
                      accentColor={mixerTheme.deckBColors?.primary || '#3b82f6'}
                      deckLabel="B"
                      isNightclub={isNightclub}
                      onChange={onDeckBEQChange}
                    />
                  </div>
                </div>
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onPrevious}
                  className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className={`p-4 rounded-full text-white transition-all ${
                    isPlaying && !isNightclub ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: isNightclub
                      ? `linear-gradient(135deg, ${glowColorA}, ${glowColorB})`
                      : 'linear-gradient(to right, #06b6d4, #3b82f6)',
                    boxShadow: isNightclub
                      ? `0 0 25px ${glowColorA}50`
                      : '0 10px 30px -10px rgba(6, 182, 212, 0.4)'
                  }}
                >
                  {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-0.5" />}
                </button>
                <button
                  onClick={onNext}
                  className="p-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                  <SkipForward size={16} />
                </button>
              </div>

              {/* Crossfader */}
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: isNightclub ? 'rgba(0,0,0,0.4)' : 'rgba(17,24,39,0.6)'
                }}
              >
                <div className="text-[10px] text-center text-gray-500 uppercase mb-2">Crossfader</div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={crossfadePosition}
                  onChange={(e) => onCrossfadeChange(Number(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${glowColorA} 0%, ${glowColorB} 100%)`,
                    boxShadow: isNightclub && isPlaying
                      ? `0 0 10px ${crossfadePosition < 0.5 ? glowColorA : glowColorB}40`
                      : undefined
                  }}
                />
              </div>

              {/* Master Volume */}
              <div className="flex items-center gap-3 bg-gray-900/60 rounded-lg p-3">
                <Volume2 size={14} className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-400 w-8">{Math.round(masterVolume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Bottom edge shadow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black to-transparent" />
        </div>

        {/* 3D Depth - Bottom corners */}
        <div
          className="absolute -bottom-4 left-0 right-0 h-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, #1f2937, #111827)',
            clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)',
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.8)'
          }}
        />

        {/* Side depth panels */}
        <div
          className="absolute -bottom-4 left-0 w-8 h-8 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(to right, #0f1419, #1f2937)',
            clipPath: 'polygon(0% 100%, 100% 0%, 100% 100%)'
          }}
        />
        <div
          className="absolute -bottom-4 right-0 w-8 h-8 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(to left, #0f1419, #1f2937)',
            clipPath: 'polygon(0% 0%, 100% 100%, 0% 100%)'
          }}
        />
      </div>

      {/* Floor reflection */}
      <div
        className="h-8 mt-4 opacity-20 pointer-events-none hidden md:block"
        style={{
          background: 'linear-gradient(to bottom, rgba(31, 41, 55, 0.5), transparent)',
          filter: 'blur(4px)',
          transform: 'scaleY(-0.3)',
          transformOrigin: 'top'
        }}
      />
    </div>
  );
};
