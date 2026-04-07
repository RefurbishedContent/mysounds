import React from 'react';
import { Scissors, Sparkles, ChevronDown, ArrowDown, Upload } from 'lucide-react';
import { SONG_LETTERS, SONG_COLORS } from './constants';

interface TransitionConnectorProps {
  songAIndex: number;
  songBIndex: number;
  isConfigured: boolean;
  isDirectCut: boolean;
  effectName: string | null;
  isCustomUpload?: boolean;
  onClick: () => void;
  isMobile: boolean;
}

export const TransitionConnector: React.FC<TransitionConnectorProps> = ({
  songAIndex,
  songBIndex,
  isConfigured,
  isDirectCut,
  effectName,
  isCustomUpload,
  onClick,
  isMobile,
}) => {
  const letterA = SONG_LETTERS[songAIndex];
  const letterB = SONG_LETTERS[songBIndex];
  const colorsA = SONG_COLORS[songAIndex % SONG_COLORS.length];
  const colorsB = SONG_COLORS[songBIndex % SONG_COLORS.length];

  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-700/50 via-gray-600/30 to-gray-700/50" />

      <button
        onClick={onClick}
        className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${
          isConfigured
            ? isCustomUpload
              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-400/50 shadow-lg shadow-amber-500/10'
              : 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/30 hover:border-teal-400/50 shadow-lg shadow-teal-500/10'
            : 'bg-gray-800/80 border-gray-600/50 hover:border-gray-500 hover:bg-gray-800'
        }`}
      >
        <div className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${colorsA.bg}`}>
            {letterA}
          </div>
          <ArrowDown size={12} className={isConfigured ? 'text-teal-400' : 'text-gray-500'} />
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${colorsB.bg}`}>
            {letterB}
          </div>
        </div>

        <div className="w-px h-4 bg-gray-600/50" />

        {isConfigured ? (
          <div className="flex items-center gap-1.5">
            {isDirectCut ? (
              <>
                <Scissors size={12} className="text-teal-400" />
                <span className="text-xs font-medium text-teal-400">Direct Cut</span>
              </>
            ) : isCustomUpload ? (
              <>
                <Upload size={12} className="text-amber-400" />
                <span className="text-xs font-medium text-amber-400 max-w-[100px] truncate">
                  {effectName}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400 max-w-[100px] truncate">
                  {effectName}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <ChevronDown size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">Configure</span>
          </div>
        )}
      </button>
    </div>
  );
};

export default TransitionConnector;
