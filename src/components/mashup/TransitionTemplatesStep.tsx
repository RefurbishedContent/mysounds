import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { TemplateData } from '../../lib/database';
import { transitionsService } from '../../lib/transitionsService';
import { TransitionPairConfig } from './types';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SongTimelineRow } from './SongTimelineRow';
import { TransitionConnector } from './TransitionConnector';
import { EffectsPanel } from './EffectsPanel';

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

interface ClipData {
  songAClipStart: number;
  songAClipEnd: number;
  songBClipStart: number;
  songBClipEnd: number;
}

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
}) => {
  const isMobile = useIsMobile();
  const [saving, setSaving] = useState(false);
  const [expandedPanelIndex, setExpandedPanelIndex] = useState<number | null>(null);
  const [clipData, setClipData] = useState<Record<string, ClipData>>({});

  const allPairsConfigured = pairs.every(p => p.directCut || p.selectedTemplate !== null);
  const configuredCount = pairs.filter(p => p.directCut || p.selectedTemplate !== null).length;

  useEffect(() => {
    const loadClipData = async () => {
      const data: Record<string, ClipData> = {};
      for (const pair of pairs) {
        try {
          const transition = await transitionsService.getTransition(pair.transitionId);
          data[pair.transitionId] = {
            songAClipStart: transition.songAClipStart ?? 0,
            songAClipEnd: transition.songAMarkerPoint ?? (pair.songA.duration || 30),
            songBClipStart: transition.songBMarkerPoint ?? 0,
            songBClipEnd: transition.songBClipEnd ?? (pair.songB.duration || 30),
          };
        } catch (error) {
          console.error('Failed to load clip data:', error);
          data[pair.transitionId] = {
            songAClipStart: 0,
            songAClipEnd: pair.songA.duration || 30,
            songBClipStart: 0,
            songBClipEnd: pair.songB.duration || 30,
          };
        }
      }
      setClipData(data);
    };

    loadClipData();
  }, [pairs]);

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
    setExpandedPanelIndex(null);
  };

  const handleDirectCutToggle = (pairIndex: number, enabled: boolean) => {
    updatePair(pairIndex, {
      directCut: enabled,
      selectedTemplate: enabled ? null : pairs[pairIndex].selectedTemplate,
    });
    if (enabled) {
      setExpandedPanelIndex(null);
    }
  };

  const handleClearTemplate = (pairIndex: number) => {
    updatePair(pairIndex, {
      selectedTemplate: null,
      directCut: true
    });
  };

  const handleToggleExpand = (pairIndex: number) => {
    setExpandedPanelIndex(expandedPanelIndex === pairIndex ? null : pairIndex);
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
      <div className="text-center mb-4">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-1`}>
          Mash It Up
        </h2>
        <p className="text-sm text-gray-400">
          Use Direct Cut for a clean splice, or add effects to blend your songs
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

      <div className="space-y-1">
        {pairs.map((pair, pairIndex) => {
          const clip = clipData[pair.transitionId];
          const isConfigured = pair.directCut || pair.selectedTemplate !== null;
          const isExpanded = expandedPanelIndex === pairIndex;
          const isLastPair = pairIndex === pairs.length - 1;

          return (
            <React.Fragment key={pair.transitionId}>
              {pairIndex === 0 && (
                <SongTimelineRow
                  song={pair.songA}
                  songIndex={pair.songAIndex}
                  clipStart={clip?.songAClipStart ?? 0}
                  clipEnd={clip?.songAClipEnd ?? (pair.songA.duration || 30)}
                  isConfigured={isConfigured}
                  isExpanded={isExpanded}
                  onToggleExpand={() => handleToggleExpand(pairIndex)}
                  isMobile={isMobile}
                />
              )}

              <TransitionConnector
                songAIndex={pair.songAIndex}
                songBIndex={pair.songBIndex}
                isConfigured={isConfigured}
                isDirectCut={pair.directCut}
                effectName={pair.selectedTemplate?.name || null}
                onClick={() => handleToggleExpand(pairIndex)}
                isMobile={isMobile}
              />

              <EffectsPanel
                isExpanded={isExpanded}
                songA={pair.songA}
                songB={pair.songB}
                selectedTemplate={pair.selectedTemplate}
                directCut={pair.directCut}
                transitionDuration={pair.transitionDuration}
                onTemplateSelect={(t) => handleTemplateSelect(pairIndex, t)}
                onDirectCutToggle={(enabled) => handleDirectCutToggle(pairIndex, enabled)}
                onClearTemplate={() => handleClearTemplate(pairIndex)}
                isMobile={isMobile}
              />

              <SongTimelineRow
                song={pair.songB}
                songIndex={pair.songBIndex}
                clipStart={clip?.songBClipStart ?? 0}
                clipEnd={clip?.songBClipEnd ?? (pair.songB.duration || 30)}
                isConfigured={isLastPair ? true : (pairs[pairIndex + 1]?.directCut || pairs[pairIndex + 1]?.selectedTemplate !== null)}
                isExpanded={isLastPair ? false : expandedPanelIndex === pairIndex + 1}
                onToggleExpand={() => !isLastPair && handleToggleExpand(pairIndex + 1)}
                isMobile={isMobile}
              />
            </React.Fragment>
          );
        })}
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

export default TransitionTemplatesStep;
