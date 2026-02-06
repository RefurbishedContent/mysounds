import React, { useEffect, useState } from 'react';
import { CheckCircle, RefreshCw, Library, Clock, FileAudio, Database } from 'lucide-react';
import { BlendData } from '../../lib/blendExportService';

interface BlenderCompletionScreenProps {
  blend: BlendData;
  onCreateAnother: () => void;
  onGoToLibrary: () => void;
}

const BlenderCompletionScreen: React.FC<BlenderCompletionScreenProps> = ({
  blend,
  onCreateAnother,
  onGoToLibrary
}) => {
  const [showCelebration, setShowCelebration] = useState(true);

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur-3xl opacity-30 animate-pulse" />
            <CheckCircle className="w-24 h-24 text-teal-400 relative z-10 animate-bounce" />
          </div>
        </div>
      )}

      <div className="max-w-xl w-full bg-gray-800 border-2 border-teal-500/30 rounded-xl shadow-2xl shadow-teal-500/20 relative my-4">
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/50">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Blend Complete!</h2>
            <p className="text-sm text-gray-400">Your audio blend has been saved to your library</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-teal-500/30 flex-shrink-0">
                <FileAudio className="w-6 h-6 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white mb-1 line-clamp-2">{blend.name}</h3>
                <p className="text-xs text-gray-400">
                  {blend.templateName && (
                    <span className="inline-block mr-2">Template: {blend.templateName}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-gray-900/70 rounded-lg p-2.5">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Duration</span>
                </div>
                <p className="text-base font-bold text-white">{formatTime(blend.duration)}</p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-2.5">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Database className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">File Size</span>
                </div>
                <p className="text-base font-bold text-white">
                  {blend.fileSize ? formatFileSize(blend.fileSize) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-2.5">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <FileAudio className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Format</span>
                </div>
                <p className="text-base font-bold text-white">{blend.format.toUpperCase()}</p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-2.5">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Database className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Quality</span>
                </div>
                <p className="text-base font-bold text-white capitalize">{blend.quality}</p>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Song A Contribution</span>
                <span className="text-white font-medium">
                  {formatTime(blend.songADurationContribution)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-400">Transition Duration</span>
                <span className="text-white font-medium">
                  {formatTime(blend.transitionDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-400">Song B Contribution</span>
                <span className="text-white font-medium">
                  {formatTime(blend.songBDurationContribution)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={onGoToLibrary}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg py-3 px-4 hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              <div className="relative flex items-center justify-center space-x-2.5">
                <Library className="w-4 h-4" />
                <span className="font-bold text-base">View Blend in Library</span>
              </div>
            </button>

            <button
              onClick={onCreateAnother}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg py-3 px-4 hover:bg-gray-600 hover:border-gray-500 transition-all"
            >
              <div className="flex items-center justify-center space-x-2.5">
                <RefreshCw className="w-4 h-4 text-gray-300" />
                <span className="font-bold text-base">Start Another Blend</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlenderCompletionScreen;
