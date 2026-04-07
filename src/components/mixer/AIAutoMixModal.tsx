import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  SkipForward,
  ChevronsRight,
  Sparkles,
  Activity,
  Zap,
  Heart,
  Flame,
  CloudMoon,
  Power,
  Play,
  Pause
} from 'lucide-react';
import { MixerTheme } from '../../lib/themeUtils';

type AIMood = 'smooth' | 'energetic' | 'chill' | 'party';

interface AIAutoMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAIActive: boolean;
  onToggleAI: (active: boolean) => void;
  onSoftSkip: () => void;
  onHardSkip: () => void;
  trackCount: number;
  mixerTheme: MixerTheme;
  isPlaying: boolean;
  currentAIMood: AIMood;
  onMoodChange: (mood: AIMood) => void;
  onPlay: () => void;
  onPause: () => void;
}

const moodConfig: Record<AIMood, { icon: React.ElementType; label: string; description: string }> = {
  smooth: { icon: Heart, label: 'Smooth', description: 'Gradual 8s fades between tracks' },
  energetic: { icon: Flame, label: 'Energetic', description: 'Quick 4s drops for high energy' },
  chill: { icon: CloudMoon, label: 'Chill', description: 'Long 12s blends for relaxed vibes' },
  party: { icon: Zap, label: 'Party', description: 'Beat-matched cuts on the drop' }
};

