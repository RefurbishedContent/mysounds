import React from 'react';
import {
  ArrowRight, Music, Zap, Clock, FileAudio, Scissors, Sparkles
} from 'lucide-react';
import { SONG_LETTERS, SONG_COLORS, formatTime } from './constants';
import { TransitionPairConfig } from './types';
import { useIsMobile } from '../../hooks/useIsMobile';

interface MashUpConfirmationStepProps {
  pairs: TransitionPairConfig[];
  mashUpName: string;
  onConfirm: () => void;
  onBack: () => void;
}

const MashUpConfirmationStep: React.FC<MashUpConfirmationStepProps> = ({
  pairs,
  mashUpName,
  onConfirm,
  onBack,
}) => {
  const isMobile = useIsMobile();

  const totalTransitionTime = pairs.reduce((sum, p) => sum + (p.directCut ? 0 : p.transitionDuration), 0);
  const transitionsWithTemplates = pairs.filter(p => !p.directCut).length;
  const directCuts = pairs.filter(p => p.directCut).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="text-center mb-2">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-1`}>
          {mashUpName}
        </h2>
        <p className="text-sm text-gray-400">
          Review your mash up configuration before processing
        </p>
      </div>

      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4"
        style={{ boxShadow: '0 0 20px rgba(6,182,212,0.06)' }}
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Music size={14} className="text-cyan-400" />
              <span className="text-xs text-gray-400">Transitions</span>
            </div>
            <p className="text-lg font-bold text-white">{pairs.length}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock size={14} className="text-teal-400" />
              <span className="text-xs text-gray-400">Transition Time</span>
            </div>
            <p className="text-lg font-bold text-white">{formatTime(totalTransitionTime)}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <FileAudio size={14} className="text-cyan-400" />
              <span className="text-xs text-gray-400">Format</span>
            </div>
            <p className="text-lg font-bold text-white">WAV</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {pairs.map((pair, index) => {
          const colorsA = SONG_COLORS[pair.songAIndex % SONG_COLORS.length];
          const colorsB = SONG_COLORS[pair.songBIndex % SONG_COLORS.length];
          const letterA = SONG_LETTERS[pair.songAIndex];
          const letterB = SONG_LETTERS[pair.songBIndex];

          return (
            <div
              key={pair.transitionId}
              className="bg-gray-800 border border-gray-700/50 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${colorsA.bg}`}>
                    <span className="text-white font-bold text-[10px]">{letterA}</span>
                  </div>
                  <span className="text-xs text-gray-300 truncate max-w-[80px]">{pair.songA.originalName}</span>
                  <ArrowRight size={12} className="text-gray-600 flex-shrink-0" />
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${colorsB.bg}`}>
                    <span className="text-white font-bold text-[10px]">{letterB}</span>
                  </div>
                  <span className="text-xs text-gray-300 truncate max-w-[80px]">{pair.songB.originalName}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {pair.directCut ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded text-[10px] text-gray-400">
                      <Scissors size={10} />
                      <span>Direct Cut</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded">
                        <Sparkles size={10} className="text-cyan-400" />
                        <span className="text-[10px] text-cyan-300 font-medium truncate max-w-[100px]">
                          {pair.selectedTemplate?.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {pair.transitionDuration}s
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-white font-medium text-sm mb-3 flex items-center">
          <ArrowRight className="w-4 h-4 mr-2 text-teal-500" />
          Audio Flow
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {pairs.map((pair, index) => {
            const colorA = SONG_COLORS[pair.songAIndex % SONG_COLORS.length];
            const colorB = SONG_COLORS[pair.songBIndex % SONG_COLORS.length];
            return (
              <React.Fragment key={pair.transitionId}>
                {index === 0 && (
                  <div className={`h-2 flex-1 min-w-[30px] rounded-full ${colorA.bpmBg}`} />
                )}
                <div className="flex-shrink-0 px-1">
                  {pair.directCut ? (
                    <Scissors size={12} className="text-gray-500" />
                  ) : (
                    <Zap size={12} className="text-cyan-400" />
                  )}
                </div>
                <div className={`h-2 flex-1 min-w-[30px] rounded-full ${colorB.bpmBg}`} />
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>{SONG_LETTERS[pairs[0].songAIndex]}</span>
          {pairs.length > 1 && (
            <span>
              {transitionsWithTemplates} template{transitionsWithTemplates !== 1 ? 's' : ''}
              {directCuts > 0 && `, ${directCuts} cut${directCuts !== 1 ? 's' : ''}`}
            </span>
          )}
          <span>{SONG_LETTERS[pairs[pairs.length - 1].songBIndex]}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 pb-8">
        <button
          onClick={onBack}
          className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-base hover:from-teal-400 hover:to-cyan-400 transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 flex items-center justify-center space-x-2"
          style={{
            boxShadow: '0 0 20px rgba(20,184,166,0.3), 0 4px 15px rgba(20,184,166,0.2)',
          }}
        >
          <Zap className="w-5 h-5" />
          <span>Create {pairs.length} Mash Up{pairs.length !== 1 ? 's' : ''}</span>
        </button>
      </div>
    </div>
  );
};

export default MashUpConfirmationStep;
