import React, { useEffect, useState } from 'react';
import { CheckCircle, Sliders, RefreshCw, Library, Share2, Clock, FileAudio, Database } from 'lucide-react';
import { BlendData } from '../../lib/blendExportService';

interface BlenderCompletionScreenProps {
  blend: BlendData;
  onCreateAnother: () => void;
  onGoToMixer: () => void;
  onGoToLibrary: () => void;
}

const BlenderCompletionScreen: React.FC<BlenderCompletionScreenProps> = ({
  blend,
  onCreateAnother,
  onGoToMixer,
  onGoToLibrary
}) => {
  const [showCelebration, setShowCelebration] = useState(true);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onGoToLibrary();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCelebration(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur-3xl opacity-50 animate-pulse" />
            <CheckCircle className="w-32 h-32 text-teal-400 relative z-10 animate-bounce" />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/50">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Blend Complete!</h2>
            <p className="text-gray-400">Your audio blend has been created successfully</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-teal-500/30 flex-shrink-0">
                <FileAudio className="w-8 h-8 text-teal-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{blend.name}</h3>
                <p className="text-sm text-gray-400">
                  {blend.templateName && (
                    <span className="inline-block mr-2">Template: {blend.templateName}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Duration</span>
                </div>
                <p className="text-lg font-bold text-white">{formatTime(blend.duration)}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">File Size</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {blend.fileSize ? formatFileSize(blend.fileSize) : 'Processing...'}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <FileAudio className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Format</span>
                </div>
                <p className="text-lg font-bold text-white">{blend.format.toUpperCase()}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Quality</span>
                </div>
                <p className="text-lg font-bold text-white capitalize">{blend.quality}</p>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Song A Contribution</span>
                <span className="text-white font-medium">
                  {formatTime(blend.songADurationContribution)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Transition Duration</span>
                <span className="text-white font-medium">
                  {formatTime(blend.transitionDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Song B Contribution</span>
                <span className="text-white font-medium">
                  {formatTime(blend.songBDurationContribution)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="text-white font-medium text-sm mb-2">What's Next?</h3>

            <button
              onClick={onGoToMixer}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg p-4 hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Continue to Mixer</p>
                    <p className="text-sm text-teal-100">Fine-tune your blend with advanced controls</p>
                  </div>
                </div>
                <div className="text-white">→</div>
              </div>
            </button>

            <button
              onClick={onCreateAnother}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-4 hover:bg-gray-750 hover:border-teal-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Create Another Blend</p>
                    <p className="text-sm text-gray-400">Start a new blending session</p>
                  </div>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-white font-medium text-sm mb-2">Quick Actions</h3>
            <div className="flex gap-3">
              <button
                onClick={onGoToLibrary}
                className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-750 hover:border-gray-600 transition-all flex items-center justify-center space-x-2"
              >
                <Library size={18} />
                <span className="text-sm font-medium">View in Library</span>
              </button>
              <button
                disabled
                className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Share2 size={18} />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Redirecting to library in <span className="font-bold text-teal-400">{countdown}</span> seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlenderCompletionScreen;
