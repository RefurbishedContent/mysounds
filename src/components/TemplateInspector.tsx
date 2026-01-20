import React, { useState } from 'react';
import { X, Settings, Play, Download, Info, ChevronDown, ChevronRight, Lightbulb, Clock, Music, Zap, Volume2 } from 'lucide-react';
import { Template, TemplatePlacement } from '../types';

interface TemplateInspectorProps {
  template: Template;
  placement: TemplatePlacement;
  onClose: () => void;
  onUpdatePlacement: (placement: TemplatePlacement) => void;
  onRemovePlacement: () => void;
  showTips?: boolean;
}

const TemplateInspector: React.FC<TemplateInspectorProps> = ({
  template,
  placement,
  onClose,
  onUpdatePlacement,
  onRemovePlacement,
  showTips = true
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['parameters']));
  const [parameters, setParameters] = useState(placement.parameterOverrides || {});
  const [showTemplateTips, setShowTemplateTips] = useState(showTips);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateParameter = (key: string, value: any) => {
    const newParameters = { ...parameters, [key]: value };
    setParameters(newParameters);
    
    const updatedPlacement: TemplatePlacement = {
      ...placement,
      parameterOverrides: newParameters
    };
    onUpdatePlacement(updatedPlacement);
  };

  const renderParameterControl = (key: string, schema: any) => {
    const currentValue = parameters[key] ?? schema.default;

    switch (schema.type) {
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">{schema.label}</label>
              <span className="text-sm text-gray-400">{currentValue}</span>
            </div>
            <input
              type="range"
              min={schema.min || 0}
              max={schema.max || 100}
              step={schema.step || 1}
              value={currentValue}
              onChange={(e) => updateParameter(key, Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-300">{schema.label}</span>
                {schema.description && (
                  <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                )}
              </div>
              <button
                onClick={() => updateParameter(key, !currentValue)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                  ${currentValue ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-600'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                    ${currentValue ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </label>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{schema.label}</label>
            <select
              value={currentValue}
              onChange={(e) => updateParameter(key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              {schema.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{schema.label}</label>
            <input
              type="text"
              value={currentValue}
              onChange={(e) => updateParameter(key, e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
            {schema.description && (
              <p className="text-xs text-gray-500">{schema.description}</p>
            )}
          </div>
        );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get template-specific tips
  const getTemplateTips = () => {
    const tips = [];
    
    // Category-specific tips
    switch (template.category) {
      case 'house':
      case 'electronic':
        tips.push({
          icon: Clock,
          title: 'Crossfade Timing',
          tip: 'For house music, 16-32 second crossfades work best. Start the transition during a breakdown or before a drop.'
        });
        tips.push({
          icon: Music,
          title: 'Key Matching',
          tip: 'Enable harmonic mixing for smoother transitions. Compatible keys create more musical blends.'
        });
        break;
      case 'hip-hop':
        tips.push({
          icon: Zap,
          title: 'Scratch Timing',
          tip: 'Place scratches at the end of verses or during instrumental breaks for maximum impact.'
        });
        tips.push({
          icon: Volume2,
          title: 'Volume Control',
          tip: 'Keep scratch intensity moderate (60-80%) to maintain clarity while adding excitement.'
        });
        break;
      case 'techno':
        tips.push({
          icon: Zap,
          title: 'Hard Cuts',
          tip: 'Techno cuts work best on the downbeat. Use the beat grid to align perfectly with the kick drum.'
        });
        tips.push({
          icon: Settings,
          title: 'Filter Sweeps',
          tip: 'High-pass filter sweeps create tension. Start at 200Hz and sweep up to 2kHz over 8-16 beats.'
        });
        break;
      case 'trance':
        tips.push({
          icon: Clock,
          title: 'Long Builds',
          tip: 'Trance transitions should be 32-64 seconds. Build energy gradually for emotional impact.'
        });
        tips.push({
          icon: Music,
          title: 'Breakdown Timing',
          tip: 'Start transitions during breakdowns when percussion drops out for smoother blending.'
        });
        break;
      case 'ambient':
        tips.push({
          icon: Clock,
          title: 'Natural Flow',
          tip: 'Ambient transitions should feel organic. Use 60-120 second crossfades for seamless evolution.'
        });
        tips.push({
          icon: Volume2,
          title: 'Gentle Blending',
          tip: 'Keep volume changes subtle. Ambient music benefits from very gradual level adjustments.'
        });
        break;
    }
    
    // Difficulty-specific tips
    if (template.difficulty === 'beginner') {
      tips.push({
        icon: Lightbulb,
        title: 'Beginner Tip',
        tip: 'Start with default settings and make small adjustments. Listen to the preview after each change.'
      });
    } else if (template.difficulty === 'advanced') {
      tips.push({
        icon: Settings,
        title: 'Advanced Technique',
        tip: 'Experiment with automation curves and multiple parameter changes for complex, professional transitions.'
      });
    }
    
    return tips;
  };

  const templateTips = getTemplateTips();

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Template Inspector</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-white">{template.name}</h4>
          <p className="text-sm text-gray-400">{template.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>by {template.author}</span>
            <span>{template.duration}s</span>
            <span className="capitalize">{template.difficulty}</span>
          </div>
        </div>
      </div>

      {/* Template Tips */}
      {showTemplateTips && templateTips.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white flex items-center space-x-2">
              <Lightbulb size={16} className="text-yellow-400" />
              <span>Pro Tips</span>
            </h4>
            <button
              onClick={() => setShowTemplateTips(false)}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {templateTips.slice(0, 2).map((tip, index) => {
              const TipIcon = tip.icon;
              return (
                <div key={index} className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <TipIcon size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-yellow-200 font-medium text-sm mb-1">{tip.title}</h5>
                      <p className="text-yellow-100/80 text-xs leading-relaxed">{tip.tip}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Placement Info */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={() => toggleSection('placement')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-white">Placement</h4>
            {expandedSections.has('placement') ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
          
          {expandedSections.has('placement') && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Start Time</span>
                  <div className="text-white font-mono">{formatTime(placement.startTime)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Duration</span>
                  <div className="text-white font-mono">{template.duration}s</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-gray-400 text-sm">Track A Region</span>
                <div className="text-white text-sm font-mono">
                  {formatTime(placement.trackARegion.start)} - {formatTime(placement.trackARegion.end)}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="text-gray-400 text-sm">Track B Region</span>
                <div className="text-white text-sm font-mono">
                  {formatTime(placement.trackBRegion.start)} - {formatTime(placement.trackBRegion.end)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Parameters */}
        {template.parameterSchema && Object.keys(template.parameterSchema).length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => toggleSection('parameters')}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <h4 className="font-medium text-white">Parameters</h4>
              {expandedSections.has('parameters') ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('parameters') && (
              <div className="space-y-4">
                {Object.entries(template.parameterSchema).map(([key, schema]) => (
                  <div key={key}>
                    {renderParameterControl(key, schema)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transitions */}
        {template.transitions && template.transitions.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => toggleSection('transitions')}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <h4 className="font-medium text-white">Transitions</h4>
              {expandedSections.has('transitions') ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('transitions') && (
              <div className="space-y-3">
                {template.transitions.map((transition, index) => (
                  <div key={transition.id} className="p-3 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white capitalize">
                        {transition.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(transition.startTime)} ({transition.duration}s)
                      </span>
                    </div>
                    {transition.parameters && (
                      <div className="text-xs text-gray-500">
                        {Object.keys(transition.parameters).length} parameters
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requirements */}
        {template.requirements && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('requirements')}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <h4 className="font-medium text-white">Requirements</h4>
              {expandedSections.has('requirements') ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('requirements') && (
              <div className="space-y-2 text-sm">
                {template.requirements.minDuration && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min Duration</span>
                    <span className="text-white">{formatTime(template.requirements.minDuration)}</span>
                  </div>
                )}
                {template.requirements.bpmRange && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">BPM Range</span>
                    <span className="text-white">
                      {template.requirements.bpmRange[0]} - {template.requirements.bpmRange[1]}
                    </span>
                  </div>
                )}
                {template.requirements.genreRecommendations && (
                  <div>
                    <span className="text-gray-400">Genres</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.requirements.genreRecommendations.map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-1 bg-gray-700 text-white text-xs rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
          <Play size={16} />
          <span>Preview</span>
        </button>
        
        <div className="flex space-x-2">
          <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
            <Settings size={14} />
            <span>Reset</span>
          </button>
          <button
            onClick={onRemovePlacement}
            className="flex-1 px-3 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded-lg font-medium transition-all duration-200"
          >
            Remove
          </button>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default TemplateInspector;