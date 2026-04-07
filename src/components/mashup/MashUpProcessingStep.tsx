import React, { useState, useEffect, useRef } from 'react';
import { Loader, CheckCircle, X, Scissors, Sparkles, ArrowRight } from 'lucide-react';
import { BlendData, blendExportService, ExportProgress } from '../../lib/blendExportService';
import { useAuth } from '../../contexts/AuthContext';
import { SONG_LETTERS, SONG_COLORS } from './constants';
import { TransitionPairConfig } from './types';

interface MashUpProcessingStepProps {
  pairs: TransitionPairConfig[];
  mashUpName: string;
  onComplete: (blends: BlendData[]) => void;
  onBack: () => void;
}

const MashUpProcessingStep: React.FC<MashUpProcessingStepProps> = ({
  pairs,
  mashUpName,
  onComplete,
  onBack,
}) => {
  const { user } = useAuth();
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [currentPairProgress, setCurrentPairProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('Initializing...');
  const [completedBlends, setCompletedBlends] = useState<BlendData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failedPairIndex, setFailedPairIndex] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const hasStartedRef = useRef(false);
  const cancelledRef = useRef(false);

  const totalProgress = pairs.length > 0
    ? Math.min(100, ((completedBlends.length * 100) + currentPairProgress) / pairs.length)
    : 0;

  useEffect(() => {
    if (user && !hasStartedRef.current) {
      hasStartedRef.current = true;
      processAllPairs();
    }
  }, [user]);

  const processAllPairs = async () => {
    if (!user) return;

    const blends: BlendData[] = [...completedBlends];

    for (let i = completedBlends.length; i < pairs.length; i++) {
      if (cancelledRef.current) return;

      const pair = pairs[i];
      setCurrentPairIndex(i);
      setCurrentPairProgress(0);
      setCurrentMessage(
        pair.directCut
          ? `Splicing ${SONG_LETTERS[pair.songAIndex]} and ${SONG_LETTERS[pair.songBIndex]}...`
          : `Processing transition ${SONG_LETTERS[pair.songAIndex]} to ${SONG_LETTERS[pair.songBIndex]}...`
      );

      try {
        const blend = await blendExportService.createBlend(
          user.id,
          {
            transitionId: pair.transitionId,
            format: 'wav',
            quality: 'standard',
          },
          (progressUpdate: ExportProgress) => {
            setCurrentPairProgress(progressUpdate.progress);
            setCurrentMessage(progressUpdate.message);
          }
        );

        blends.push(blend);
        setCompletedBlends([...blends]);
      } catch (err) {
        console.error(`Failed to process pair ${i}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to create mash up');
        setFailedPairIndex(i);
        return;
      }
    }

    if (!cancelledRef.current) {
      setCurrentPairProgress(100);
      setCurrentMessage('All mash ups created successfully!');
      setTimeout(() => onComplete(blends), 600);
    }
  };

  const handleRetry = () => {
    setError(null);
    setFailedPairIndex(null);
    hasStartedRef.current = false;
    processAllPairs();
  };

  const handleSkipAndContinue = () => {
    setError(null);
    setFailedPairIndex(null);
    const remaining = pairs.slice((failedPairIndex ?? 0) + 1);
    if (remaining.length === 0 || completedBlends.length > 0) {
      onComplete(completedBlends);
    } else {
      setCurrentPairIndex((failedPairIndex ?? 0) + 1);
      hasStartedRef.current = false;
      processAllPairs();
    }
  };

  if (error) {
    const failedPair = failedPairIndex !== null ? pairs[failedPairIndex] : null;
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md w-full bg-gray-800 border border-red-500/30 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Processing Failed</h3>
          {failedPair && (
            <p className="text-sm text-gray-300 mb-2">
              Failed on: {SONG_LETTERS[failedPair.songAIndex]} to {SONG_LETTERS[failedPair.songBIndex]}
            </p>
          )}
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all"
            >
              Retry This Pair
            </button>
            {completedBlends.length > 0 && (
              <button
                onClick={handleSkipAndContinue}
                className="w-full py-2.5 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Skip & Continue ({completedBlends.length} completed)
              </button>
            )}
            <button
              onClick={onBack}
              className="w-full py-2.5 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Mobile fullscreen video overlay */}
      <div className="md:hidden fixed inset-0 z-40 bg-black/80">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          src="https://yuotfcbbzrsdpxohoiks.supabase.co/storage/v1/object/sign/Video/Loading%20Screen%20Video%20MySoundsAI.mov?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTc4YWI4OS1mMWQ5LTRkNWUtYWYyNS1lYjAyZDY0ZGQwNTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlby9Mb2FkaW5nIFNjcmVlbiBWaWRlbyBNeVNvdW5kc0FJLm1vdiIsImlhdCI6MTc3MDY3MDE5MiwiZXhwIjoxODAyMjA2MTkyfQ.-az3CuvQfC3POO2fTVSafphZTJ5eeauVvBg5K6bxUm4"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">{mashUpName}</h2>
            <p className="text-gray-300 text-sm">Creating your mash ups...</p>
          </div>

          <div className="w-full max-w-xs mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">{currentMessage}</span>
              <span className="text-sm font-medium text-white">{Math.round(totalProgress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>

          <div className="w-full max-w-xs space-y-1 max-h-[40vh] overflow-y-auto">
            {pairs.map((pair, index) => {
              const isComplete = index < completedBlends.length;
              const isCurrent = index === currentPairIndex && !error;
              const colorsA = SONG_COLORS[pair.songAIndex % SONG_COLORS.length];
              const colorsB = SONG_COLORS[pair.songBIndex % SONG_COLORS.length];

              return (
                <div
                  key={pair.transitionId}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    isCurrent ? 'bg-teal-500/20 backdrop-blur-sm border border-teal-500/30' : 'border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isComplete
                      ? 'bg-green-500/30 text-green-400'
                      : isCurrent
                      ? 'bg-teal-500/30 text-teal-400'
                      : 'bg-gray-700/50 text-gray-500'
                  }`}>
                    {isComplete ? (
                      <CheckCircle size={10} />
                    ) : isCurrent ? (
                      <Loader size={10} className="animate-spin" />
                    ) : (
                      <span className="text-[8px] font-bold">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${colorsA.bg}`}>
                      <span className="text-white font-bold text-[7px]">
                        {SONG_LETTERS[pair.songAIndex]}
                      </span>
                    </div>
                    <ArrowRight size={8} className="text-gray-600 flex-shrink-0" />
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${colorsB.bg}`}>
                      <span className="text-white font-bold text-[7px]">
                        {SONG_LETTERS[pair.songBIndex]}
                      </span>
                    </div>
                    <span className={`text-[10px] truncate ml-1 ${
                      isComplete ? 'text-green-400' : isCurrent ? 'text-white font-medium' : 'text-gray-500'
                    }`}>
                      {pair.directCut ? 'Cut' : pair.selectedTemplate?.name || 'Template'}
                    </span>
                  </div>

                  <div className="flex-shrink-0">
                    {pair.directCut ? (
                      <Scissors size={10} className={isComplete ? 'text-green-400' : 'text-gray-500'} />
                    ) : (
                      <Sparkles size={10} className={isComplete ? 'text-green-400' : isCurrent ? 'text-cyan-400' : 'text-gray-600'} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowCancelConfirm(true)}
            className="mt-6 px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 hidden md:block">
            <h2 className="text-2xl font-bold text-white mb-1">{mashUpName}</h2>
            <p className="text-gray-400 text-sm">Creating your mash ups...</p>
          </div>

          <div className="hidden md:block bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="w-full h-48 bg-gray-900 rounded-lg mb-5 overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                src="https://yuotfcbbzrsdpxohoiks.supabase.co/storage/v1/object/sign/Video/Loading%20Screen%20Video%20MySoundsAI.mov?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTc4YWI4OS1mMWQ5LTRkNWUtYWYyNS1lYjAyZDY0ZGQwNTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlby9Mb2FkaW5nIFNjcmVlbiBWaWRlbyBNeVNvdW5kc0FJLm1vdiIsImlhdCI6MTc3MDY3MDE5MiwiZXhwIjoxODAyMjA2MTkyfQ.-az3CuvQfC3POO2fTVSafphZTJ5eeauVvBg5K6bxUm4"
              />
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">{currentMessage}</span>
                <span className="text-sm font-medium text-white">{Math.round(totalProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {pairs.map((pair, index) => {
                const isComplete = index < completedBlends.length;
                const isCurrent = index === currentPairIndex && !error;
                const colorsA = SONG_COLORS[pair.songAIndex % SONG_COLORS.length];
                const colorsB = SONG_COLORS[pair.songBIndex % SONG_COLORS.length];

                return (
                  <div
                    key={pair.transitionId}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                      isCurrent ? 'bg-teal-500/10 border border-teal-500/20' : 'border border-transparent'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete
                        ? 'bg-green-500/20 text-green-400'
                        : isCurrent
                        ? 'bg-teal-500/20 text-teal-400'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isComplete ? (
                        <CheckCircle size={14} />
                      ) : isCurrent ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <span className="text-[10px] font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${colorsA.bg}`}>
                        <span className="text-white font-bold text-[9px]">
                          {SONG_LETTERS[pair.songAIndex]}
                        </span>
                      </div>
                      <ArrowRight size={10} className="text-gray-600 flex-shrink-0" />
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${colorsB.bg}`}>
                        <span className="text-white font-bold text-[9px]">
                          {SONG_LETTERS[pair.songBIndex]}
                        </span>
                      </div>
                      <span className={`text-xs truncate ml-1 ${
                        isComplete ? 'text-green-400' : isCurrent ? 'text-white font-medium' : 'text-gray-500'
                      }`}>
                        {pair.directCut ? 'Direct Cut' : pair.selectedTemplate?.name || 'Template'}
                      </span>
                    </div>

                    <div className="flex-shrink-0">
                      {pair.directCut ? (
                        <Scissors size={12} className={isComplete ? 'text-green-400' : 'text-gray-500'} />
                      ) : (
                        <Sparkles size={12} className={isComplete ? 'text-green-400' : isCurrent ? 'text-cyan-400' : 'text-gray-600'} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center hidden md:block">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Cancel Processing?</h3>
            <p className="text-gray-400 text-sm mb-6">
              {completedBlends.length > 0
                ? `${completedBlends.length} mash up${completedBlends.length !== 1 ? 's' : ''} already completed. Cancel remaining?`
                : 'Are you sure? Your progress will be lost.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={() => {
                  cancelledRef.current = true;
                  if (completedBlends.length > 0) {
                    onComplete(completedBlends);
                  } else {
                    onBack();
                  }
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MashUpProcessingStep;
