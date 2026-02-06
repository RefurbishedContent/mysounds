import React, { useState, useEffect } from 'react';
import { Loader, Zap, Music, Layers, CheckCircle, X } from 'lucide-react';
import { TransitionData } from '../../lib/transitionsService';
import { BlendData } from '../../lib/blendExportService';
import { createMockBlend } from '../../lib/mockDataService';
import { useAuth } from '../../contexts/AuthContext';

interface BlenderProcessingScreenProps {
  transition: TransitionData;
  onComplete: (blend: BlendData) => void;
  onBack: () => void;
}

const processingStages = [
  { key: 'initializing', label: 'Preparing audio files', icon: Music },
  { key: 'loading-a', label: 'Loading Song A segment', icon: Music },
  { key: 'loading-template', label: 'Loading transition template', icon: Layers },
  { key: 'processing-transition', label: 'Processing transition effects', icon: Zap },
  { key: 'loading-b', label: 'Loading Song B segment', icon: Music },
  { key: 'blending', label: 'Blending audio streams', icon: Zap },
  { key: 'finalizing', label: 'Finalizing blend', icon: CheckCircle },
  { key: 'saving', label: 'Saving to library', icon: CheckCircle }
];

const BlenderProcessingScreen: React.FC<BlenderProcessingScreenProps> = ({
  transition,
  onComplete,
  onBack
}) => {
  const { user } = useAuth();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      startBlending();
    }
  }, [user]);

  const startBlending = async () => {
    if (!user) return;

    try {
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        if (simulatedProgress < 100) {
          simulatedProgress += Math.random() * 8 + 5;
          const actualProgress = Math.min(simulatedProgress, 100);
          setProgress(actualProgress);

          if (actualProgress >= 0 && actualProgress < 15) {
            setCurrentStageIndex(0);
            setMessage('Preparing audio files...');
          } else if (actualProgress >= 15 && actualProgress < 25) {
            setCurrentStageIndex(1);
            setMessage('Loading Song A segment...');
          } else if (actualProgress >= 25 && actualProgress < 35) {
            setCurrentStageIndex(2);
            setMessage('Loading transition template...');
          } else if (actualProgress >= 35 && actualProgress < 55) {
            setCurrentStageIndex(3);
            setMessage('Processing transition effects...');
          } else if (actualProgress >= 55 && actualProgress < 65) {
            setCurrentStageIndex(4);
            setMessage('Loading Song B segment...');
          } else if (actualProgress >= 65 && actualProgress < 85) {
            setCurrentStageIndex(5);
            setMessage('Blending audio streams...');
          } else if (actualProgress >= 85 && actualProgress < 95) {
            setCurrentStageIndex(6);
            setMessage('Finalizing blend...');
          } else if (actualProgress >= 95) {
            setCurrentStageIndex(7);
            setMessage('Saving to library...');
          }
        } else {
          clearInterval(progressInterval);

          createMockBlend(transition.id)
            .then((blend) => {
              setProgress(100);
              setTimeout(() => {
                onComplete(blend as any);
              }, 500);
            })
            .catch((err) => {
              console.error('Blending failed:', err);
              setError(err instanceof Error ? err.message : 'Failed to create blend');
            });
        }
      }, 200);
    } catch (err) {
      console.error('Blending failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create blend');
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    onBack();
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md w-full bg-gray-800 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Processing Failed</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={startBlending}
              className="flex-1 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Creating Your Blend</h2>
            <p className="text-gray-400">Please wait while we process your audio...</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 mb-6">
            <div className="w-full h-64 bg-gray-900 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-gray-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 animate-pulse" />

              <div className="relative z-10 text-center">
                <div className="mb-4">
                  <Loader className="w-16 h-16 text-teal-500 animate-spin mx-auto" />
                </div>
                <p className="text-gray-400 text-sm mb-2">Animation Placeholder</p>
                <p className="text-gray-500 text-xs">Energy particle mixing animation will appear here</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">{message}</span>
                <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {processingStages.map((stage, index) => {
                const Icon = stage.icon;
                const isComplete = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                return (
                  <div
                    key={stage.key}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${
                      isCurrent ? 'bg-teal-500/10' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? 'bg-green-500/20 text-green-400'
                          : isCurrent
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle size={16} />
                      ) : isCurrent ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isComplete
                          ? 'text-green-400'
                          : isCurrent
                          ? 'text-white font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Cancel Blending?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to cancel? Your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel Blend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlenderProcessingScreen;
