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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur-3xl opacity-30 animate-pulse" />
            <CheckCircle className="w-32 h-32 text-teal-400 relative z-10 animate-bounce" />
          </div>
        </div>
      )}

      <div className="max-w-2xl w-full bg-gray-800 border-2 border-teal-500/30 rounded-xl shadow-2xl shadow-teal-500/20 relative">
        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/50">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Blend Complete!</h2>
            <p className="text-gray-400">Your audio blend has been saved to your library</p>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-6">
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
              <div className="bg-gray-900/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Duration</span>
                </div>
                <p className="text-lg font-bold text-white">{formatTime(blend.duration)}</p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">File Size</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {blend.fileSize ? formatFileSize(blend.fileSize) : 'N/A'}
                </p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <FileAudio className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Format</span>
                </div>
                <p className="text-lg font-bold text-white">{blend.format.toUpperCase()}</p>
              </div>
              <div className="bg-gray-900/70 rounded-lg p-3">
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

          <div className="space-y-3">
            <button
              onClick={onGoToLibrary}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg p-4 hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              <div className="relative flex items-center justify-center space-x-3">
                <Library className="w-5 h-5" />
                <span className="font-bold text-lg">View Blend in Library</span>
              </div>
            </button>

            <button
              onClick={onCreateAnother}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-4 hover:bg-gray-600 hover:border-gray-500 transition-all"
            >
              <div className="flex items-center justify-center space-x-3">
                <RefreshCw className="w-5 h-5 text-gray-300" />
                <span className="font-bold text-lg">Start Another Blend</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlenderCompletionScreen;
