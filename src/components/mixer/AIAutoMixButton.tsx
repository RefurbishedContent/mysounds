import React from 'react';
import { Cpu } from 'lucide-react';
import { MixerTheme } from '../../lib/themeUtils';

interface AIAutoMixButtonProps {
  isAIActive: boolean;
  onClick: () => void;
  mixerTheme: MixerTheme;
  disabled?: boolean;
}

export const AIAutoMixButton: React.FC<AIAutoMixButtonProps> = ({
  isAIActive,
  onClick,
  mixerTheme,
  disabled = false
}) => {
  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const isNightclub = mixerTheme.isNightclub;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg font-medium transition-all ${
        disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : isAIActive
          ? 'text-white'
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
      }`}
      style={isAIActive && !disabled ? {
        backgroundColor: glowColor,
        boxShadow: isNightclub ? `0 0 20px ${glowColor}60` : `0 0 10px ${glowColor}40`
      } : undefined}
    >
      <div className="relative">
        <Cpu size={18} className={isAIActive ? 'animate-pulse' : ''} />
        {isAIActive && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: '#fff' }}
          />
        )}
      </div>
      <span className="hidden md:inline">AI Mix</span>
      {isAIActive && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800"
          style={{ backgroundColor: '#22c55e' }}
        />
      )}
    </button>
  );
};
