import React, { useState, useEffect, useRef } from 'react';
import { Loader, Zap, Music, Layers, CheckCircle, X } from 'lucide-react';
import { TransitionData } from '../../lib/transitionsService';
import { BlendData, blendExportService, ExportProgress } from '../../lib/blendExportService';
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
  { key: 'blending', label: 'Mashing up audio streams', icon: Zap },
  { key: 'finalizing', label: 'Finalizing mash up', icon: CheckCircle },
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

  const hasStartedRef = useRef(false);
  const cleanupFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (user && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startBlending();
    }

    return () => {
      if (cleanupFnRef.current) {
        cleanupFnRef.current();
        cleanupFnRef.current = null;
      }
    };
  }, [user]);

  const startBlending = async () => {
    if (!user) return;

    // Reset error state
    setError(null);
    setProgress(0);
    setCurrentStageIndex(0);
    setMessage('Initializing...');

    try {
      const blend = await blendExportService.createBlend(
        user.id,
        {
          transitionId: transition.id,
          format: 'wav',
          quality: 'standard'
        },
        (progressUpdate: ExportProgress) => {
          setMessage(progressUpdate.message);
          setProgress(progressUpdate.progress);

          if (progressUpdate.progress >= 0 && progressUpdate.progress < 20) {
            setCurrentStageIndex(0);
          } else if (progressUpdate.progress >= 20 && progressUpdate.progress < 30) {
            setCurrentStageIndex(1);
          } else if (progressUpdate.progress >= 30 && progressUpdate.progress < 40) {
            setCurrentStageIndex(2);
          } else if (progressUpdate.progress >= 40 && progressUpdate.progress < 60) {
            setCurrentStageIndex(3);
          } else if (progressUpdate.progress >= 60 && progressUpdate.progress < 70) {
            setCurrentStageIndex(4);
          } else if (progressUpdate.progress >= 70 && progressUpdate.progress < 85) {
            setCurrentStageIndex(5);
          } else if (progressUpdate.progress >= 85 && progressUpdate.progress < 95) {
            setCurrentStageIndex(6);
          } else {
            setCurrentStageIndex(7);
          }
        }
      );

      // Subscribe to blend updates immediately
      subscribeToBlendUpdates(blend.id);
    } catch (err) {
      console.error('Blending failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create mash up');
    }
  };

  const subscribeToBlendUpdates = async (blendId: string) => {
    console.log('[BlenderProcessing] Subscribing to blend updates:', blendId);

    let progressInterval: NodeJS.Timeout | null = null;
    let hasCompleted = false;

    const handleCompletion = (updatedBlend: BlendData) => {
      if (hasCompleted) return;
      hasCompleted = true;

      console.log('[BlenderProcessing] Blend completed successfully');

      // Clear the progress interval immediately
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      subscription.unsubscribe();

      // Clean up the cleanup function
      cleanupFnRef.current = null;

      setProgress(100);
      setCurrentStageIndex(7);
      setMessage('Mash up created successfully!');

      setTimeout(() => {
        onComplete(updatedBlend);
      }, 500);
    };

    const handleFailure = (updatedBlend: BlendData) => {
      if (hasCompleted) return;
      hasCompleted = true;

      console.error('[BlenderProcessing] Blend failed:', updatedBlend.exportSettings);

      // Clear the progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      subscription.unsubscribe();
      cleanupFnRef.current = null;

      const errorMsg = updatedBlend.exportSettings?.error || 'Mash up processing failed on the server';
      setError(errorMsg);
    };

    const subscription = blendExportService.subscribeToBlendUpdates(
      blendId,
      (updatedBlend) => {
        console.log('[BlenderProcessing] Blend update received:', {
          status: updatedBlend.status,
          blendId: updatedBlend.id
        });

        if (updatedBlend.status === 'completed') {
          handleCompletion(updatedBlend);
        } else if (updatedBlend.status === 'failed') {
          handleFailure(updatedBlend);
        }
      }
    );

    let simulatedProgress = 40;
    progressInterval = setInterval(() => {
      if (simulatedProgress < 90) {
        simulatedProgress += Math.random() * 5;
        setProgress(Math.min(simulatedProgress, 90));

        if (simulatedProgress >= 40 && simulatedProgress < 55) {
          setCurrentStageIndex(3);
          setMessage('Processing transition effects...');
        } else if (simulatedProgress >= 55 && simulatedProgress < 65) {
          setCurrentStageIndex(4);
          setMessage('Loading Song B segment...');
        } else if (simulatedProgress >= 65 && simulatedProgress < 80) {
          setCurrentStageIndex(5);
          setMessage('Mashing up audio streams...');
        } else if (simulatedProgress >= 80) {
          setCurrentStageIndex(6);
          setMessage('Finalizing mash up...');
        }
      }
    }, 800);

    // Store the cleanup function
    cleanupFnRef.current = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      subscription.unsubscribe();
    };

    // Check if blend is already completed (in case the update happened before subscription)
    try {
      const currentBlend = await blendExportService.getBlend(blendId);
      if (currentBlend) {
        console.log('[BlenderProcessing] Checking current blend status:', currentBlend.status);
        if (currentBlend.status === 'completed') {
          handleCompletion(currentBlend);
        } else if (currentBlend.status === 'failed') {
          handleFailure(currentBlend);
        }
      }
    } catch (err) {
      console.error('[BlenderProcessing] Failed to check blend status:', err);
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
              onClick={() => {
                hasStartedRef.current = false;
                startBlending();
              }}
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
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Creating Your Mash Up</h2>
            <p className="text-gray-300 text-sm">Please wait while we process your audio...</p>
          </div>

          <div className="w-full max-w-xs mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">{message}</span>
              <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="w-full max-w-xs space-y-1.5">
            {processingStages.map((stage, index) => {
              const Icon = stage.icon;
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;

              return (
                <div
                  key={stage.key}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-all ${
                    isCurrent ? 'bg-teal-500/20 backdrop-blur-sm' : ''
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete
                        ? 'bg-green-500/30 text-green-400'
                        : isCurrent
                        ? 'bg-teal-500/30 text-teal-400'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle size={12} />
                    ) : isCurrent ? (
                      <Loader size={12} className="animate-spin" />
                    ) : (
                      <Icon size={12} />
                    )}
                  </div>
                  <span
                    className={`text-xs ${
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

          <button
            onClick={handleCancel}
            className="mt-6 px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8 hidden md:block">
            <h2 className="text-2xl font-bold text-white mb-2">Creating Your Mash Up</h2>
            <p className="text-gray-400">Please wait while we process your audio...</p>
          </div>

          <div className="hidden md:block bg-gray-800 border border-gray-700 rounded-lg p-8 mb-6">
            <div className="w-full h-64 bg-gray-900 rounded-lg mb-6 overflow-hidden">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                src="https://yuotfcbbzrsdpxohoiks.supabase.co/storage/v1/object/sign/Video/Loading%20Screen%20Video%20MySoundsAI.mov?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jYTc4YWI4OS1mMWQ5LTRkNWUtYWYyNS1lYjAyZDY0ZGQwNTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlby9Mb2FkaW5nIFNjcmVlbiBWaWRlbyBNeVNvdW5kc0FJLm1vdiIsImlhdCI6MTc3MDY3MDE5MiwiZXhwIjoxODAyMjA2MTkyfQ.-az3CuvQfC3POO2fTVSafphZTJ5eeauVvBg5K6bxUm4"
              />
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

          <div className="text-center hidden md:block">
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
            <h3 className="text-lg font-bold text-white mb-2">Cancel Mash Up?</h3>
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
                Cancel Mash Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlenderProcessingScreen;
