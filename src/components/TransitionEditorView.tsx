import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Play, Pause, RotateCcw, Save, Sparkles, Music, Zap, Clock, Timer,
  Download, ZoomIn, ZoomOut, Maximize2, Target, ChevronRight, ChevronLeft,
  Volume2, VolumeX, Layers
} from 'lucide-react';
import * as Tone from 'tone';
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
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [songADuration, setSongADuration] = useState(songA.metadata?.duration || 300);
  const [songBDuration, setSongBDuration] = useState(songB.metadata?.duration || 300);

  const [zoomLevel, setZoomLevel] = useState(50);
  const [trackHeight, setTrackHeight] = useState(120);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const [draggingMarker, setDraggingMarker] = useState<'songA' | 'songB' | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadData();
  }, [transitionId]);

  useEffect(() => {
    if (transition) {
      setTransitionDuration(transition.transitionDuration);
      setDurationSize(getDurationSizeFromValue(transition.transitionDuration));
    }
  }, [transition]);

  useEffect(() => {
    const loadActualDurations = async () => {
      try {
        const [bufferA, bufferB] = await Promise.all([
          new Promise<number>((resolve) => {
            const player = new Tone.Player(songA.url, () => {
              const duration = player.buffer.duration;
              player.dispose();
              resolve(duration);
            });
          }),
          new Promise<number>((resolve) => {
            const player = new Tone.Player(songB.url, () => {
              const duration = player.buffer.duration;
              player.dispose();
              resolve(duration);
            });
          })
        ]);

        if (bufferA > 0) setSongADuration(bufferA);
        if (bufferB > 0) setSongBDuration(bufferB);
      } catch (error) {
        console.error('Failed to load audio durations:', error);
      }
    };

    loadActualDurations();
  }, [songA.url, songB.url]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'Home':
          e.preventDefault();
          jumpToMarker('songA');
          break;
        case 'End':
          e.preventDefault();
          jumpToMarker('songB');
          break;
        case 'i':
        case 'I':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMarkerAtPlayhead('songA');
          }
          break;
        case 'o':
        case 'O':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMarkerAtPlayhead('songB');
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoomLevel(prev => Math.min(200, prev + 10));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel(prev => Math.max(20, prev - 10));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playheadPosition, transition]);

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

  const debouncedSaveMarker = useCallback((markerType: 'songA' | 'songB', value: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!transition) return;

      try {
        const updates: any = {};
        if (markerType === 'songA') {
          updates.songAMarkerPoint = value;
          updates.songAClipStart = Math.max(0, value - transitionDuration);
        } else {
          updates.songBMarkerPoint = value;
          updates.songBClipEnd = value + transitionDuration;
        }

        await transitionsService.updateTransition(transitionId, updates);

        const updatedTransition = await transitionsService.getTransition(transitionId);
        setTransition(updatedTransition);
      } catch (error) {
        console.error('Failed to save marker position:', error);
      }
    }, 500);
  }, [transition, transitionId, transitionDuration]);

  const handleMarkerDrag = (markerType: 'songA' | 'songB', newPosition: number) => {
    if (!transition) return;

    const clampedPosition = markerType === 'songA'
      ? Math.max(transitionDuration, Math.min(songADuration, newPosition))
      : Math.max(0, Math.min(songBDuration - transitionDuration, newPosition));

    if (snapToGrid) {
      const gridSize = 1;
      const snapped = Math.round(clampedPosition / gridSize) * gridSize;

      if (markerType === 'songA') {
        setTransition({ ...transition, songAMarkerPoint: snapped });
      } else {
        setTransition({ ...transition, songBMarkerPoint: snapped });
      }

      debouncedSaveMarker(markerType, snapped);
    } else {
      if (markerType === 'songA') {
        setTransition({ ...transition, songAMarkerPoint: clampedPosition });
      } else {
        setTransition({ ...transition, songBMarkerPoint: clampedPosition });
      }

      debouncedSaveMarker(markerType, clampedPosition);
    }
  };

  const jumpToMarker = (markerType: 'songA' | 'songB') => {
    if (!transition) return;

    const position = markerType === 'songA'
      ? transition.songAMarkerPoint || 0
      : transition.songBMarkerPoint || 0;

    setPlayheadPosition(position);
  };

  const setMarkerAtPlayhead = async (markerType: 'songA' | 'songB') => {
    if (!transition) return;

    const clampedPosition = markerType === 'songA'
      ? Math.max(transitionDuration, Math.min(songADuration, playheadPosition))
      : Math.max(0, Math.min(songBDuration - transitionDuration, playheadPosition));

    try {
      const updates: any = {};
      if (markerType === 'songA') {
        updates.songAMarkerPoint = clampedPosition;
        updates.songAClipStart = Math.max(0, clampedPosition - transitionDuration);
      } else {
        updates.songBMarkerPoint = clampedPosition;
        updates.songBClipEnd = clampedPosition + transitionDuration;
      }

      await transitionsService.updateTransition(transitionId, updates);
      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
    } catch (error) {
      console.error('Failed to set marker:', error);
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

      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
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

      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
    } catch (error) {
      console.error('Failed to update duration:', error);
      alert('Failed to update duration');
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setPlayheadPosition(0);
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
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggingMarker) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const maxDuration = Math.max(songADuration, songBDuration);
    const clickTime = (x / rect.width) * maxDuration * (100 / zoomLevel);

    setPlayheadPosition(Math.max(0, Math.min(maxDuration, clickTime)));
  };

  const handleMarkerMouseDown = (markerType: 'songA' | 'songB', e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingMarker(markerType);
  };

  useEffect(() => {
    if (!draggingMarker) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !transition) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const maxDuration = draggingMarker === 'songA' ? songADuration : songBDuration;
      const newPosition = (x / rect.width) * maxDuration * (100 / zoomLevel);

      handleMarkerDrag(draggingMarker, newPosition);
    };

    const handleMouseUp = () => {
      setDraggingMarker(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingMarker, transition, zoomLevel]);

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

  const maxDuration = Math.max(songADuration, songBDuration);
  const pixelsPerSecond = (zoomLevel / 100) * 50;

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div>
              <h1 className="text-base font-bold text-white">Professional Timeline Editor</h1>
              <p className="text-xs text-gray-400">
                {songA.originalName} → {songB.originalName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="px-3 py-1.5 bg-gray-700 rounded-lg">
              <span className="text-xs text-gray-400 mr-2">Playhead:</span>
              <span className="text-sm font-mono text-cyan-400">{formatTime(playheadPosition)}</span>
            </div>
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
                px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5
                ${selectedTemplate && transition?.status === 'ready'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedTemplate || saving}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5
                ${selectedTemplate && !saving
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!isLeftPanelCollapsed && (
          <div
            className="bg-gray-800 border-r border-gray-700 flex-shrink-0 overflow-y-auto"
            style={{ width: `${leftPanelWidth}px` }}
          >
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Transport</h3>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handlePlayPause}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-white font-semibold shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center space-x-2 text-gray-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restart</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Markers</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setMarkerAtPlayhead('songA')}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Set Song A Out</span>
                      <span className="text-xs text-cyan-400 font-mono">{formatTime(songAMarkerPoint)}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setMarkerAtPlayhead('songB')}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Set Song B In</span>
                      <span className="text-xs text-green-400 font-mono">{formatTime(songBMarkerPoint)}</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Navigation</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => jumpToMarker('songA')}
                    className="flex-1 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/50 rounded-lg transition-colors"
                  >
                    <Target className="w-4 h-4 text-cyan-400 mx-auto" />
                    <span className="text-xs text-cyan-300 mt-1 block">A Out</span>
                  </button>
                  <button
                    onClick={() => jumpToMarker('songB')}
                    className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 rounded-lg transition-colors"
                  >
                    <Target className="w-4 h-4 text-green-400 mx-auto" />
                    <span className="text-xs text-green-300 mt-1 block">B In</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Transition Duration</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleDurationChange('short')}
                    className={`
                      w-full p-3 rounded-lg border-2 transition-all duration-200
                      ${durationSize === 'short'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Zap className={`w-5 h-5 ${durationSize === 'short' ? 'text-cyan-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${durationSize === 'short' ? 'text-cyan-400' : 'text-white'}`}>
                        Short ({DURATION_RANGES.short.default}s)
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDurationChange('medium')}
                    className={`
                      w-full p-3 rounded-lg border-2 transition-all duration-200
                      ${durationSize === 'medium'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-5 h-5 ${durationSize === 'medium' ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${durationSize === 'medium' ? 'text-blue-400' : 'text-white'}`}>
                        Medium ({DURATION_RANGES.medium.default}s)
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDurationChange('long')}
                    className={`
                      w-full p-3 rounded-lg border-2 transition-all duration-200
                      ${durationSize === 'long'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <Timer className={`w-5 h-5 ${durationSize === 'long' ? 'text-purple-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${durationSize === 'long' ? 'text-purple-400' : 'text-white'}`}>
                        Long ({DURATION_RANGES.long.default}s)
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">View Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650">
                    <span className="text-sm text-white">Show Grid</span>
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-650">
                    <span className="text-sm text-white">Snap to Grid</span>
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="w-4 h-4 text-cyan-600 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Zoom</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <ZoomOut className="w-4 h-4 text-gray-400" />
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="flex-1"
                    />
                    <ZoomIn className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-center text-xs text-gray-400">
                    {zoomLevel}%
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setZoomLevel(50)}
                      className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                    >
                      Fit
                    </button>
                    <button
                      onClick={() => setZoomLevel(100)}
                      className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                    >
                      100%
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Track Height</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTrackHeight(80)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs ${trackHeight === 80 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => setTrackHeight(120)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs ${trackHeight === 120 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setTrackHeight(180)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs ${trackHeight === 180 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Large
                  </button>
                </div>
              </div>

              {showAIRecommendations && aiRecommendations.length > 0 && (
                <div>
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

              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Templates ({filteredTemplates.length})</span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </h3>
                <div className="max-h-96 overflow-y-auto">
                  <TemplateGallery
                    onSelectTemplate={handleTemplateSelect}
                    compact={true}
                    trackA={songA}
                    trackB={songB}
                    durationFilter={durationSize}
                    selectedTemplateId={selectedTemplate?.id}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
          <button
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            className="absolute left-0 top-20 z-10 bg-gray-800 border border-gray-700 rounded-r-lg p-2 hover:bg-gray-700 transition-colors"
          >
            {isLeftPanelCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
          </button>

          <div className="flex-1 flex flex-col p-6 overflow-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-2">Professional Timeline</h2>
              <p className="text-sm text-gray-400">
                Click markers to drag and adjust transition points. Use keyboard shortcuts: Space (play/pause), I (set Song A out), O (set Song B in), Home/End (jump to markers)
              </p>
            </div>

            <div
              ref={timelineRef}
              className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto overflow-y-hidden p-4"
              onClick={handleTimelineClick}
              style={{ minHeight: `${trackHeight * 3 + 200}px` }}
            >
              <div style={{ width: `${maxDuration * pixelsPerSecond}px`, minWidth: '100%' }}>
                <div className="relative h-8 mb-4 border-b border-gray-700">
                  {Array.from({ length: Math.ceil(maxDuration / 5) + 1 }).map((_, i) => {
                    const time = i * 5;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-600"
                        style={{ left: `${(time / maxDuration) * 100}%` }}
                      >
                        <span className="absolute -top-1 left-1 text-xs text-gray-400">
                          {formatTime(time)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-6 relative">
                  <div style={{ height: `${trackHeight}px` }} className="relative">
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="text-xs font-semibold text-white mb-2">Song A (Ending)</div>
                      <div className="relative h-full bg-gray-900 rounded overflow-hidden">
                        <WaveformDisplay
                          audioUrl={songA.url}
                          height={trackHeight - 24}
                          color="#3b82f6"
                          progressColor="#60a5fa"
                        />

                        <div
                          className="absolute top-0 bottom-0 left-0 bg-gray-900/80 pointer-events-none"
                          style={{ width: `${(songAClipStart / songADuration) * 100}%` }}
                        />

                        <div
                          className="absolute top-0 bottom-0 bg-gray-900/80 pointer-events-none"
                          style={{
                            left: `${(songAMarkerPoint / songADuration) * 100}%`,
                            right: 0
                          }}
                        />

                        <div
                          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] cursor-ew-resize group"
                          style={{ left: `${(songAMarkerPoint / songADuration) * 100}%` }}
                          onMouseDown={(e) => handleMarkerMouseDown('songA', e)}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            Song A Out: {formatTime(songAMarkerPoint)}
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4 h-8 bg-cyan-500 rounded-sm flex items-center justify-center">
                            <div className="w-1 h-4 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: `${Math.min(trackHeight, 60)}px` }} className="relative flex items-center justify-center">
                    <div className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-green-500/20 rounded-full border border-purple-500/30">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">
                        {selectedTemplate ? selectedTemplate.name : 'No Template Selected'}
                      </span>
                      <span className="text-xs text-purple-400">({transitionDuration}s transition)</span>
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>

                  <div style={{ height: `${trackHeight}px` }} className="relative">
                    <div className="absolute top-0 left-0 w-full h-full">
                      <div className="text-xs font-semibold text-white mb-2">Song B (Beginning)</div>
                      <div className="relative h-full bg-gray-900 rounded overflow-hidden">
                        <WaveformDisplay
                          audioUrl={songB.url}
                          height={trackHeight - 24}
                          color="#10b981"
                          progressColor="#34d399"
                        />

                        <div
                          className="absolute top-0 bottom-0 left-0 bg-gray-900/80 pointer-events-none"
                          style={{ width: `${(songBMarkerPoint / songBDuration) * 100}%` }}
                        />

                        <div
                          className="absolute top-0 bottom-0 bg-gray-900/80 pointer-events-none"
                          style={{
                            left: `${(songBClipEnd / songBDuration) * 100}%`,
                            right: 0
                          }}
                        />

                        <div
                          className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-emerald-500 to-green-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] cursor-ew-resize group"
                          style={{ left: `${(songBMarkerPoint / songBDuration) * 100}%` }}
                          onMouseDown={(e) => handleMarkerMouseDown('songB', e)}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            Song B In: {formatTime(songBMarkerPoint)}
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4 h-8 bg-green-500 rounded-sm flex items-center justify-center">
                            <div className="w-1 h-4 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] pointer-events-none z-10"
                    style={{ left: `${(playheadPosition / maxDuration) * 100}%` }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-red-500"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Song A Clip</div>
                <div className="text-white font-mono">{formatTime(songAClipStart)} - {formatTime(songAMarkerPoint)}</div>
                <div className="text-cyan-400 text-xs mt-1">{transitionDuration}s duration</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Transition</div>
                <div className="text-purple-400 font-semibold">{selectedTemplate?.name || 'None'}</div>
                <div className="text-purple-300 text-xs mt-1">{transitionDuration}s overlap</div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Song B Clip</div>
                <div className="text-white font-mono">{formatTime(songBMarkerPoint)} - {formatTime(songBClipEnd)}</div>
                <div className="text-green-400 text-xs mt-1">{transitionDuration}s duration</div>
              </div>
            </div>
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
