import React, { useState, useEffect } from 'react';
import { ArrowLeft, Music, Zap, Clock, FileAudio, ArrowRight } from 'lucide-react';
import { TransitionData } from '../../lib/transitionsService';
import { storageService } from '../../lib/storage';

interface BlenderVisualizationScreenProps {
  transition: TransitionData;
  onStartBlending: () => void;
  onBack: () => void;
}

const BlenderVisualizationScreen: React.FC<BlenderVisualizationScreenProps> = ({
  transition,
  onStartBlending,
  onBack
}) => {
  const [songAName, setSongAName] = useState<string>('Loading...');
  const [songBName, setSongBName] = useState<string>('Loading...');
  const [songADuration, setSongADuration] = useState<number>(0);
  const [songBDuration, setSongBDuration] = useState<number>(0);

  useEffect(() => {
    loadSongDetails();
  }, [transition]);

  const loadSongDetails = async () => {
    try {
      const [songA, songB] = await Promise.all([
        storageService.getUpload(transition.songAId),
        storageService.getUpload(transition.songBId)
      ]);

      if (songA) {
        setSongAName(songA.originalName);
        setSongADuration(songA.analysis?.duration || 0);
      }
      if (songB) {
        setSongBName(songB.originalName);
        setSongBDuration(songB.analysis?.duration || 0);
      }
    } catch (error) {
      console.error('Failed to load song details:', error);
    }
  };

  const songAContribution = transition.songAMarkerPoint || 0;
  const songBContribution = songBDuration - (transition.songBMarkerPoint || 0);
  const transitionDuration = transition.transitionDuration;
  const totalDuration = songAContribution + transitionDuration + songBContribution;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-600/10 p-3 md:p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to Selection</span>
          </button>
          <h2 className="text-xl font-bold text-white mb-1">{transition.name}</h2>
          <p className="text-sm text-gray-400">Preview your blend configuration</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-sm text-gray-400">Total Blend Duration</p>
                    <p className="text-2xl font-bold text-white">{formatTime(totalDuration)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileAudio className="w-5 h-5 text-cyan-500" />
                  <div>
                    <p className="text-sm text-gray-400">Output Format</p>
                    <p className="text-lg font-medium text-white">WAV</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">Song A</h3>
                    <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-teal-400" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full h-20 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 border border-gray-600">
                      <Music className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-white font-medium text-sm line-clamp-2 mb-1">{songAName}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration Used</span>
                      <span className="text-white font-medium">{formatTime(songAContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Marker Point</span>
                      <span className="text-white font-medium">{formatTime(transition.songAMarkerPoint || 0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <div className="flex items-center space-x-1 text-xs text-teal-400">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-5 relative overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 animate-pulse" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300">Transition</h3>
                    <div className="w-8 h-8 bg-cyan-500/30 rounded-full flex items-center justify-center animate-pulse">
                      <Zap className="w-4 h-4 text-cyan-300" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full h-20 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mb-3 border border-cyan-500/30">
                      <Zap className="w-10 h-10 text-cyan-400" />
                    </div>
                    <p className="text-white font-medium text-sm mb-1">
                      {transition.metadata?.templateName || 'Custom Transition'}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration</span>
                      <span className="text-white font-medium">{formatTime(transitionDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Type</span>
                      <span className="text-white font-medium">
                        {transition.metadata?.templateType || 'Crossfade'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-cyan-500/30">
                    <div className="flex items-center space-x-1 text-xs text-cyan-300">
                      <ArrowRight className="w-3 h-3 animate-pulse" />
                      <span>Blending Zone</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">Song B</h3>
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full h-20 bg-gray-700/50 rounded-lg flex items-center justify-center mb-3 border border-gray-600">
                      <Music className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-white font-medium text-sm line-clamp-2 mb-1">{songBName}</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration Used</span>
                      <span className="text-white font-medium">{formatTime(songBContribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Marker Point</span>
                      <span className="text-white font-medium">{formatTime(transition.songBMarkerPoint || 0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <div className="flex items-center space-x-1 text-xs text-blue-400">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-3 flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-teal-500" />
                Audio Flow Preview
              </h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="flex-1 h-2 bg-teal-500/30 rounded-full" />
                <ArrowRight className="w-4 h-4 text-teal-500" />
                <div className="flex-1 h-2 bg-gradient-to-r from-teal-500/30 via-cyan-500/30 to-blue-500/30 rounded-full animate-pulse" />
                <ArrowRight className="w-4 h-4 text-blue-500" />
                <div className="flex-1 h-2 bg-blue-500/30 rounded-full" />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>Song A Start</span>
                <span>Transition</span>
                <span>Song B End</span>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onStartBlending}
                className="group relative px-12 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
                <span className="relative flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Create Blend</span>
                </span>
              </button>
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Estimated processing time: ~{Math.ceil(totalDuration / 10)} seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlenderVisualizationScreen;
