import React, { useEffect, useState } from 'react';
import { MixerTheme } from '../../lib/themeUtils';

interface NightclubEffectsProps {
  mixerTheme: MixerTheme;
  isPlaying: boolean;
  isAIActive?: boolean;
}

export const NightclubEffects: React.FC<NightclubEffectsProps> = ({
  mixerTheme,
  isPlaying,
  isAIActive
}) => {
  const [scanPosition, setScanPosition] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const secondaryGlow = mixerTheme.deckBColors?.glow || '#3b82f6';
  const effect = mixerTheme.backgroundEffect || 'none';
  const intensity = mixerTheme.glowIntensity || 'medium';

  const intensityMultiplier = {
    low: 0.3,
    medium: 0.6,
    high: 1
  }[intensity];

  useEffect(() => {
    if (!isPlaying || effect === 'none') {
      setScanPosition(0);
      setPulseIntensity(0);
      return;
    }

    if (effect === 'scan') {
      const interval = setInterval(() => {
        setScanPosition(prev => (prev + 2) % 100);
      }, 50);
      return () => clearInterval(interval);
    }

    if (effect === 'pulse') {
      const interval = setInterval(() => {
        setPulseIntensity(prev => {
          const target = isAIActive ? 0.8 : 0.5;
          return prev + (Math.random() * 0.3 - 0.15) * target;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, effect, isAIActive]);

  if (!mixerTheme.isNightclub || effect === 'none') {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {effect === 'laser' && isPlaying && (
        <>
          <div
            className="absolute h-[2px] left-0 right-0 animate-pulse"
            style={{
              top: '30%',
              background: `linear-gradient(90deg, transparent, ${glowColor}${Math.round(intensityMultiplier * 80).toString(16)}, transparent)`,
              boxShadow: `0 0 20px ${glowColor}${Math.round(intensityMultiplier * 60).toString(16)}`,
              transform: `rotate(${isAIActive ? '2deg' : '-1deg'})`
            }}
          />
          <div
            className="absolute h-[2px] left-0 right-0"
            style={{
              top: '70%',
              background: `linear-gradient(90deg, transparent, ${secondaryGlow}${Math.round(intensityMultiplier * 60).toString(16)}, transparent)`,
              boxShadow: `0 0 15px ${secondaryGlow}${Math.round(intensityMultiplier * 40).toString(16)}`,
              transform: `rotate(${isAIActive ? '-1.5deg' : '1deg'})`,
              animation: 'pulse 2s ease-in-out infinite alternate'
            }}
          />
          {isAIActive && (
            <div
              className="absolute w-[2px] top-0 bottom-0"
              style={{
                left: `${scanPosition}%`,
                background: `linear-gradient(180deg, transparent, ${glowColor}, transparent)`,
                boxShadow: `0 0 10px ${glowColor}`,
                opacity: intensityMultiplier * 0.6
              }}
            />
          )}
        </>
      )}

      {effect === 'scan' && isPlaying && (
        <div
          className="absolute top-0 bottom-0 w-[3px] transition-none"
          style={{
            left: `${scanPosition}%`,
            background: `linear-gradient(180deg, transparent 10%, ${glowColor} 50%, transparent 90%)`,
            boxShadow: `0 0 30px ${glowColor}${Math.round(intensityMultiplier * 80).toString(16)}, 0 0 60px ${glowColor}${Math.round(intensityMultiplier * 40).toString(16)}`,
            opacity: intensityMultiplier
          }}
        />
      )}

      {effect === 'pulse' && isPlaying && (
        <div
          className="absolute inset-0 transition-opacity duration-100"
          style={{
            background: `radial-gradient(ellipse at center, ${glowColor}${Math.round((0.1 + pulseIntensity * 0.1) * intensityMultiplier * 255).toString(16)} 0%, transparent 70%)`,
            opacity: 0.5 + pulseIntensity * 0.3
          }}
        />
      )}

      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: isPlaying
            ? `inset 0 0 ${isAIActive ? '60px' : '40px'} ${glowColor}${Math.round(intensityMultiplier * 20).toString(16)}`
            : 'none',
          transition: 'box-shadow 0.5s ease'
        }}
      />

      {isPlaying && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${glowColor}${Math.round(intensityMultiplier * 100).toString(16)}, transparent)`,
              boxShadow: `0 0 10px ${glowColor}${Math.round(intensityMultiplier * 60).toString(16)}`
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${secondaryGlow}${Math.round(intensityMultiplier * 80).toString(16)}, transparent)`,
              boxShadow: `0 0 10px ${secondaryGlow}${Math.round(intensityMultiplier * 40).toString(16)}`
            }}
          />
        </>
      )}
    </div>
  );
};
