import React, { useState } from 'react';
import {
  Scissors, Check, ChevronRight, Zap, Clock, Timer,
  Sparkles, ArrowRight
} from 'lucide-react';
import { TemplateData } from '../../lib/database';
import { transitionsService } from '../../lib/transitionsService';
import TemplateGallery from '../TemplateGallery';
import { SONG_LETTERS, SONG_COLORS } from './constants';
import { TransitionPairConfig } from './types';
import { useIsMobile } from '../../hooks/useIsMobile';

type DurationSize = 'short' | 'medium' | 'long';

const DURATION_RANGES: Record<DurationSize, { min: number; max: number; default: number }> = {
  short: { min: 4, max: 8, default: 6 },
  medium: { min: 8, max: 15, default: 12 },
  long: { min: 16, max: 25, default: 20 },
};

const getDurationSizeFromValue = (duration: number): DurationSize => {
  if (duration >= 4 && duration <= 8) return 'short';
  if (duration > 8 && duration <= 15) return 'medium';
  return 'long';
};

const DEFAULT_FADE_KEYFRAMES = {
  songAOut: [
    { position: 0, value: 1 },
    { position: 0.7, value: 1 },
    { position: 1, value: 0 },
  ],
  songBIn: [
    { position: 0, value: 0 },
    { position: 0.3, value: 1 },
    { position: 1, value: 1 },
  ],
  transitionFadeIn: [
    { position: 0, value: 0 },
    { position: 0.3, value: 1 },
    { position: 1, value: 1 },
  ],
  transitionFadeOut: [
    { position: 0, value: 1 },
    { position: 0.7, value: 1 },
    { position: 1, value: 0 },
  ],
};

