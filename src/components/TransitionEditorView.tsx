import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Play, Pause, RotateCcw, Save, Sparkles, Zap, Clock, Timer,
  Download, ZoomIn, ZoomOut, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Volume2, X, Navigation
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
import { ClippedWaveformDisplay } from './ClippedWaveformDisplay';
import { KeyframeFadeEditor, FadeKeyframe } from './KeyframeFadeEditor';
import BlendExportDialog from './BlendExportDialog';
import ResetTransitionPointsModal from './ResetTransitionPointsModal';

interface TransitionEditorViewProps {
  songA: UploadResult;
  songB: UploadResult;
  transitionId: string;
  onBack: () => void;
  onSave: () => void;
  onResetPoints?: () => void;
}

type DurationSize = 'short' | 'medium' | 'long';
type FadeCurveType = 'linear' | 'smooth' | 'fast';

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

const applyVolumeAutomation = (
  volumeNode: Tone.Volume,
  keyframes: FadeKeyframe[],
  duration: number,
  curveType: FadeCurveType
) => {
  if (keyframes.length === 0) return;

  volumeNode.volume.cancelScheduledValues(0);

  const sortedKeyframes = [...keyframes].sort((a, b) => a.position - b.position);

  sortedKeyframes.forEach((keyframe, index) => {
    const time = keyframe.position * duration;
    const volumeDb = keyframe.value === 0 ? -60 : (keyframe.value - 1) * 60;

    if (index === 0) {
      volumeNode.volume.setValueAtTime(volumeDb, Tone.now() + time);
    } else {
      const prevKeyframe = sortedKeyframes[index - 1];
      const prevTime = prevKeyframe.position * duration;
      const timeDiff = time - prevTime;

      if (curveType === 'linear') {
        volumeNode.volume.linearRampToValueAtTime(volumeDb, Tone.now() + time);
      } else if (curveType === 'fast') {
        volumeNode.volume.exponentialRampToValueAtTime(Math.max(volumeDb, -60), Tone.now() + time);
      } else {
        volumeNode.volume.exponentialRampToValueAtTime(Math.max(volumeDb, -60), Tone.now() + time);
      }
    }
  });
};

