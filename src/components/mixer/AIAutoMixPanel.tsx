import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  SkipForward,
  ChevronsRight,
  Sparkles,
  Activity,
  Zap,
  Heart,
  Flame,
  CloudMoon
} from 'lucide-react';
import { MixerTheme } from '../../lib/themeUtils';
import { AIAutoMixConfirmModal } from './AIAutoMixConfirmModal';

type AIMood = 'smooth' | 'energetic' | 'chill' | 'party';

interface AIAutoMixPanelProps {
  isAIActive: boolean;
  onToggleAI: (active: boolean) => void;
  onSoftSkip: () => void;
  onHardSkip: () => void;
  trackCount: number;
  mixerTheme: MixerTheme;
  isPlaying: boolean;
  currentAIMood?: AIMood;
  onMoodChange?: (mood: AIMood) => void;
}

const moodConfig: Record<AIMood, { icon: React.ElementType; label: string; description: string }> = {
  smooth: { icon: Heart, label: 'Smooth', description: 'Gradual 8s fades' },
  energetic: { icon: Flame, label: 'Energetic', description: 'Quick 4s drops' },
  chill: { icon: CloudMoon, label: 'Chill', description: 'Long 12s blends' },
  party: { icon: Zap, label: 'Party', description: 'Beat-matched cuts' }
};

export const AIAutoMixPanel: React.FC<AIAutoMixPanelProps> = ({
  isAIActive,
  onToggleAI,
  onSoftSkip,
  onHardSkip,
  trackCount,
  mixerTheme,
  isPlaying,
  currentAIMood = 'smooth',
  onMoodChange
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'transitioning'>('idle');
  const [skipFeedback, setSkipFeedback] = useState<'soft' | 'hard' | null>(null);

  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const isNightclub = mixerTheme.isNightclub;

  useEffect(() => {
    if (!isAIActive || !isPlaying) {
      setAiStatus('idle');
      return;
    }

    const interval = setInterval(() => {
      setAiStatus(prev => {
        if (prev === 'idle') return 'analyzing';
        if (prev === 'analyzing') return Math.random() > 0.7 ? 'transitioning' : 'analyzing';
        return 'analyzing';
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isAIActive, isPlaying]);

  const handleToggleClick = () => {
    if (isAIActive) {
      onToggleAI(false);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmAI = () => {
    onToggleAI(true);
  };

  const handleSoftSkip = useCallback(() => {
    setSkipFeedback('soft');
    onSoftSkip();
    setTimeout(() => setSkipFeedback(null), 600);
  }, [onSoftSkip]);

  const handleHardSkip = useCallback(() => {
    setSkipFeedback('hard');
    onHardSkip();
    setTimeout(() => setSkipFeedback(null), 300);
  }, [onHardSkip]);

  return (
    <>
      <div
        className={`rounded-lg border overflow-hidden transition-all ${
          isNightclub
            ? 'bg-black/60 border-gray-800'
            : 'bg-gray-800/80 border-gray-700'
        }`}
        style={isAIActive && isNightclub ? {
          boxShadow: `0 0 25px ${glowColor}30, inset 0 0 40px ${glowColor}08`
        } : undefined}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                isAIActive ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: isAIActive ? `${glowColor}30` : 'transparent',
                boxShadow: isAIActive && isNightclub ? `0 0 12px ${glowColor}60` : undefined
              }}
            >
              <Cpu
                size={16}
                className="transition-colors"
                style={{ color: isAIActive ? glowColor : '#6b7280' }}
              />
            </div>
            <span className={`text-sm font-semibold ${isAIActive ? 'text-white' : 'text-gray-400'}`}>
              AI Auto-Mix
            </span>
          </div>

          <button
            onClick={handleToggleClick}
            disabled={trackCount < 2}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              trackCount < 2
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : isAIActive
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'text-white hover:opacity-90'
            }`}
            style={!isAIActive && trackCount >= 2 ? {
              backgroundColor: glowColor,
              boxShadow: isNightclub ? `0 0 15px ${glowColor}50` : undefined
            } : undefined}
          >
            {isAIActive ? 'Stop AI' : 'Start AI'}
          </button>
        </div>

        {isAIActive && (
          <div className="px-3 py-2.5 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              {aiStatus === 'analyzing' && (
                <>
                  <Activity size={14} style={{ color: glowColor }} className="animate-pulse" />
                  <span className="text-xs text-gray-300">AI analyzing beats...</span>
                </>
              )}
              {aiStatus === 'transitioning' && (
                <>
                  <Sparkles size={14} style={{ color: glowColor }} className="animate-bounce" />
                  <span className="text-xs" style={{ color: glowColor }}>Transitioning...</span>
                </>
              )}
              {aiStatus === 'idle' && !isPlaying && (
                <>
                  <Cpu size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500">Press play to start</span>
                </>
              )}
            </div>
          </div>
        )}

        {isAIActive && (
          <div className="px-3 py-2.5 border-b border-gray-700/50">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">AI Mood</div>
            <div className="flex gap-1.5">
              {(Object.keys(moodConfig) as AIMood[]).map(mood => {
                const config = moodConfig[mood];
                const Icon = config.icon;
                const isSelected = currentAIMood === mood;

                return (
                  <button
                    key={mood}
                    onClick={() => onMoodChange?.(mood)}
                    className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${glowColor}25`,
                      boxShadow: isNightclub ? `0 0 10px ${glowColor}30` : undefined
                    } : undefined}
                  >
                    <Icon size={14} style={isSelected ? { color: glowColor } : undefined} />
                    <span className="text-[10px] font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-3 py-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Skip Controls</div>
          <div className="flex gap-2">
            <button
              onClick={handleSoftSkip}
              disabled={!isPlaying || trackCount < 2}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                !isPlaying || trackCount < 2
                  ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                  : skipFeedback === 'soft'
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={skipFeedback === 'soft' && isNightclub ? {
                boxShadow: `0 0 15px ${glowColor}50`
              } : undefined}
            >
              <SkipForward size={16} />
              <span>Fade</span>
            </button>

            <button
              onClick={handleHardSkip}
              disabled={!isPlaying || trackCount < 2}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                !isPlaying || trackCount < 2
                  ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                  : skipFeedback === 'hard'
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={skipFeedback === 'hard' ? {
                backgroundColor: glowColor,
                boxShadow: isNightclub ? `0 0 20px ${glowColor}60` : undefined
              } : undefined}
            >
              <ChevronsRight size={16} />
              <span>Cut</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Fade: 4s smooth blend | Cut: instant transition
          </p>
        </div>
      </div>

      <AIAutoMixConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAI}
        trackCount={trackCount}
        mixerTheme={mixerTheme}
      />
    </>
  );
};