export const AIAutoMixModal: React.FC<AIAutoMixModalProps> = ({
  isOpen,
  onClose,
  isAIActive,
  onToggleAI,
  onSoftSkip,
  onHardSkip,
  trackCount,
  mixerTheme,
  isPlaying,
  currentAIMood,
  onMoodChange,
  onPlay,
  onPause
}) => {
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

  const handleSoftSkip = () => {
    setSkipFeedback('soft');
    onSoftSkip();
    setTimeout(() => setSkipFeedback(null), 600);
  };

  const handleHardSkip = () => {
    setSkipFeedback('hard');
    onHardSkip();
    setTimeout(() => setSkipFeedback(null), 300);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]"
        onClick={onClose}
      />
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl overflow-hidden border"
          style={{
            backgroundColor: isNightclub ? 'rgba(0,0,0,0.95)' : '#1f2937',
            borderColor: isAIActive ? glowColor : '#374151',
            boxShadow: isAIActive && isNightclub
              ? `0 0 60px ${glowColor}30, 0 0 120px ${glowColor}15`
              : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: isAIActive ? `${glowColor}40` : '#374151' }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isAIActive ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor: isAIActive ? `${glowColor}25` : 'rgba(55,65,81,0.5)',
                  boxShadow: isAIActive && isNightclub ? `0 0 20px ${glowColor}50` : undefined
                }}
              >
                <Cpu
                  size={22}
                  style={{ color: isAIActive ? glowColor : '#9ca3af' }}
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI Auto-Mix</h2>
                <p className="text-xs text-gray-400">
                  {isAIActive ? 'AI is controlling transitions' : 'Intelligent mix automation'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">AI Control</div>
                <div className="text-xs text-gray-400">
                  {trackCount < 2 ? 'Add at least 2 tracks to enable' : 'Toggle AI mixing on/off'}
                </div>
              </div>
              <button
                onClick={() => onToggleAI(!isAIActive)}
                disabled={trackCount < 2}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  trackCount < 2
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : isAIActive
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'text-white hover:opacity-90'
                }`}
                style={!isAIActive && trackCount >= 2 ? {
                  backgroundColor: glowColor,
                  boxShadow: isNightclub ? `0 0 25px ${glowColor}50` : `0 0 15px ${glowColor}30`
                } : undefined}
              >
                <Power size={16} />
                {isAIActive ? 'Stop AI' : 'Start AI'}
              </button>
            </div>

            {isAIActive && (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: `${glowColor}10`,
                    border: `1px solid ${glowColor}30`
                  }}
                >
                  {aiStatus === 'analyzing' && (
                    <>
                      <Activity size={18} style={{ color: glowColor }} className="animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">Analyzing beats...</div>
                        <div className="text-xs text-gray-400">Finding optimal transition point</div>
                      </div>
                    </>
                  )}
                  {aiStatus === 'transitioning' && (
                    <>
                      <Sparkles size={18} style={{ color: glowColor }} className="animate-bounce" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: glowColor }}>Transitioning</div>
                        <div className="text-xs text-gray-400">Mixing to next track</div>
                      </div>
                    </>
                  )}
                  {aiStatus === 'idle' && isPlaying && (
                    <>
                      <Activity size={18} style={{ color: glowColor }} className="animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">Starting up...</div>
                        <div className="text-xs text-gray-400">AI is preparing to analyze</div>
                      </div>
                    </>
                  )}
                  {aiStatus === 'idle' && !isPlaying && (
                    <>
                      <Cpu size={18} className="text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-400">Paused</div>
                        <div className="text-xs text-gray-500">Press play to start AI mixing</div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={isPlaying ? onPause : onPlay}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{
                    backgroundColor: isPlaying ? 'rgba(55,65,81,0.6)' : `${glowColor}20`,
                    border: `1px solid ${isPlaying ? '#4b5563' : `${glowColor}40`}`,
                    color: isPlaying ? '#d1d5db' : glowColor,
                    boxShadow: !isPlaying && isNightclub ? `0 0 20px ${glowColor}25` : undefined
                  }}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={18} />
                      Pause Playback
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Play to Start AI Mixing
                    </>
                  )}
                </button>
              </div>
            )}

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">
                Mood / Transition Style
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(moodConfig) as AIMood[]).map(mood => {
                  const config = moodConfig[mood];
                  const Icon = config.icon;
                  const isSelected = currentAIMood === mood;

                  return (
                    <button
                      key={mood}
                      onClick={() => onMoodChange(mood)}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'text-white'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      }`}
                      style={isSelected ? {
                        backgroundColor: `${glowColor}20`,
                        border: `1px solid ${glowColor}40`,
                        boxShadow: isNightclub ? `0 0 15px ${glowColor}20` : undefined
                      } : {
                        border: '1px solid transparent'
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: isSelected ? `${glowColor}30` : 'rgba(55,65,81,0.5)'
                        }}
                      >
                        <Icon size={18} style={isSelected ? { color: glowColor } : undefined} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{config.label}</div>
                        <div className="text-[10px] text-gray-500 truncate">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">
                Skip Controls
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSoftSkip}
                  disabled={!isPlaying || trackCount < 2}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all ${
                    !isPlaying || trackCount < 2
                      ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                      : skipFeedback === 'soft'
                      ? 'bg-blue-500/30 text-blue-300'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={skipFeedback === 'soft' && isNightclub ? {
                    boxShadow: `0 0 20px ${glowColor}50`
                  } : undefined}
                >
                  <SkipForward size={24} />
                  <span className="text-sm font-semibold">Fade</span>
                  <span className="text-[10px] text-gray-500">Smooth transition</span>
                </button>

                <button
                  onClick={handleHardSkip}
                  disabled={!isPlaying || trackCount < 2}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all ${
                    !isPlaying || trackCount < 2
                      ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                      : skipFeedback === 'hard'
                      ? 'text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={skipFeedback === 'hard' ? {
                    backgroundColor: glowColor,
                    boxShadow: isNightclub ? `0 0 25px ${glowColor}60` : undefined
                  } : undefined}
                >
                  <ChevronsRight size={24} />
                  <span className="text-sm font-semibold">Cut</span>
                  <span className="text-[10px] text-gray-500">Instant switch</span>
                </button>
              </div>
            </div>
          </div>

          <div
            className="px-5 py-3 border-t text-center"
            style={{ borderColor: '#374151' }}
          >
            <p className="text-xs text-gray-500">
              AI will automatically transition between tracks based on beat analysis
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
