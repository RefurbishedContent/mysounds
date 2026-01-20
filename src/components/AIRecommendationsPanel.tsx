import React, { useState } from 'react';
import { Sparkles, TrendingUp, Music, Zap, Target, Info, ChevronRight, X, Star, Crown } from 'lucide-react';
import { TemplateRecommendation } from '../lib/ai/aiService';
import TemplateIcon from './TemplateIcon';

interface AIRecommendationsPanelProps {
  recommendations: TemplateRecommendation[];
  onSelectTemplate: (templateId: string) => void;
  onClose?: () => void;
  isVisible?: boolean;
}

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  recommendations,
  onSelectTemplate,
  onClose,
  isVisible = true,
}) => {
  const [selectedRec, setSelectedRec] = useState<TemplateRecommendation | null>(null);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  if (!isVisible || recommendations.length === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400 bg-green-900/30';
    if (score >= 70) return 'text-blue-400 bg-blue-900/30';
    if (score >= 50) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-orange-400 bg-orange-900/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Moderate';
  };

  const toggleExpand = (recId: string) => {
    setExpandedRec(expandedRec === recId ? null : recId);
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
            <p className="text-gray-400 text-sm">{recommendations.length} templates matched</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const template = rec.template;
          if (!template) return null;

          const isExpanded = expandedRec === rec.id;
          const isBest = index === 0;

          return (
            <div
              key={rec.id}
              className={`
                relative bg-gray-800/50 rounded-xl border transition-all duration-200 overflow-hidden
                ${isBest ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-gray-700 hover:border-gray-600'}
              `}
            >
              {isBest && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" />
              )}

              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <TemplateIcon category={template.category} name={template.name} />
                    {template.isPremium && (
                      <div className="absolute top-1 right-1">
                        <Crown className="w-4 h-4 text-yellow-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-white font-semibold truncate">{template.name}</h4>
                          {isBest && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-full flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>Best Match</span>
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-1">{template.description}</p>
                      </div>

                      <div className={`ml-3 px-3 py-1 rounded-lg font-bold text-lg ${getScoreColor(rec.compatibilityScore)}`}>
                        {rec.compatibilityScore}%
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-sm mb-3">
                      <span className="text-gray-400">by {template.author}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 capitalize">{template.category}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">{template.duration}s</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">BPM</div>
                        <div className="text-sm font-semibold text-white">{rec.bpmScore}%</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">Key</div>
                        <div className="text-sm font-semibold text-white">{rec.keyScore}%</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">Genre</div>
                        <div className="text-sm font-semibold text-white">{rec.genreScore}%</div>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-gray-400 mb-1">Energy</div>
                        <div className="text-sm font-semibold text-white">{rec.energyScore}%</div>
                      </div>
                    </div>

                    {rec.reasoning && (
                      <button
                        onClick={() => toggleExpand(rec.id)}
                        className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 mb-3"
                      >
                        <Info className="w-4 h-4" />
                        <span>{isExpanded ? 'Hide' : 'Show'} details</span>
                      </button>
                    )}

                    {isExpanded && rec.reasoning && (
                      <div className="bg-gray-900/70 rounded-lg p-4 space-y-3 mb-3">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start space-x-2">
                            <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-400">BPM: </span>
                              <span className="text-white">{rec.reasoning.bpmMatch}</span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Music className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-400">Key: </span>
                              <span className="text-white">{rec.reasoning.keyMatch}</span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Target className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-400">Genre: </span>
                              <span className="text-white">{rec.reasoning.genreMatch}</span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-gray-400">Energy: </span>
                              <span className="text-white">{rec.reasoning.energyMatch}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-700">
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {rec.reasoning.recommendation}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => onSelectTemplate(rec.templateId)}
                      className={`
                        w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2
                        ${isBest
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }
                      `}
                    >
                      <span>Use This Template</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200 leading-relaxed">
          <p className="font-medium mb-1">About AI Matching</p>
          <p className="text-blue-300/80">
            Templates are ranked by analyzing BPM compatibility, harmonic key matching, genre similarity, and energy levels. Higher scores indicate better compatibility for smooth transitions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationsPanel;
