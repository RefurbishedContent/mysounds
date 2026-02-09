import React from 'react';
import { ArrowLeft, Music, Zap, Clock, FileAudio, ArrowRight, Sparkles } from 'lucide-react';
import { TransitionData } from '../../lib/transitionsService';
import { UploadResult } from '../../lib/storage';
import { TemplateData } from '../../lib/database';
import { useIsMobile } from '../../hooks/useIsMobile';

interface BlenderConfirmationScreenProps {
  transition: TransitionData;
  songA: UploadResult;
  songB: UploadResult;
  selectedTemplate: TemplateData | null;
  transitionDuration: number;
  onConfirm: () => void;
  onBack: () => void;
}

const BlenderConfirmationScreen: React.FC<BlenderConfirmationScreenProps> = ({
  transition,
  songA,
  songB,
  selectedTemplate,
  transitionDuration,
  onConfirm,
  onBack
}) => {
  const isMobile = useIsMobile();

  const songAContribution = transition.songAMarkerPoint || 0;
  const songBDuration = songB.metadata?.duration || 0;
  const songBContribution = songBDuration > 0
    ? songBDuration - (transition.songBMarkerPoint || 0)
    : (transition.songBClipEnd || 0) - (transition.songBMarkerPoint || 0);
  const totalDuration = songAContribution + transitionDuration + songBContribution;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-cyan-500/20 px-4 py-3 flex-shrink-0"
        style={{ boxShadow: '0 1px 20px rgba(6,182,212,0.1)' }}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Confirm Your Blend</h1>
            <p className="text-xs text-cyan-400/80">Review before creating</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="text-center mb-2">
              <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-1`}>
                {transition.name}
              </h2>
              <p className="text-sm text-gray-400">
                Here is a summary of your blend. Confirm to start processing.
              </p>
            </div>

            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4"
              style={{ boxShadow: '0 0 20px rgba(6,182,212,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-xs text-gray-400">Estimated Total Duration</p>
                    <p className="text-xl font-bold text-white">{formatTime(totalDuration)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileAudio className="w-5 h-5 text-cyan-500" />
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Output Format</p>
                    <p className="text-base font-medium text-white">WAV</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-400" />
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Song A</h3>
                  <div className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Music className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
                <p className="text-sm text-white font-medium line-clamp-2 mb-3">{songA.originalName}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="text-white font-medium">{formatTime(songAContribution)}</span>
                  </div>
                  {songA.analysis?.bpm && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">BPM</span>
                      <span className="text-cyan-400 font-medium">{Math.round(songA.analysis.bpm)}</span>
                    </div>
                  )}
                  {songA.analysis?.key && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Key</span>
                      <span className="text-white font-medium">{songA.analysis.key}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700/50">
                  <div className="flex items-center space-x-1 text-xs text-cyan-400">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    <span>Fade Out (Auto)</span>
                  </div>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden"
                style={{
                  border: '1px solid rgba(6,182,212,0.3)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.1)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-cyan-500/5" />
                <div className="relative bg-gray-800/80 p-4 h-full">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-medium text-gray-300 uppercase tracking-wider">Transition</h3>
                    <div className="w-7 h-7 bg-cyan-500/30 rounded-full flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-cyan-300" />
                    </div>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">
                    {selectedTemplate?.name || transition.metadata?.templateName || 'Custom'}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">Template</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration</span>
                      <span className="text-white font-medium">{formatTime(transitionDuration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Fade Curves</span>
                      <span className="text-white font-medium">Smooth (Auto)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-cyan-500/20">
                    <div className="flex items-center space-x-1 text-xs text-cyan-300">
                      <Sparkles className="w-3 h-3" />
                      <span>Blending Zone</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-green-500" />
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Song B</h3>
                  <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Music className="w-3.5 h-3.5 text-green-400" />
                  </div>
                </div>
                <p className="text-sm text-white font-medium line-clamp-2 mb-3">{songB.originalName}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="text-white font-medium">{formatTime(songBContribution)}</span>
                  </div>
                  {songB.analysis?.bpm && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">BPM</span>
                      <span className="text-green-400 font-medium">{Math.round(songB.analysis.bpm)}</span>
                    </div>
                  )}
                  {songB.analysis?.key && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Key</span>
                      <span className="text-white font-medium">{songB.analysis.key}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700/50">
                  <div className="flex items-center space-x-1 text-xs text-green-400">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <span>Fade In (Auto)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <h3 className="text-white font-medium text-sm mb-3 flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 text-teal-500" />
                Audio Flow
              </h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="flex-1 h-2 bg-cyan-500/30 rounded-full" />
                <ArrowRight className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-green-500/30 rounded-full" />
                <ArrowRight className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 h-2 bg-green-500/30 rounded-full" />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>Song A</span>
                <span>Transition</span>
                <span>Song B</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-t border-cyan-500/20"
        style={{
          paddingBottom: isMobile ? 'max(0.75rem, env(safe-area-inset-bottom))' : '0.75rem',
          boxShadow: '0 -4px 30px rgba(6,182,212,0.1)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center space-x-3">
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
            <span>Create Blend</span>
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-1 pb-1">
          Estimated processing time: ~{Math.ceil(totalDuration / 10)} seconds
        </p>
      </div>
    </div>
  );
};

export default BlenderConfirmationScreen;
