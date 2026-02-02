import React, { useState } from 'react';
import { X, Play, Star, Crown, Clock, Zap, Music, TrendingUp, Award, Info, Volume2 } from 'lucide-react';
import { TemplateData } from '../lib/database';
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
    setIsPlaying(!isPlaying);
    if (onPreview) {
      onPreview(template);
    }
  };

  const avgBPM = Math.round((template.bpmMin + template.bpmMax) / 2);
  const avgEnergy = (template.energyMin + template.energyMax) / 2;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{template.name}</h2>
                <div className="flex items-center gap-1.5">
                  {template.isPopular && (
                    <span className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 w-6 h-6">
                      <Star size={12} fill="white" />
                    </span>
                  )}
                  {template.isPremium && (
                    <span className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 w-6 h-6">
                      <Crown size={12} fill="white" />
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-3">{template.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  by <span className="text-cyan-400 font-medium">{template.author}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-500" fill="currentColor" />
                  {template.rating}
                </span>
                <span>{template.downloads.toLocaleString()} downloads</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <TemplateIcon category={template.category} name={template.name} />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-cyan-400" size={16} />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Duration</span>
                </div>
                <div className="text-2xl font-bold text-white">{template.duration}s</div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-cyan-400" size={16} />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">BPM</span>
                </div>
                <div className="text-2xl font-bold text-white">{avgBPM}</div>
                <div className="text-xs text-gray-400">{template.bpmMin}-{template.bpmMax}</div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-cyan-400" size={16} />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Energy</span>
                </div>
                <div className="text-lg font-bold text-white">{getEnergyLevel(avgEnergy)}</div>
                <div className="text-xs text-gray-400">{(template.energyMin * 100).toFixed(0)}%-{(template.energyMax * 100).toFixed(0)}%</div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-cyan-400" size={16} />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Difficulty</span>
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold border ${getDifficultyColor(template.difficulty)}`}>
                  {template.difficulty.charAt(0).toUpperCase() + template.difficulty.slice(1)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Music size={14} />
                Genre & Style
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-full text-sm font-medium">
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </span>
                {template.transitionStyle && (
                  <span className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-medium">
                    {template.transitionStyle}
                  </span>
                )}
              </div>
            </div>

            {template.moodTags && template.moodTags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Info size={14} />
                  Mood Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.moodTags.map((mood, index) => (
                    <span key={index} className="px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-300 rounded-full text-sm">
                      {mood}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {template.technicalDescription && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Volume2 size={14} />
                  Technical Details
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  {template.technicalDescription}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handlePreview}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isPlaying
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30'
              }`}
            >
              <Play size={18} fill={isPlaying ? 'none' : 'currentColor'} />
              <span>{isPlaying ? 'Stop Preview' : 'Preview Sound'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-200"
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