export const TransitionEditorView: React.FC<TransitionEditorViewProps> = ({
  songA,
  songB,
  transitionId,
  onBack,
  onSave: onSaveCallback,
  onResetPoints,
}) => {
  const { user } = useAuth();
  const [transition, setTransition] = useState<TransitionData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSongA, setIsPlayingSongA] = useState(false);
  const [isPlayingTransition, setIsPlayingTransition] = useState(false);
  const [isPlayingSongB, setIsPlayingSongB] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackProgressA, setPlaybackProgressA] = useState(0);
  const [playbackProgressB, setPlaybackProgressB] = useState(0);
  const [durationSize, setDurationSize] = useState<DurationSize>('medium');
  const [transitionDuration, setTransitionDuration] = useState(12);
  const [aiRecommendations, setAiRecommendations] = useState<TemplateRecommendation[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);

  const [songADuration, setSongADuration] = useState(songA.metadata?.duration || 300);
  const [songBDuration, setSongBDuration] = useState(songB.metadata?.duration || 300);

  const [zoomLevel, setZoomLevel] = useState(50);
  const [trackHeight, setTrackHeight] = useState(120);

  const [leftPanelWidth] = useState(180);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);

  const [songAKeyframes, setSongAKeyframes] = useState<FadeKeyframe[]>([
    { position: 0, value: 1 },
    { position: 0.7, value: 1 },
    { position: 1, value: 0 }
  ]);
  const [songBKeyframes, setSongBKeyframes] = useState<FadeKeyframe[]>([
    { position: 0, value: 0 },
    { position: 0.3, value: 1 },
    { position: 1, value: 1 }
  ]);
  const [songAFadeCurve, setSongAFadeCurve] = useState<FadeCurveType>('smooth');
  const [songBFadeCurve, setSongBFadeCurve] = useState<FadeCurveType>('smooth');
  const [showResetPointsModal, setShowResetPointsModal] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const playerARef = useRef<Tone.Player | null>(null);
  const playerBRef = useRef<Tone.Player | null>(null);
  const playerTransitionRef = useRef<Tone.Player | null>(null);
  const volumeNodeARef = useRef<Tone.Volume | null>(null);
  const volumeNodeBRef = useRef<Tone.Volume | null>(null);
  const animationFrameARef = useRef<number | null>(null);
  const animationFrameBRef = useRef<number | null>(null);
  const startTimeARef = useRef<number>(0);
  const startTimeBRef = useRef<number>(0);

  useEffect(() => {
    loadData();
  }, [transitionId]);

  useEffect(() => {
    if (transition) {
      setTransitionDuration(transition.transitionDuration);
      setDurationSize(getDurationSizeFromValue(transition.transitionDuration));

      if (transition.metadata?.songAKeyframes) {
        setSongAKeyframes(transition.metadata.songAKeyframes);
      }
      if (transition.metadata?.songBKeyframes) {
        setSongBKeyframes(transition.metadata.songBKeyframes);
      }
      if (transition.metadata?.songAFadeCurve) {
        setSongAFadeCurve(transition.metadata.songAFadeCurve);
      }
      if (transition.metadata?.songBFadeCurve) {
        setSongBFadeCurve(transition.metadata.songBFadeCurve);
      }
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
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameARef.current) {
        cancelAnimationFrame(animationFrameARef.current);
      }
      if (animationFrameBRef.current) {
        cancelAnimationFrame(animationFrameBRef.current);
      }
      playerARef.current?.dispose();
      playerBRef.current?.dispose();
      playerTransitionRef.current?.dispose();
      volumeNodeARef.current?.dispose();
      volumeNodeBRef.current?.dispose();
    };
  }, []);


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

  const debouncedSaveFade = useCallback((updates: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!transition) return;

      try {
        await transitionsService.updateTransition(transitionId, {
          metadata: {
            ...transition.metadata,
            ...updates
          }
        });

        const updatedTransition = await transitionsService.getTransition(transitionId);
        setTransition(updatedTransition);
      } catch (error) {
        console.error('Failed to save fade settings:', error);
      }
    }, 500);
  }, [transition, transitionId]);

  const handleTemplateSelect = async (template: TemplateData) => {
    if (!transition) return;

    setSelectedTemplate(template);
    setIsTemplatesExpanded(false);

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

  const handleRestart = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to start fresh? This will reset the transition timeline to default settings while keeping your marker points (START, OUT, IN, END).'
    );
    if (confirmed) {
      if (!transition) return;

      setCurrentTime(0);
      setIsPlaying(false);
      setIsPlayingSongA(false);
      setIsPlayingTransition(false);
      setIsPlayingSongB(false);
      setPlaybackProgressA(0);
      setPlaybackProgressB(0);

      if (animationFrameARef.current) {
        cancelAnimationFrame(animationFrameARef.current);
        animationFrameARef.current = null;
      }
      if (animationFrameBRef.current) {
        cancelAnimationFrame(animationFrameBRef.current);
        animationFrameBRef.current = null;
      }

      playerARef.current?.stop();
      playerBRef.current?.stop();
      playerTransitionRef.current?.stop();
      volumeNodeARef.current?.dispose();
      volumeNodeBRef.current?.dispose();

      const defaultKeyframesA = [
        { position: 0, value: 1 },
        { position: 0.7, value: 1 },
        { position: 1, value: 0 }
      ];
      const defaultKeyframesB = [
        { position: 0, value: 0 },
        { position: 0.3, value: 1 },
        { position: 1, value: 1 }
      ];

      setSongAKeyframes(defaultKeyframesA);
      setSongBKeyframes(defaultKeyframesB);
      setSongAFadeCurve('smooth');
      setSongBFadeCurve('smooth');
      setSelectedTemplate(null);
      setDurationSize('medium');
      setTransitionDuration(12);

      try {
        await transitionsService.updateTransition(transitionId, {
          templateId: null,
          transitionDuration: 12,
          metadata: {
            songAKeyframes: defaultKeyframesA,
            songBKeyframes: defaultKeyframesB,
            songAFadeCurve: 'smooth',
            songBFadeCurve: 'smooth',
            durationSize: 'medium'
          }
        });

        const updatedTransition = await transitionsService.getTransition(transitionId);
        setTransition(updatedTransition);
      } catch (error) {
        console.error('Failed to reset transition:', error);
        alert('Failed to reset transition');
      }
    }
  };

  const handlePlaySongA = async () => {
    if (!transition || transition.songAClipStart === undefined || transition.songAMarkerPoint === undefined) {
      return;
    }

    await Tone.start();

    if (isPlayingSongA) {
      if (animationFrameARef.current) {
        cancelAnimationFrame(animationFrameARef.current);
        animationFrameARef.current = null;
      }
      if (playerARef.current) {
        playerARef.current.stop();
        playerARef.current.dispose();
        playerARef.current = null;
      }
      if (volumeNodeARef.current) {
        volumeNodeARef.current.dispose();
        volumeNodeARef.current = null;
      }
      setIsPlayingSongA(false);
      setPlaybackProgressA(0);
      Tone.Transport.stop();
      return;
    }

    if (isPlayingSongB || isPlayingTransition) {
      handleStopAll();
    }

    try {
      const volumeNode = new Tone.Volume(0).toDestination();
      volumeNodeARef.current = volumeNode;

      const player = new Tone.Player(songA.url, () => {
        const clipStart = transition.songAClipStart!;
        const clipEnd = transition.songAMarkerPoint!;
        const clipDuration = clipEnd - clipStart;

        applyVolumeAutomation(volumeNode, songAKeyframes, clipDuration, songAFadeCurve);

        player.connect(volumeNode);
        player.sync().start(0, clipStart, clipDuration);
        Tone.Transport.start();

        startTimeARef.current = Tone.now();
        setPlaybackProgressA(0);

        const updateProgress = () => {
          const elapsed = Tone.now() - startTimeARef.current;
          const progress = Math.min(elapsed / clipDuration, 1);
          setPlaybackProgressA(progress);

          if (progress < 1) {
            animationFrameARef.current = requestAnimationFrame(updateProgress);
          } else {
            if (animationFrameARef.current) {
              cancelAnimationFrame(animationFrameARef.current);
              animationFrameARef.current = null;
            }
            player.stop();
            player.dispose();
            volumeNode.dispose();
            playerARef.current = null;
            volumeNodeARef.current = null;
            setIsPlayingSongA(false);
            setPlaybackProgressA(0);
            Tone.Transport.stop();
          }
        };

        animationFrameARef.current = requestAnimationFrame(updateProgress);
      });

      playerARef.current = player;
      setIsPlayingSongA(true);
    } catch (error) {
      console.error('Failed to play Song A:', error);
      setIsPlayingSongA(false);
      setPlaybackProgressA(0);
    }
  };

  const handlePlayTransition = () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    if (isPlayingTransition) {
      if (playerTransitionRef.current) {
        playerTransitionRef.current.stop();
        playerTransitionRef.current.dispose();
        playerTransitionRef.current = null;
      }
      setIsPlayingTransition(false);
      return;
    }

    if (isPlayingSongA || isPlayingSongB) {
      handleStopAll();
    }

    setIsPlayingTransition(!isPlayingTransition);
  };

  const handlePlaySongB = async () => {
    if (!transition || transition.songBMarkerPoint === undefined || transition.songBClipEnd === undefined) {
      return;
    }

    await Tone.start();

    if (isPlayingSongB) {
      if (animationFrameBRef.current) {
        cancelAnimationFrame(animationFrameBRef.current);
        animationFrameBRef.current = null;
      }
      if (playerBRef.current) {
        playerBRef.current.stop();
        playerBRef.current.dispose();
        playerBRef.current = null;
      }
      if (volumeNodeBRef.current) {
        volumeNodeBRef.current.dispose();
        volumeNodeBRef.current = null;
      }
      setIsPlayingSongB(false);
      setPlaybackProgressB(0);
      Tone.Transport.stop();
      return;
    }

    if (isPlayingSongA || isPlayingTransition) {
      handleStopAll();
    }

    try {
      const volumeNode = new Tone.Volume(0).toDestination();
      volumeNodeBRef.current = volumeNode;

      const player = new Tone.Player(songB.url, () => {
        const clipStart = transition.songBMarkerPoint!;
        const clipEnd = transition.songBClipEnd!;
        const clipDuration = clipEnd - clipStart;

        applyVolumeAutomation(volumeNode, songBKeyframes, clipDuration, songBFadeCurve);

        player.connect(volumeNode);
        player.sync().start(0, clipStart, clipDuration);
        Tone.Transport.start();

        startTimeBRef.current = Tone.now();
        setPlaybackProgressB(0);

        const updateProgress = () => {
          const elapsed = Tone.now() - startTimeBRef.current;
          const progress = Math.min(elapsed / clipDuration, 1);
          setPlaybackProgressB(progress);

          if (progress < 1) {
            animationFrameBRef.current = requestAnimationFrame(updateProgress);
          } else {
            if (animationFrameBRef.current) {
              cancelAnimationFrame(animationFrameBRef.current);
              animationFrameBRef.current = null;
            }
            player.stop();
            player.dispose();
            volumeNode.dispose();
            playerBRef.current = null;
            volumeNodeBRef.current = null;
            setIsPlayingSongB(false);
            setPlaybackProgressB(0);
            Tone.Transport.stop();
          }
        };

        animationFrameBRef.current = requestAnimationFrame(updateProgress);
      });

      playerBRef.current = player;
      setIsPlayingSongB(true);
    } catch (error) {
      console.error('Failed to play Song B:', error);
      setIsPlayingSongB(false);
      setPlaybackProgressB(0);
    }
  };

  const handleStopAll = () => {
    if (animationFrameARef.current) {
      cancelAnimationFrame(animationFrameARef.current);
      animationFrameARef.current = null;
    }
    if (animationFrameBRef.current) {
      cancelAnimationFrame(animationFrameBRef.current);
      animationFrameBRef.current = null;
    }
    if (playerARef.current) {
      playerARef.current.stop();
      playerARef.current.dispose();
      playerARef.current = null;
    }
    if (volumeNodeARef.current) {
      volumeNodeARef.current.dispose();
      volumeNodeARef.current = null;
    }
    if (playerBRef.current) {
      playerBRef.current.stop();
      playerBRef.current.dispose();
      playerBRef.current = null;
    }
    if (volumeNodeBRef.current) {
      volumeNodeBRef.current.dispose();
      volumeNodeBRef.current = null;
    }
    if (playerTransitionRef.current) {
      playerTransitionRef.current.stop();
      playerTransitionRef.current.dispose();
      playerTransitionRef.current = null;
    }
    setIsPlayingSongA(false);
    setIsPlayingSongB(false);
    setIsPlayingTransition(false);
    setPlaybackProgressA(0);
    setPlaybackProgressB(0);
    Tone.Transport.stop();
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
        status: 'ready',
        metadata: {
          ...transition.metadata,
          songAKeyframes,
          songBKeyframes,
          songAFadeCurve,
          songBFadeCurve
        }
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

  const handleBackClick = () => {
    if (selectedTemplate) {
      setShowBackDialog(true);
    } else {
      onBack();
    }
  };

  const handleSongAKeyframesChange = (newKeyframes: FadeKeyframe[]) => {
    setSongAKeyframes(newKeyframes);
    debouncedSaveFade({ songAKeyframes: newKeyframes });
  };

  const handleSongBKeyframesChange = (newKeyframes: FadeKeyframe[]) => {
    setSongBKeyframes(newKeyframes);
    debouncedSaveFade({ songBKeyframes: newKeyframes });
  };

  const handleFadeCurveChange = (track: 'songA' | 'songB', curve: FadeCurveType) => {
    if (track === 'songA') {
      setSongAFadeCurve(curve);
      debouncedSaveFade({ songAFadeCurve: curve });
    } else {
      setSongBFadeCurve(curve);
      debouncedSaveFade({ songBFadeCurve: curve });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
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
    <div className="h-screen bg-gray-900 flex flex-col" data-tutorial="timeline-editor">
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex-shrink-0">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBackClick}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Professional Timeline Editor</h1>
              <p className="text-[10px] text-gray-400">
                {songA.originalName} → {songB.originalName}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2">
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
              onClick={handleSave}
              disabled={!selectedTemplate || saving}
              className={`
                px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 flex items-center space-x-1
                ${selectedTemplate && !saving
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-3 h-3" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {!isLeftPanelCollapsed && (
          <div
            className="bg-gray-800 border-r border-gray-700 flex-shrink-0 overflow-y-auto relative"
            style={{ width: `${leftPanelWidth}px` }}
          >
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              className="absolute right-2 top-4 z-20 bg-cyan-600 hover:bg-cyan-500 rounded p-1.5 transition-all shadow-lg"
            >
              <ChevronLeft className="w-3 h-3 text-white" />
            </button>
            <div className="p-3 space-y-2">
              <div>
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Transition Duration</h3>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleDurationChange('short')}
                    className={`
                      w-full p-2 rounded border-2 transition-all duration-200
                      ${durationSize === 'short'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Zap className={`w-4 h-4 ${durationSize === 'short' ? 'text-cyan-400' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${durationSize === 'short' ? 'text-cyan-400' : 'text-white'}`}>
                        Short ({DURATION_RANGES.short.default}s)
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDurationChange('medium')}
                    className={`
                      w-full p-2 rounded border-2 transition-all duration-200
                      ${durationSize === 'medium'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Clock className={`w-4 h-4 ${durationSize === 'medium' ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${durationSize === 'medium' ? 'text-blue-400' : 'text-white'}`}>
                        Medium ({DURATION_RANGES.medium.default}s)
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleDurationChange('long')}
                    className={`
                      w-full p-2 rounded border-2 transition-all duration-200
                      ${durationSize === 'long'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Timer className={`w-4 h-4 ${durationSize === 'long' ? 'text-purple-400' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${durationSize === 'long' ? 'text-purple-400' : 'text-white'}`}>
                        Long ({DURATION_RANGES.long.default}s)
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Zoom</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <ZoomOut className="w-3 h-3 text-gray-400" />
                    <input
                      type="range"
                      min="20"
                      max="200"
                      value={zoomLevel}
                      onChange={(e) => setZoomLevel(Number(e.target.value))}
                      className="flex-1"
                    />
                    <ZoomIn className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="text-center text-[10px] text-gray-400">
                    {zoomLevel}%
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Track Height</h3>
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => setTrackHeight(80)}
                    className={`flex-1 px-2 py-1 rounded text-[10px] ${trackHeight === 80 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => setTrackHeight(120)}
                    className={`flex-1 px-2 py-1 rounded text-[10px] ${trackHeight === 120 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setTrackHeight(180)}
                    className={`flex-1 px-2 py-1 rounded text-[10px] ${trackHeight === 180 ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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

              <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                <button
                  onClick={handleRestart}
                  className="w-full px-3 py-2.5 bg-gray-700 hover:bg-gray-600 border-2 border-yellow-600/40 hover:border-yellow-500/60 rounded transition-all flex items-center justify-center space-x-2 text-yellow-400 hover:text-yellow-300 font-semibold text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start Fresh</span>
                </button>
                <button
                  onClick={() => setShowResetPointsModal(true)}
                  className="w-full px-3 py-2.5 bg-gray-700 hover:bg-gray-600 border-2 border-red-600/40 hover:border-red-500/60 rounded transition-all flex items-center justify-center space-x-2 text-red-400 hover:text-red-300 font-semibold text-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Reset Transition Points</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden relative">
          {isLeftPanelCollapsed && (
            <button
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
              className="absolute left-2 top-4 z-10 bg-cyan-600 hover:bg-cyan-500 rounded p-1.5 transition-all shadow-lg"
            >
              <ChevronRight className="w-3 h-3 text-white" />
            </button>
          )}

          <div className="flex-1 flex flex-col p-4 overflow-auto">
            <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="space-y-8">
                <div style={{ height: `${trackHeight}px` }} className="relative">
                  <div className="flex items-center mb-2 space-x-2">
                    <div className="text-xs font-semibold text-cyan-400">Song A (Ending - Fade Out)</div>
                    <button
                      onClick={handlePlaySongA}
                      className="p-1 bg-cyan-600/20 hover:bg-cyan-600/30 rounded transition-colors"
                    >
                      {isPlayingSongA ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-cyan-400" />}
                    </button>
                  </div>
                  <div className="relative h-full bg-gray-900 rounded overflow-hidden timeline-container">
                    {transition && transition.songAClipStart !== undefined && transition.songAMarkerPoint !== undefined ? (
                      <ClippedWaveformDisplay
                        audioUrl={songA.url}
                        clipStart={transition.songAClipStart}
                        clipEnd={transition.songAMarkerPoint}
                        height={trackHeight - 32}
                        color="#3b82f6"
                        progressColor="#60a5fa"
                        zoom={zoomLevel / 100}
                        progress={playbackProgressA}
                        showScrubber={true}
                      />
                    ) : (
                      <WaveformDisplay
                        audioUrl={songA.url}
                        height={trackHeight - 32}
                        color="#3b82f6"
                        progressColor="#60a5fa"
                      />
                    )}

                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-20 shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-cyan-400 text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                        OUT
                      </div>
                    </div>

                    <div className="absolute inset-0 pointer-events-auto">
                      <KeyframeFadeEditor
                        keyframes={songAKeyframes}
                        onChange={handleSongAKeyframesChange}
                        color="#06b6d4"
                        direction="fadeOut"
                        height={trackHeight - 32}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ height: `${Math.max(80, trackHeight * 0.6)}px` }} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-purple-400 flex items-center space-x-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Transition</span>
                    </div>
                    {selectedTemplate && (
                      <button
                        onClick={handlePlayTransition}
                        className="p-1 bg-purple-600/20 hover:bg-purple-600/30 rounded transition-colors"
                      >
                        {isPlayingTransition ? <Pause className="w-3 h-3 text-purple-400" /> : <Play className="w-3 h-3 text-purple-400" />}
                      </button>
                    )}
                  </div>
                  <div
                    className="relative h-full rounded overflow-hidden transition-all duration-300 border"
                    style={{
                      background: selectedTemplate
                        ? 'linear-gradient(90deg, rgba(6,182,212,0.2) 0%, rgba(168,85,247,0.3) 50%, rgba(236,72,153,0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(17,24,39,0.8) 0%, rgba(31,41,55,0.9) 50%, rgba(17,24,39,0.8) 100%)',
                      borderColor: selectedTemplate
                        ? 'rgba(168,85,247,0.4)'
                        : 'rgba(75,85,99,0.3)',
                      boxShadow: selectedTemplate
                        ? '0 0 30px rgba(168,85,247,0.4), inset 0 0 30px rgba(168,85,247,0.1)'
                        : 'inset 0 0 20px rgba(0,0,0,0.2)'
                    }}
                  >
                    {selectedTemplate ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent animate-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-1">
                            <div className="flex items-center justify-center space-x-2">
                              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                              <span className="text-sm font-bold text-purple-300">{selectedTemplate.name}</span>
                              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                            </div>
                            <div className="text-xs text-purple-400">{transitionDuration}s transition</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/5 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">{transitionDuration}s transition</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ height: `${trackHeight}px` }} className="relative">
                  <div className="flex items-center mb-2 space-x-2">
                    <div className="text-xs font-semibold text-green-400">Song B (Beginning - Fade In)</div>
                    <button
                      onClick={handlePlaySongB}
                      className="p-1 bg-green-600/20 hover:bg-green-600/30 rounded transition-colors"
                    >
                      {isPlayingSongB ? <Pause className="w-3 h-3 text-green-400" /> : <Play className="w-3 h-3 text-green-400" />}
                    </button>
                  </div>
                  <div className="relative h-full bg-gray-900 rounded overflow-hidden timeline-container">
                    {transition && transition.songBMarkerPoint !== undefined && transition.songBClipEnd !== undefined ? (
                      <ClippedWaveformDisplay
                        audioUrl={songB.url}
                        clipStart={transition.songBMarkerPoint}
                        clipEnd={transition.songBClipEnd}
                        height={trackHeight - 32}
                        color="#10b981"
                        progressColor="#34d399"
                        zoom={zoomLevel / 100}
                        progress={playbackProgressB}
                        showScrubber={true}
                      />
                    ) : (
                      <WaveformDisplay
                        audioUrl={songB.url}
                        height={trackHeight - 32}
                        color="#10b981"
                        progressColor="#34d399"
                      />
                    )}

                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-400 pointer-events-none z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-green-400 text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                        IN
                      </div>
                    </div>

                    <div className="absolute inset-0 pointer-events-auto">
                      <KeyframeFadeEditor
                        keyframes={songBKeyframes}
                        onChange={handleSongBKeyframesChange}
                        color="#10b981"
                        direction="fadeIn"
                        height={trackHeight - 32}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div
                className={`bg-gray-800 border border-gray-700 rounded-lg transition-all duration-300 ${
                  isTemplatesExpanded ? 'p-4' : 'p-2'
                }`}
              >
                {!isTemplatesExpanded ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      {selectedTemplate ? (
                        <div className="flex items-center space-x-2">
                          <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/40 rounded-full">
                            <span className="text-xs font-semibold text-purple-300">{selectedTemplate.name}</span>
                          </div>
                          <span className="text-xs text-gray-400">Selected</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No template selected</span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsTemplatesExpanded(true)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded transition-colors"
                    >
                      <span className="text-xs font-semibold text-white">Browse Templates</span>
                      <ChevronDown className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h3 className="text-sm font-semibold text-white">Select Template ({filteredTemplates.length})</h3>
                      </div>
                      <button
                        onClick={() => setIsTemplatesExpanded(false)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                      >
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBackDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Save Changes?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Changes will be saved automatically. Return to song selection?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBackDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-semibold transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={() => {
                  setShowBackDialog(false);
                  onBack();
                }}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-semibold transition-colors"
              >
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      )}

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

      {showResetPointsModal && (
        <ResetTransitionPointsModal
          onConfirm={() => {
            setShowResetPointsModal(false);
            if (onResetPoints) {
              onResetPoints();
            }
          }}
          onCancel={() => setShowResetPointsModal(false)}
        />
      )}
    </div>
  );
};

export default TransitionEditorView;
