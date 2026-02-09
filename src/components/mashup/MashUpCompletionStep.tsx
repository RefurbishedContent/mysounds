import React, { useEffect, useState } from 'react';
import {
  CheckCircle, RefreshCw, Library, Clock, FileAudio, Scissors, Sparkles
} from 'lucide-react';
import { BlendData } from '../../lib/blendExportService';
import { SONG_LETTERS, SONG_COLORS, formatTime } from './constants';
import { TransitionPairConfig } from './types';

interface MashUpCompletionStepProps {
  blends: BlendData[];
  pairs: TransitionPairConfig[];
  onGoToLibrary: () => void;
  onStartAnother: () => void;
}

const MashUpCompletionStep: React.FC<MashUpCompletionStepProps> = ({
  blends,
  pairs,
  onGoToLibrary,
  onStartAnother,
}) => {
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const totalDuration = blends.reduce((sum, b) => sum + b.duration, 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-3 pt-6 md:p-4 md:pt-12 overflow-y-auto">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur-3xl opacity-30 animate-pulse" />
            <CheckCircle className="w-24 h-24 text-teal-400 relative z-10 animate-bounce" />
          </div>
        </div>
      )}

      <div className="max-w-xl w-full bg-gray-800 border-2 border-teal-500/30 rounded-xl shadow-2xl shadow-teal-500/20 relative my-2 md:my-4">
        <div className="p-4 md:p-5">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-teal-500/50">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-0.5">
              {blends.length} Mash Up{blends.length !== 1 ? 's' : ''} Complete!
            </h2>
            <p className="text-xs md:text-sm text-gray-400">
              Your mash ups have been saved to your library
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gray-900/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Sparkles size={12} className="text-cyan-400" />
                <span className="text-[10px] text-gray-400">Blends</span>
              </div>
              <p className="text-base font-bold text-white">{blends.length}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Clock size={12} className="text-teal-400" />
                <span className="text-[10px] text-gray-400">Total</span>
              </div>
              <p className="text-base font-bold text-white">{formatTime(totalDuration)}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <FileAudio size={12} className="text-cyan-400" />
                <span className="text-[10px] text-gray-400">Format</span>
              </div>
              <p className="text-base font-bold text-white">WAV</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-4 max-h-[40vh] overflow-y-auto">
            {blends.map((blend, index) => {
              const pair = pairs[index];
              const colorsA = pair ? SONG_COLORS[pair.songAIndex % SONG_COLORS.length] : SONG_COLORS[0];
              const colorsB = pair ? SONG_COLORS[pair.songBIndex % SONG_COLORS.length] : SONG_COLORS[1];

              return (
                <div
                  key={blend.id}
                  className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={12} className="text-green-400" />
                      </div>
                      {pair && (
                        <>
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${colorsA.bg}`}>
                            <span className="text-white font-bold text-[9px]">
                              {SONG_LETTERS[pair.songAIndex]}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">to</span>
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${colorsB.bg}`}>
                            <span className="text-white font-bold text-[9px]">
                              {SONG_LETTERS[pair.songBIndex]}
                            </span>
                          </div>
                        </>
                      )}
                      <span className="text-xs text-white font-medium truncate ml-1">
                        {blend.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2 text-[10px] text-gray-400">
                      <span>{formatTime(blend.duration)}</span>
                      {pair?.directCut ? (
                        <Scissors size={10} />
                      ) : (
                        <Sparkles size={10} className="text-cyan-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              onClick={onGoToLibrary}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg py-2.5 px-4 hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              <div className="relative flex items-center justify-center space-x-2.5">
                <Library className="w-4 h-4" />
                <span className="font-bold text-sm">View in Library</span>
              </div>
            </button>
            <button
              onClick={onStartAnother}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-2.5 px-4 hover:bg-gray-600 hover:border-gray-500 transition-all"
            >
              <div className="flex items-center justify-center space-x-2.5">
                <RefreshCw className="w-4 h-4 text-gray-300" />
                <span className="font-bold text-sm">Start Another Mash Up</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MashUpCompletionStep;
