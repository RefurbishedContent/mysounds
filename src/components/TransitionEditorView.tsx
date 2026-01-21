import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Save, Sparkles, Music, Zap, Clock, Timer, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { UploadResult } from '../lib/storage';
import { TemplateData, databaseService } from '../lib/database';
import { transitionsService, TransitionData } from '../lib/transitionsService';
import { useAuth } from '../contexts/AuthContext';
import TemplateGallery from './TemplateGallery';
import AIPowerButton from './AIPowerButton';
import AIRecommendationsPanel from './AIRecommendationsPanel';
import { TemplateRecommendation } from '../lib/ai/aiService';
import { WaveformDisplay } from './WaveformDisplay';
import BlendExportDialog from './BlendExportDialog';

interface TransitionEditorViewProps {
  songA: UploadResult;
  songB: UploadResult;
  transitionId: string;
  onBack: () => void;
  onSave: () => void;
}

type DurationSize = 'short' | 'medium' | 'long';

const DURATION_RANGES = {
  short: { min: 4, max: 8, default: 6 },
  medium: { min: 8, max: 15, default: 12 },
  long: { min: 16, max: 25, default: 20 }
};

const getDurationSizeFromValue = (duration: number): DurationSize => {
  if (duration >= 4 && duration <= 8) return 'short';
  if (duration > 8 && duration <= 15) return 'medium';
  return 'long';
};

const getDurationForSize = (size: DurationSize): number => {
  return DURATION_RANGES[size].default;
};

