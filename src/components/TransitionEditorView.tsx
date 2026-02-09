import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Sparkles, Zap, Clock, Timer,
  ChevronRight, ChevronDown, ChevronUp,
  Play, Pause, Check
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
import BlenderConfirmationScreen from './blender/BlenderConfirmationScreen';
import BlenderProcessingScreen from './blender/BlenderProcessingScreen';
import BlenderCompletionScreen from './blender/BlenderCompletionScreen';
import { BlendData } from '../lib/blendExportService';
import { useIsMobile } from '../hooks/useIsMobile';

interface TransitionEditorViewProps {
  songA: UploadResult;
  songB: UploadResult;
  transitionId: string;
  onBack: () => void;
  onSave: () => void;
  onResetPoints?: () => void;
  onNavigateToLibrary?: () => void;
}

type DurationSize = 'short' | 'medium' | 'long';
type EditorScreen = 'template-selection' | 'blender-confirmation' | 'blender-processing' | 'blender-completion';

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

export const TransitionEditorView: React.FC<TransitionEditorViewProps> = ({
  songA,
  songB,
  transitionId,
  onBack,
  onSave: onSaveCallback,
  onNavigateToLibrary,
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [currentScreen, setCurrentScreen] = useState<EditorScreen>('template-selection');
  const [transition, setTransition] = useState<TransitionData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [durationSize, setDurationSize] = useState<DurationSize>('medium');
  const [transitionDuration, setTransitionDuration] = useState(12);
  const [aiRecommendations, setAiRecommendations] = useState<TemplateRecommendation[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createdBlend, setCreatedBlend] = useState<BlendData | null>(null);
  const [aiToastMessage, setAiToastMessage] = useState<string | null>(null);

  const [templateAudioUrl, setTemplateAudioUrl] = useState<string | null>(null);
  const [isPlayingTemplate, setIsPlayingTemplate] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const playbackProgressRef = useRef(0);

  useEffect(() => {
    loadData();
  }, [transitionId]);

  useEffect(() => {
    if (transition) {
      setTransitionDuration(transition.transitionDuration);
      setDurationSize(getDurationSizeFromValue(transition.transitionDuration));
      if (transition.metadata?.templateAudioUrl) {
        setTemplateAudioUrl(transition.metadata.templateAudioUrl);
      }
    }
  }, [transition]);

  useEffect(() => {
    return () => {
      playerRef.current?.dispose();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
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
          if (template.templateData?.previewUrl) {
            setTemplateAudioUrl(template.templateData.previewUrl);
          }
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

    stopTemplatePlayback();
    setSelectedTemplate(template);

    if (template.templateData?.previewUrl) {
      setTemplateAudioUrl(template.templateData.previewUrl);
    }

    try {
      await transitionsService.updateTransition(transitionId, {
        templateId: template.id,
        transitionDuration: template.duration,
        metadata: {
          ...transition.metadata,
          templateName: template.name,
          templateAudioUrl: template.templateData?.previewUrl || null
        }
      });

      setTransitionDuration(template.duration);
      setDurationSize(getDurationSizeFromValue(template.duration));

      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDurationChange = async (size: DurationSize) => {
    if (!transition) return;

    const newDuration = DURATION_RANGES[size].default;
    setDurationSize(size);
    setTransitionDuration(newDuration);

    try {
      await transitionsService.updateTransition(transitionId, {
        transitionDuration: newDuration,
        metadata: {
          ...transition.metadata,
          durationSize: size
        }
      });

      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
    } catch (error) {
      console.error('Failed to update duration:', error);
    }
  };

  const loadWaveformPeaks = async (url: string) => {
    setWaveformLoading(true);
    setWaveformPeaks([]);
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const rawData = audioBuffer.getChannelData(0);
      const barCount = 200;
      const blockSize = Math.floor(rawData.length / barCount);
      const peaks: number[] = [];

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        const start = i * blockSize;
        for (let j = start; j < start + blockSize && j < rawData.length; j++) {
          sum += Math.abs(rawData[j]);
        }
        peaks.push(sum / blockSize);
      }

      const maxPeak = Math.max(...peaks, 0.01);
      const normalized = peaks.map(p => p / maxPeak);
      setWaveformPeaks(normalized);
      audioContext.close();
    } catch (error) {
      console.error('Failed to load waveform:', error);
    } finally {
      setWaveformLoading(false);
    }
  };

  const drawStaticWaveform = useCallback((peaks: number[], progress: number) => {
    if (!canvasRef.current || peaks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = displayWidth;
    const height = displayHeight;

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / peaks.length;
    const gap = Math.max(1, barWidth * 0.15);
    const barDrawWidth = barWidth - gap;
    const playheadX = progress * width;
    const minBarHeight = 2;

    peaks.forEach((peak, i) => {
      const barHeight = Math.max(peak * (height * 0.85), minBarHeight);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      const barMidX = x + barDrawWidth / 2;

      if (barMidX < playheadX) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.95)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.95)');
        ctx.fillStyle = gradient;
      } else {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.35)');
        ctx.fillStyle = gradient;
      }

      ctx.beginPath();
      const radius = Math.min(barDrawWidth / 2, 2);
      ctx.roundRect(x, y, barDrawWidth, barHeight, radius);
      ctx.fill();
    });

    if (progress > 0) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(playheadX, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    if (waveformPeaks.length > 0) {
      drawStaticWaveform(waveformPeaks, playbackProgress);
    }
  }, [waveformPeaks, playbackProgress, drawStaticWaveform]);

  useEffect(() => {
    if (templateAudioUrl && selectedTemplate) {
      loadWaveformPeaks(templateAudioUrl);
    }
  }, [templateAudioUrl, selectedTemplate?.id]);

  const startPlayheadAnimation = (duration: number) => {
    const startTime = Tone.now();
    const animate = () => {
      const elapsed = Tone.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      playbackProgressRef.current = progress;
      setPlaybackProgress(progress);

      if (progress >= 1) {
        stopTemplatePlayback();
        return;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handlePlayTemplate = async () => {
    if (!templateAudioUrl || !selectedTemplate) return;

    await Tone.start();

    if (isPlayingTemplate) {
      stopTemplatePlayback();
      return;
    }

    try {
      const player = new Tone.Player(templateAudioUrl, () => {
        player.toDestination();
        player.start();
        setIsPlayingTemplate(true);
        setPlaybackProgress(0);
        playbackProgressRef.current = 0;
        startPlayheadAnimation(selectedTemplate.duration);

        player.onstop = () => {
          setIsPlayingTemplate(false);
          setPlaybackProgress(0);
          playbackProgressRef.current = 0;
          player.dispose();
          playerRef.current = null;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        };
      });
      playerRef.current = player;
    } catch (error) {
      console.error('Failed to play template:', error);
      setIsPlayingTemplate(false);
      setPlaybackProgress(0);
    }
  };

  const stopTemplatePlayback = () => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
      playerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsPlayingTemplate(false);
    setPlaybackProgress(0);
    playbackProgressRef.current = 0;
  };

  const handleAIAnalysisComplete = (recommendations: TemplateRecommendation[]) => {
    setAiRecommendations(recommendations);
    setShowAIRecommendations(true);

    if (recommendations.length > 0 && recommendations[0].template) {
      handleTemplateSelect(recommendations[0].template);
      setAiToastMessage(`AI selected: ${recommendations[0].template.name} -- ${recommendations[0].compatibilityScore}% match`);
      setTimeout(() => setAiToastMessage(null), 4000);
    }
  };

  const handleNext = async () => {
    if (!selectedTemplate || !transition || !user) return;

    stopTemplatePlayback();

    const defaultSongAKeyframes = [
      { position: 0, value: 1 },
      { position: 0.7, value: 1 },
      { position: 1, value: 0 }
    ];
    const defaultSongBKeyframes = [
      { position: 0, value: 0 },
      { position: 0.3, value: 1 },
      { position: 1, value: 1 }
    ];
    const defaultTransitionFadeIn = [
      { position: 0, value: 0 },
      { position: 0.3, value: 1 },
      { position: 1, value: 1 }
    ];
    const defaultTransitionFadeOut = [
      { position: 0, value: 1 },
      { position: 0.7, value: 1 },
      { position: 1, value: 0 }
    ];

    try {
      await transitionsService.updateTransition(transitionId, {
        status: 'ready',
        metadata: {
          ...transition.metadata,
          songAKeyframes: defaultSongAKeyframes,
          songBKeyframes: defaultSongBKeyframes,
          songAFadeCurve: 'smooth',
          songBFadeCurve: 'smooth',
          transitionFadeInKeyframes: defaultTransitionFadeIn,
          transitionFadeOutKeyframes: defaultTransitionFadeOut,
          transitionFadeCurve: 'smooth',
          templateAudioUrl,
          templateName: selectedTemplate.name,
          blenderOutput: {
            songASegment: {
              clipStart: transition.songAClipStart,
              clipEnd: transition.songAMarkerPoint,
              fadeOutKeyframes: defaultSongAKeyframes,
              fadeCurve: 'smooth'
            },
            templateSegment: {
              audioUrl: templateAudioUrl,
              duration: transitionDuration,
              fadeInKeyframes: defaultTransitionFadeIn,
              fadeOutKeyframes: defaultTransitionFadeOut,
              fadeCurve: 'smooth',
              templateName: selectedTemplate.name,
              templateId: selectedTemplate.id
            },
            songBSegment: {
              clipStart: transition.songBMarkerPoint,
              clipEnd: transition.songBClipEnd,
              fadeInKeyframes: defaultSongBKeyframes,
              fadeCurve: 'smooth'
            },
            version: '1.0',
            createdAt: new Date().toISOString()
          }
        }
      });

      const updatedTransition = await transitionsService.getTransition(transitionId);
      setTransition(updatedTransition);
      setCurrentScreen('blender-confirmation');
    } catch (error) {
      console.error('Failed to save transition:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleBlendComplete = (blend: BlendData) => {
    setCreatedBlend(blend);
    setCurrentScreen('blender-completion');
  };

  if (loading || !transition) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentScreen === 'blender-confirmation') {
    return (
      <BlenderConfirmationScreen
        transition={transition}
        songA={songA}
        songB={songB}
        selectedTemplate={selectedTemplate}
        transitionDuration={transitionDuration}
        onConfirm={() => setCurrentScreen('blender-processing')}
        onBack={() => setCurrentScreen('template-selection')}
      />
    );
  }

  if (currentScreen === 'blender-processing') {
    return (
      <BlenderProcessingScreen
        transition={transition}
        onComplete={handleBlendComplete}
        onBack={() => setCurrentScreen('blender-confirmation')}
      />
    );
  }

  if (currentScreen === 'blender-completion' && createdBlend) {
    return (
      <BlenderCompletionScreen
        blend={createdBlend}
        onCreateAnother={() => onSaveCallback()}
        onGoToLibrary={() => {
          if (onNavigateToLibrary) {
            onNavigateToLibrary();
          } else {
            onSaveCallback();
          }
        }}
      />
    );
  }

  const filteredTemplates = templates.filter(t => {
    const templateDuration = t.duration || 12;
    const size = getDurationSizeFromValue(templateDuration);
    return size === durationSize;
  });

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      <div className="bg-gray-800/90 backdrop-blur-sm border-b border-cyan-500/20 px-4 py-2.5 flex-shrink-0"
        style={{ boxShadow: '0 1px 20px rgba(6,182,212,0.1)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">{transition.name}</h1>
              <p className="text-xs text-cyan-400/80">Choose Your Transition</p>
            </div>
          </div>

          <AIPowerButton
            uploadIdA={songA.id}
            uploadIdB={songB.id}
            onAnalysisComplete={handleAIAnalysisComplete}
            onError={(errorMsg) => alert(errorMsg)}
          />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-36' : 'pb-16'}`}>
        <SongInfoBar songA={songA} songB={songB} transitionDuration={transitionDuration} />

        <div className={`px-4 ${isMobile ? 'py-2' : 'py-3'}`}>
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="text-center">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white mb-0.5`}>
                Select a Transition Template
              </h2>
              <p className="text-xs text-gray-400">
                Browse and preview templates to find the perfect transition for your mash up
              </p>
            </div>

            <DurationTabs
              activeSize={durationSize}
              onChange={handleDurationChange}
              counts={{
                short: templates.filter(t => getDurationSizeFromValue(t.duration || 12) === 'short').length,
                medium: templates.filter(t => getDurationSizeFromValue(t.duration || 12) === 'medium').length,
                long: templates.filter(t => getDurationSizeFromValue(t.duration || 12) === 'long').length,
              }}
            />

            {selectedTemplate && (
              <SelectedTemplateCard
                template={selectedTemplate}
                isPlaying={isPlayingTemplate}
                onPlayToggle={handlePlayTemplate}
                onClear={() => {
                  stopTemplatePlayback();
                  setSelectedTemplate(null);
                  setWaveformPeaks([]);
                }}
                canvasRef={canvasRef}
                playbackProgress={playbackProgress}
                waveformLoading={waveformLoading}
                hasWaveform={waveformPeaks.length > 0}
              />
            )}

            {showAIRecommendations && aiRecommendations.length > 0 && (
              <AIRecommendationsPanel
                recommendations={aiRecommendations}
                onSelectTemplate={(templateId) => {
                  const rec = aiRecommendations.find(r => r.templateId === templateId);
                  if (rec?.template) handleTemplateSelect(rec.template);
                }}
                onClose={() => setShowAIRecommendations(false)}
                isVisible={showAIRecommendations}
              />
            )}

            <div className="relative rounded-xl overflow-hidden"
              style={{
                boxShadow: '0 0 30px rgba(6,182,212,0.15), 0 0 60px rgba(59,130,246,0.08)',
                border: '1px solid rgba(6,182,212,0.25)',
              }}
            >
              <div className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.05) 50%, rgba(6,182,212,0.08) 100%)',
                }}
              />
              <div className="relative bg-gray-800/80 backdrop-blur-sm p-3 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-white">
                      Templates ({filteredTemplates.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {durationSize === 'short' ? `${DURATION_RANGES.short.min}-${DURATION_RANGES.short.max}s` :
                     durationSize === 'medium' ? `${DURATION_RANGES.medium.min}-${DURATION_RANGES.medium.max}s` :
                     `${DURATION_RANGES.long.min}-${DURATION_RANGES.long.max}s`}
                  </span>
                </div>
                <div className={`${isMobile ? 'max-h-[60vh]' : 'max-h-[65vh]'} overflow-y-auto`}>
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
        </div>
      </div>

      <div className={`fixed left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg border-t border-cyan-500/20 ${isMobile ? 'bottom-[4.5rem]' : 'bottom-0'}`}
        style={{
          paddingBottom: isMobile ? 'max(0.5rem, env(safe-area-inset-bottom))' : '0.5rem',
          boxShadow: '0 -4px 30px rgba(6,182,212,0.1)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex-1">
            {!selectedTemplate && (
              <p className="text-xs text-gray-500">Select a template to continue</p>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={!selectedTemplate}
            className={`
              px-8 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 flex items-center space-x-2
              ${selectedTemplate
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:from-cyan-400 hover:to-blue-400 hover:scale-[1.02]'
                : 'bg-gray-700/80 text-gray-500 cursor-not-allowed'
              }
            `}
            style={selectedTemplate ? {
              boxShadow: '0 0 15px rgba(6,182,212,0.3), 0 4px 10px rgba(6,182,212,0.2)',
            } : undefined}
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {aiToastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-800 border border-cyan-500/40 rounded-lg px-4 py-2.5 shadow-lg shadow-cyan-500/20 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-white font-medium">{aiToastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const SongInfoBar: React.FC<{
  songA: UploadResult;
  songB: UploadResult;
  transitionDuration: number;
}> = ({ songA, songB, transitionDuration }) => {
  return (
    <div className="bg-gray-800/50 border-b border-gray-700/50 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-cyan-400">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">{songA.originalName}</p>
            <div className="flex items-center space-x-1.5">
              {songA.analysis?.bpm && (
                <span className="text-[9px] text-cyan-400">{Math.round(songA.analysis.bpm)} BPM</span>
              )}
              {songA.analysis?.key && (
                <span className="text-[9px] text-gray-500">{songA.analysis.key}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0 px-2">
          <div className="w-5 h-px bg-gray-600" />
          <div className="text-[9px] text-gray-400 font-medium whitespace-nowrap">{transitionDuration}s</div>
          <div className="w-5 h-px bg-gray-600" />
        </div>

        <div className="flex items-center space-x-2 min-w-0 flex-1 justify-end">
          <div className="min-w-0 text-right">
            <p className="text-xs text-white font-medium truncate">{songB.originalName}</p>
            <div className="flex items-center space-x-1.5 justify-end">
              {songB.analysis?.bpm && (
                <span className="text-[9px] text-green-400">{Math.round(songB.analysis.bpm)} BPM</span>
              )}
              {songB.analysis?.key && (
                <span className="text-[9px] text-gray-500">{songB.analysis.key}</span>
              )}
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-green-400">B</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DurationTabs: React.FC<{
  activeSize: DurationSize;
  onChange: (size: DurationSize) => void;
  counts: Record<DurationSize, number>;
}> = ({ activeSize, onChange, counts }) => {
  const tabs: { id: DurationSize; label: string; icon: React.ElementType; range: string }[] = [
    { id: 'short', label: 'Short', icon: Zap, range: '4-8s' },
    { id: 'medium', label: 'Medium', icon: Clock, range: '8-15s' },
    { id: 'long', label: 'Long', icon: Timer, range: '16-25s' },
  ];

  return (
    <div className="flex space-x-2">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeSize === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 py-2 px-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-0.5
              ${isActive
                ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }
            `}
            style={isActive ? { boxShadow: '0 0 12px rgba(6,182,212,0.12)' } : undefined}
          >
            <div className="flex items-center space-x-1.5">
              <Icon className={`w-3 h-3 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
              <span className={`text-xs font-semibold ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                {tab.label}
              </span>
            </div>
            <span className={`text-[10px] ${isActive ? 'text-cyan-400/70' : 'text-gray-500'}`}>
              {tab.range} ({counts[tab.id]})
            </span>
          </button>
        );
      })}
    </div>
  );
};

const SelectedTemplateCard: React.FC<{
  template: TemplateData;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onClear: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  playbackProgress: number;
  waveformLoading: boolean;
  hasWaveform: boolean;
}> = ({ template, isPlaying, onPlayToggle, onClear, canvasRef, waveformLoading, hasWaveform }) => {
  return (
    <div className="relative rounded-lg overflow-hidden"
      style={{
        boxShadow: '0 0 20px rgba(6,182,212,0.15), 0 0 40px rgba(59,130,246,0.08)',
        border: '1px solid rgba(6,182,212,0.3)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none animate-pulse"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, transparent 50%, rgba(59,130,246,0.04) 100%)',
        }}
      />
      <div className="relative bg-gray-800/90">
        <div className="p-3 flex items-center justify-between border-b border-gray-700/50">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{template.name}</p>
              <p className="text-[10px] text-cyan-400/80">{template.duration}s -- Selected Template</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {template.templateData?.previewUrl && (
              <button
                onClick={onPlayToggle}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                  ${isPlaying
                    ? 'bg-cyan-500 shadow-lg shadow-cyan-500/40'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30'
                  }
                `}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 text-white" />
                  : <Play className="w-4 h-4 text-cyan-400 ml-0.5" />
                }
              </button>
            )}
            <button
              onClick={onClear}
              className="text-[10px] text-gray-400 hover:text-white transition-colors px-2 py-1"
            >
              Change
            </button>
          </div>
        </div>

        <div className="p-3 bg-gray-900/30">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-16 rounded-md"
              style={{
                background: 'linear-gradient(to bottom, rgba(6,182,212,0.03), rgba(59,130,246,0.03))',
              }}
            />
            {waveformLoading && !hasWaveform && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-gray-500">Loading waveform...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitionEditorView;