interface TransitionTemplatesStepProps {
  pairs: TransitionPairConfig[];
  onPairsChange: (pairs: TransitionPairConfig[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

const TransitionTemplatesStep: React.FC<TransitionTemplatesStepProps> = ({
  pairs,
  onPairsChange,
  onContinue,
  onBack,
}) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [durationSizes, setDurationSizes] = useState<DurationSize[]>(
    pairs.map(p => getDurationSizeFromValue(p.transitionDuration))
  );

  const allPairsConfigured = pairs.every(p => p.directCut || p.selectedTemplate !== null);
  const configuredCount = pairs.filter(p => p.directCut || p.selectedTemplate !== null).length;

  const updatePair = (index: number, updates: Partial<TransitionPairConfig>) => {
    const newPairs = [...pairs];
    newPairs[index] = { ...newPairs[index], ...updates };
    onPairsChange(newPairs);
  };

  const handleTemplateSelect = (pairIndex: number, template: TemplateData) => {
    updatePair(pairIndex, {
      selectedTemplate: template,
      directCut: false,
      transitionDuration: template.duration,
    });
    const newSizes = [...durationSizes];
    newSizes[pairIndex] = getDurationSizeFromValue(template.duration);
    setDurationSizes(newSizes);
  };

  const handleDirectCutToggle = (pairIndex: number, enabled: boolean) => {
    updatePair(pairIndex, {
      directCut: enabled,
      selectedTemplate: enabled ? null : pairs[pairIndex].selectedTemplate,
    });
  };

  const handleDurationChange = (pairIndex: number, size: DurationSize) => {
    const newSizes = [...durationSizes];
    newSizes[pairIndex] = size;
    setDurationSizes(newSizes);
    updatePair(pairIndex, { transitionDuration: DURATION_RANGES[size].default });
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      for (const pair of pairs) {
        const transition = await transitionsService.getTransition(pair.transitionId);

        if (pair.directCut) {
          await transitionsService.updateTransition(pair.transitionId, {
            status: 'ready',
            templateId: null,
            transitionDuration: 0,
            metadata: {
              ...transition.metadata,
              directCut: true,
              blenderOutput: {
                songASegment: {
                  clipStart: transition.songAClipStart,
                  clipEnd: transition.songAMarkerPoint,
                },
                songBSegment: {
                  clipStart: transition.songBMarkerPoint,
                  clipEnd: transition.songBClipEnd,
                },
                directCut: true,
                version: '1.0',
                createdAt: new Date().toISOString(),
              },
            },
          });
        } else if (pair.selectedTemplate) {
          await transitionsService.updateTransition(pair.transitionId, {
            templateId: pair.selectedTemplate.id,
            transitionDuration: pair.transitionDuration,
            status: 'ready',
            metadata: {
              ...transition.metadata,
              songAKeyframes: DEFAULT_FADE_KEYFRAMES.songAOut,
              songBKeyframes: DEFAULT_FADE_KEYFRAMES.songBIn,
              songAFadeCurve: 'smooth',
              songBFadeCurve: 'smooth',
              transitionFadeInKeyframes: DEFAULT_FADE_KEYFRAMES.transitionFadeIn,
              transitionFadeOutKeyframes: DEFAULT_FADE_KEYFRAMES.transitionFadeOut,
              transitionFadeCurve: 'smooth',
              templateAudioUrl: pair.selectedTemplate.templateData?.previewUrl || null,
              templateName: pair.selectedTemplate.name,
              blenderOutput: {
                songASegment: {
                  clipStart: transition.songAClipStart,
                  clipEnd: transition.songAMarkerPoint,
                  fadeOutKeyframes: DEFAULT_FADE_KEYFRAMES.songAOut,
                  fadeCurve: 'smooth',
                },
                templateSegment: {
                  audioUrl: pair.selectedTemplate.templateData?.previewUrl || null,
                  duration: pair.transitionDuration,
                  fadeInKeyframes: DEFAULT_FADE_KEYFRAMES.transitionFadeIn,
                  fadeOutKeyframes: DEFAULT_FADE_KEYFRAMES.transitionFadeOut,
                  fadeCurve: 'smooth',
                  templateName: pair.selectedTemplate.name,
                  templateId: pair.selectedTemplate.id,
                },
                songBSegment: {
                  clipStart: transition.songBMarkerPoint,
                  clipEnd: transition.songBClipEnd,
                  fadeInKeyframes: DEFAULT_FADE_KEYFRAMES.songBIn,
                  fadeCurve: 'smooth',
                },
                version: '1.0',
                createdAt: new Date().toISOString(),
              },
            },
          });
        }
      }
      onContinue();
    } catch (error) {
      console.error('Failed to save template configurations:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="text-center mb-2">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-1`}>
          Choose Transition Templates
        </h2>
        <p className="text-sm text-gray-400">
          Configure each transition below, or use Direct Cut for a clean splice
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gray-800/60 rounded-full border border-gray-700/50">
          <span className="text-xs text-gray-400">
            {configuredCount} of {pairs.length} configured
          </span>
          <div className="flex gap-1">
            {pairs.map((p, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  p.directCut || p.selectedTemplate ? 'bg-teal-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {pairs.map((pair, index) => (
          <PairTemplateCard
            key={pair.transitionId}
            pair={pair}
            pairIndex={index}
            durationSize={durationSizes[index]}
            onTemplateSelect={(t) => handleTemplateSelect(index, t)}
            onDirectCutToggle={(enabled) => handleDirectCutToggle(index, enabled)}
            onDurationChange={(size) => handleDurationChange(index, size)}
            isMobile={isMobile}
          />
        ))}
      </div>

      <div className="flex justify-center pt-4 pb-8">
        <button
          onClick={handleContinue}
          disabled={!allPairsConfigured || saving}
          className="w-full max-w-md px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
        >
          <span className="text-lg">
            {saving ? 'Saving...' : 'Review & Confirm'}
          </span>
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

const PairTemplateCard: React.FC<{
  pair: TransitionPairConfig;
  pairIndex: number;
  durationSize: DurationSize;
  onTemplateSelect: (template: TemplateData) => void;
  onDirectCutToggle: (enabled: boolean) => void;
  onDurationChange: (size: DurationSize) => void;
  isMobile: boolean;
}> = ({ pair, pairIndex, durationSize, onTemplateSelect, onDirectCutToggle, onDurationChange, isMobile }) => {
  const colorsA = SONG_COLORS[pair.songAIndex % SONG_COLORS.length];
  const colorsB = SONG_COLORS[pair.songBIndex % SONG_COLORS.length];
  const letterA = SONG_LETTERS[pair.songAIndex];
  const letterB = SONG_LETTERS[pair.songBIndex];
  const isConfigured = pair.directCut || pair.selectedTemplate !== null;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isConfigured
          ? 'border-teal-500/30 bg-gray-800/80'
          : 'border-gray-700 bg-gray-800/50'
      }`}
      style={isConfigured ? { boxShadow: '0 0 20px rgba(20,184,166,0.08)' } : undefined}
    >
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorsA.bg}`}>
              <span className="text-white font-bold text-xs">{letterA}</span>
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[100px]" title={pair.songA.originalName}>
              {pair.songA.originalName}
            </span>
            <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorsB.bg}`}>
              <span className="text-white font-bold text-xs">{letterB}</span>
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[100px]" title={pair.songB.originalName}>
              {pair.songB.originalName}
            </span>
          </div>
          {isConfigured && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
              <Check size={12} className="text-teal-400" />
              <span className="text-[10px] text-teal-400 font-medium">
                {pair.directCut ? 'Direct Cut' : pair.selectedTemplate?.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDirectCutToggle(!pair.directCut)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all font-medium text-sm ${
              pair.directCut
                ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            <Scissors size={16} />
            <span>Direct Cut</span>
            {pair.directCut && <Check size={14} className="ml-1" />}
          </button>

          {!pair.directCut && (
            <div className="flex gap-1.5 flex-1">
              {(['short', 'medium', 'long'] as DurationSize[]).map(size => {
                const icons = { short: Zap, medium: Clock, long: Timer };
                const Icon = icons[size];
                const isActive = durationSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => onDurationChange(size)}
                    className={`flex-1 py-2 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="text-[11px] font-medium capitalize">{size}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {pair.directCut && (
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 text-center">
            <Scissors size={20} className="text-teal-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">
              Songs will be joined with a clean splice -- no transition effect
            </p>
          </div>
        )}

        {!pair.directCut && pair.selectedTemplate && (
          <div className="bg-gray-900/50 rounded-lg p-3 border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{pair.selectedTemplate.name}</p>
                <p className="text-[10px] text-cyan-400/80">{pair.selectedTemplate.duration}s</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0 ml-3">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onDirectCutToggle(true)}
                className="sr-only peer"
              />
              <div className="relative w-8 h-4.5 bg-gray-700 peer-checked:bg-teal-500 rounded-full transition-colors">
                <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-gray-400 rounded-full transition-transform peer-checked:translate-x-3.5 peer-checked:bg-white" />
              </div>
              <span className="text-[10px] text-gray-500">Cut</span>
            </label>
          </div>
        )}

        {!pair.directCut && (
          <div className="relative rounded-lg overflow-hidden border border-gray-700/50">
            <div className="bg-gray-800/60 px-3 py-2 flex items-center justify-between border-b border-gray-700/30">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                <span className="text-[11px] font-medium text-gray-300">Templates</span>
              </div>
              <span className="text-[10px] text-gray-500">
                {DURATION_RANGES[durationSize].min}-{DURATION_RANGES[durationSize].max}s
              </span>
            </div>
            <div className={`${isMobile ? 'max-h-[35vh]' : 'max-h-[30vh]'} overflow-y-auto p-2`}>
              <TemplateGallery
                onSelectTemplate={onTemplateSelect}
                compact={true}
                trackA={pair.songA}
                trackB={pair.songB}
                durationFilter={durationSize}
                selectedTemplateId={pair.selectedTemplate?.id}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitionTemplatesStep;
