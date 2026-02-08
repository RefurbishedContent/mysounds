import React, { useState, useEffect } from 'react';
import { X, Play, Square, Star, Crown, Clock, Zap, Music, TrendingUp, Award, Info, Volume2 } from 'lucide-react';
import { TemplateData } from '../lib/database';
import { audioPlayer } from '../lib/audioPlayer';
import TemplateIcon from './TemplateIcon';

interface TemplateDetailModalProps {
  template: TemplateData;
  onClose: () => void;
  onPreview?: (template: TemplateData) => void;
}

const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  template,
  onClose,
  onPreview
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const previewUrl = template.templateData?.previewUrl;

  // Check if this template's audio is currently playing
  useEffect(() => {
    const checkPlayingState = () => {
      const currentUrl = audioPlayer.getCurrentUrl();
      const playing = audioPlayer.isPlaying() && currentUrl === previewUrl;
      setIsPlaying(playing);
    };

    // Check initial state
    checkPlayingState();

    // Check periodically
    const interval = setInterval(checkPlayingState, 100);

    return () => {
      clearInterval(interval);
      // Stop audio when modal is closed
      if (audioPlayer.getCurrentUrl() === previewUrl) {
        audioPlayer.stop();
      }
    };
  }, [previewUrl]);

  const getDifficultyColor = (difficulty: TemplateData['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-900/30 border-green-500/30';
      case 'intermediate': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      case 'advanced': return 'text-red-400 bg-red-900/30 border-red-500/30';
      default: return 'text-gray-400 bg-gray-800/50 border-gray-600/30';
    }
  };

  const getBPMRange = (bpm: number): string => {
    if (bpm < 90) return 'Slow';
    if (bpm >= 90 && bpm < 120) return 'Moderate';
    if (bpm >= 120 && bpm < 140) return 'Fast';
    return 'Very Fast';
  };

  const getEnergyLevel = (energy: number): string => {
    if (energy < 0.3) return 'Chill';
    if (energy >= 0.3 && energy < 0.6) return 'Balanced';
    if (energy >= 0.6 && energy < 0.85) return 'Energetic';
    return 'Peak';
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(template);
    }
  };

  const avgBPM = Math.round((template.bpmMin + template.bpmMax) / 2);
  const avgEnergy = (template.energyMin + template.energyMax) / 2;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl border border-gray-600 shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 sm:px-5 sm:py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{template.name}</h2>
                {template.isPopular && (
                  <span className="flex-shrink-0 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full flex items-center justify-center w-5 h-5">
                    <Star size={10} fill="white" />
                  </span>
                )}
                {template.isPremium && (
                  <span className="flex-shrink-0 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-full flex items-center justify-center w-5 h-5">
                    <Crown size={10} fill="white" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>by <span className="text-cyan-400 font-medium">{template.author}</span></span>
                <span className="flex items-center gap-1">
                  <Star size={10} className="text-yellow-500" fill="currentColor" />
                  {template.rating}
                </span>
                <span>{template.downloads.toLocaleString()} dl</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-4">
          <div className="flex gap-3">
            <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden border border-cyan-500/20">
              <TemplateIcon category={template.category} name={template.name} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-3 line-clamp-3">{template.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock size={10} className="text-cyan-400" />
                    Duration
                  </div>
                  <div className="text-sm font-bold text-white">{template.duration}s</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <TrendingUp size={10} className="text-cyan-400" />
                    BPM
                  </div>
                  <div className="text-sm font-bold text-white">{avgBPM} <span className="text-[10px] text-gray-500 font-normal">{template.bpmMin}-{template.bpmMax}</span></div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Zap size={10} className="text-cyan-400" />
                    Energy
                  </div>
                  <div className="text-sm font-bold text-white">{getEnergyLevel(avgEnergy)}</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg px-2.5 py-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Award size={10} className="text-cyan-400" />
                    Level
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getDifficultyColor(template.difficulty)}`}>
                    {template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Music size={12} />
                Genre & Style
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-full text-xs font-medium">
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </span>
                {template.transitionStyle && (
                  <span className="px-2.5 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium">
                    {template.transitionStyle}
                  </span>
                )}
              </div>
            </div>

            {template.moodTags && template.moodTags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Info size={12} />
                  Mood Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.moodTags.map((mood, index) => (
                    <span key={index} className="px-2.5 py-1 bg-gray-700 border border-gray-600 text-gray-300 rounded-full text-xs">
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {template.technicalDescription && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Volume2 size={12} />
                  Technical Details
                </h3>
                <p className="text-gray-300 text-xs leading-relaxed bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  {template.technicalDescription}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-700">
            <button
              onClick={handlePreview}
              disabled={!previewUrl}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                !previewUrl
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30'
              }`}
            >
              {isPlaying ? (
                <Square size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span>{isPlaying ? 'Stop' : 'Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetailModal;