export const TransitionEditorView: React.FC<TransitionEditorViewProps> = ({
  songA,
  songB,
  transitionId,
  onBack,
  onSave: onSaveCallback,
}) => {
  const { user } = useAuth();
  const [transition, setTransition] = useState<TransitionData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSize, setDurationSize] = useState<DurationSize>('medium');
  const [transitionDuration, setTransitionDuration] = useState(12);
  const [aiRecommendations, setAiRecommendations] = useState<TemplateRecommendation[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTemplateGallery, setShowTemplateGallery] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const songADuration = songA.metadata?.duration || 180;
  const songBDuration = songB.metadata?.duration || 180;

  useEffect(() => {
    loadData();
  }, [transitionId]);

  useEffect(() => {
    if (transition) {
      setTransitionDuration(transition.transitionDuration);
      setDurationSize(getDurationSizeFromValue(transition.transitionDuration));
    }
  }, [transition]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transitionData, templatesData] = await Promise.all([
        transitionsService.getTransition(transitionId),
        databaseService.getTemplates()
      ]);

      setTransition(transitionData);
      setTemplates(templatesData);

      if (transitionData.templateId) {
        const template = templatesData.find(t => t.id === transitionData.templateId);
        if (template) {
          setSelectedTemplate(template);
        }
      }
    } catch (error) {
      console.error('Failed to load transition data:', error);
      alert('Failed to load transition data');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: TemplateData) => {
    if (!transition) return;

    setSelectedTemplate(template);

    try {
      await transitionsService.updateTransition(transitionId, {
        templateId: template.id,
        transitionDuration: template.duration,
        metadata: {
          ...transition.metadata,
          templateName: template.name
        }
      });

      setTransitionDuration(template.duration);
      setDurationSize(getDurationSizeFromValue(template.duration));
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template');
    }
  };

  const handleDurationChange = async (size: DurationSize) => {
    if (!transition) return;

    const newDuration = getDurationForSize(size);
    setDurationSize(size);
    setTransitionDuration(newDuration);

    const songAClipStart = Math.max(0, (transition.songAMarkerPoint || 0) - newDuration);
    const songBClipEnd = (transition.songBMarkerPoint || 0) + newDuration;

    try {
      await transitionsService.updateTransition(transitionId, {
        transitionDuration: newDuration,
        songAClipStart,
        songBClipEnd,
        metadata: {
          ...transition.metadata,
          durationSize: size
        }
      });

      setTransition({
        ...transition,
        transitionDuration: newDuration,
        songAClipStart,
        songBClipEnd
      });
    } catch (error) {
      console.error('Failed to update duration:', error);
      alert('Failed to update duration');
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      alert('Please select a transition template first');
      return;
    }

    if (!transition) return;

    setSaving(true);
    try {
      await transitionsService.updateTransition(transitionId, {
        status: 'ready'
      });

      alert('Transition saved successfully!');
      onSaveCallback();
    } catch (error) {
      console.error('Failed to save transition:', error);
      alert('Failed to save transition. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !transition) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  const songAMarkerPoint = transition.songAMarkerPoint || 0;
  const songBMarkerPoint = transition.songBMarkerPoint || 0;
  const songAClipStart = transition.songAClipStart || 0;
  const songBClipEnd = transition.songBClipEnd || 0;

  const filteredTemplates = templates.filter(t => {
    const templateDuration = t.duration || 12;
    const size = getDurationSizeFromValue(templateDuration);
    return size === durationSize;
  });

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Transition Editor</h1>
              <p className="text-sm text-gray-400">
                {songA.originalName} → {songB.originalName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <AIPowerButton
              uploadIdA={songA.id}
              uploadIdB={songB.id}
              onAnalysisComplete={(recommendations) => {
                setAiRecommendations(recommendations);
                setShowAIRecommendations(true);
              }}
              onError={(errorMsg) => {
                alert(errorMsg);
              }}
            />
            <button
              onClick={() => setShowExportDialog(true)}
              disabled={!selectedTemplate || transition?.status !== 'ready'}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2
                ${selectedTemplate && transition?.status === 'ready'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Download className="w-5 h-5" />
              <span>Export Blend</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedTemplate || saving}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2
                ${selectedTemplate && !saving
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Transition'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Timeline Preview</h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">{songA.originalName}</h3>
                    <p className="text-xs text-gray-400">Clip: {formatTime(songAClipStart)} to {formatTime(songAMarkerPoint)} ({transitionDuration}s)</p>
                  </div>
                  <div className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                    Song A Ending
                  </div>
                </div>
                <div className="relative">
                  <WaveformDisplay
                    audioUrl={songA.url}
                    height={80}
                    color="#3b82f6"
                    progressColor="#60a5fa"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative h-full">
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-gray-900/60"
                        style={{ width: `${(songAClipStart / songADuration) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 right-0 bg-gray-900/60"
                        style={{ width: `${((songADuration - songAMarkerPoint) / songADuration) * 100}%` }}
                      />
                      <div
                        className="absolute -top-2 -bottom-2 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-pulse"
                        style={{ left: `${(songAMarkerPoint / songADuration) * 100}%`, width: '3px' }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg">
                          Marker
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-green-500/20 rounded-full border border-purple-500/30">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">
                    {selectedTemplate ? selectedTemplate.name : 'No Template Selected'}
                  </span>
                  <span className="text-xs text-purple-400">({transitionDuration}s)</span>
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">{songB.originalName}</h3>
                    <p className="text-xs text-gray-400">Clip: {formatTime(songBMarkerPoint)} to {formatTime(songBClipEnd)} ({transitionDuration}s)</p>
                  </div>
                  <div className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                    Song B Beginning
                  </div>
                </div>
                <div className="relative">
                  <WaveformDisplay
                    audioUrl={songB.url}
                    height={80}
                    color="#10b981"
                    progressColor="#34d399"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative h-full">
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-gray-900/60"
                        style={{ width: `${(songBMarkerPoint / songBDuration) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 right-0 bg-gray-900/60"
                        style={{ width: `${((songBDuration - songBClipEnd) / songBDuration) * 100}%` }}
                      />
                      <div
                        className="absolute -top-2 -bottom-2 w-1 bg-gradient-to-b from-green-400 via-emerald-500 to-green-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse"
                        style={{ left: `${(songBMarkerPoint / songBDuration) * 100}%`, width: '3px' }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg">
                          Marker
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={handleRestart}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-gray-300" />
              </button>
              <button
                onClick={handlePlayPause}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-colors flex items-center space-x-2 text-white font-medium shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isPlaying ? 'Pause Preview' : 'Play Preview'}</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Transition Duration</h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleDurationChange('short')}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${durationSize === 'short'
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Zap className={`w-8 h-8 ${durationSize === 'short' ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <p className={`text-sm font-bold ${durationSize === 'short' ? 'text-cyan-400' : 'text-white'}`}>
                    Short ({DURATION_RANGES.short.default}s)
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleDurationChange('medium')}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${durationSize === 'medium'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Clock className={`w-8 h-8 ${durationSize === 'medium' ? 'text-blue-400' : 'text-gray-400'}`} />
                  <p className={`text-sm font-bold ${durationSize === 'medium' ? 'text-blue-400' : 'text-white'}`}>
                    Medium ({DURATION_RANGES.medium.default}s)
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleDurationChange('long')}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${durationSize === 'long'
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Timer className={`w-8 h-8 ${durationSize === 'long' ? 'text-purple-400' : 'text-gray-400'}`} />
                  <p className={`text-sm font-bold ${durationSize === 'long' ? 'text-purple-400' : 'text-white'}`}>
                    Long ({DURATION_RANGES.long.default}s)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {showAIRecommendations && aiRecommendations.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <AIRecommendationsPanel
                recommendations={aiRecommendations}
                onSelectTemplate={(templateId) => {
                  const template = aiRecommendations.find(r => r.templateId === templateId)?.template;
                  if (template) {
                    handleTemplateSelect(template);
                  }
                }}
                onClose={() => setShowAIRecommendations(false)}
                isVisible={showAIRecommendations}
              />
            </div>
          )}

          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <button
              onClick={() => setShowTemplateGallery(!showTemplateGallery)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors rounded-t-xl"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">
                  Select Template ({filteredTemplates.length} {durationSize} templates)
                </h2>
              </div>
              {showTemplateGallery ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {showTemplateGallery && (
              <div className="p-6 pt-2">
                <TemplateGallery
                  onSelectTemplate={handleTemplateSelect}
                  compact={false}
                  trackA={songA}
                  trackB={songB}
                  durationFilter={durationSize}
                  selectedTemplateId={selectedTemplate?.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showExportDialog && transition && (
        <BlendExportDialog
          transition={transition}
          songA={songA}
          songB={songB}
          onClose={() => setShowExportDialog(false)}
          onExportComplete={() => {
            setShowExportDialog(false);
            alert('Export started! Check the Blends section in your Library to view your exported blend.');
          }}
        />
      )}
    </div>
  );
};

export default TransitionEditorView;
