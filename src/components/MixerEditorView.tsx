import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Download, Settings, Library, X, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mixerService, MixSession, MixTrack } from '../lib/mixerService';
import { BlendData } from '../lib/blendExportService';
import { MixerTheme, parseThemeFromMetadata, getDefaultTheme, getPresetThemes, PresetTheme } from '../lib/themeUtils';
import { useIsMobile } from '../hooks/useIsMobile';
import { DJMixerTable } from './DJMixerTable';
import { BlendLibraryPanel } from './BlendLibraryPanel';
import { MixerQueueStrip, AIAutoMixButton, AIAutoMixModal, NightclubEffects } from './mixer';

interface MixerEditorViewProps {
  sessionId?: string;
  onBack?: () => void;
}

type AIMood = 'smooth' | 'energetic' | 'chill' | 'party';

const MixerEditorView: React.FC<MixerEditorViewProps> = ({ sessionId, onBack }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [session, setSession] = useState<MixSession | null>(null);
  const [tracks, setTracks] = useState<MixTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [crossfadePosition, setCrossfadePosition] = useState(0.5);
  const [isMixing, setIsMixing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [deckAVolume, setDeckAVolume] = useState(0.8);
  const [deckBVolume, setDeckBVolume] = useState(0.8);
  const [deckAEQ, setDeckAEQ] = useState({ high: 0, mid: 0, low: 0 });
  const [deckBEQ, setDeckBEQ] = useState({ high: 0, mid: 0, low: 0 });
  const [mixerTheme, setMixerTheme] = useState<MixerTheme>(getDefaultTheme());
  const [isAIActive, setIsAIActive] = useState(false);
  const [aiMood, setAiMood] = useState<AIMood>('smooth');
  const [showAIModal, setShowAIModal] = useState(false);
  const fadeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!user || !sessionId) return;

      try {
        setLoading(true);
        const sessionData = await mixerService.getMixSession(sessionId);
        const sessionTracks = await mixerService.getMixTracks(sessionId);

        setSession(sessionData);
        setTracks(sessionTracks);

        if (sessionData?.metadata) {
          const theme = parseThemeFromMetadata(sessionData.metadata);
          if (theme) {
            setMixerTheme(theme);
          }
        }
      } catch (error) {
        console.error('Failed to load mixer session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [user, sessionId]);

  // Simulate playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const currentTrack = tracks[currentTrackIndex];
        if (!currentTrack?.blend) return prev;

        const newTime = prev + 1;

        // Check if we're near the end and should start mixing
        const timeLeft = currentTrack.blend.duration - newTime;
        if (timeLeft <= 8 && timeLeft > 0) {
          setIsMixing(true);
        }

        // Auto-advance to next track
        if (newTime >= currentTrack.blend.duration) {
          handleNext();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrackIndex, tracks]);

  const handleAddBlendToQueue = async (blend: BlendData) => {
    if (!session) return;

    try {
      const newPosition = tracks.length;
      await mixerService.addBlendToMix(session.id, {
        blendId: blend.id,
        position: newPosition,
        crossfadeType: 'beat-matched'
      });

      const updatedTracks = await mixerService.getMixTracks(session.id);
      setTracks(updatedTracks);
    } catch (error) {
      console.error('Failed to add blend to queue:', error);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!session) return;

    try {
      await mixerService.removeBlendFromMix(session.id, trackId);
      const updatedTracks = await mixerService.getMixTracks(session.id);
      setTracks(updatedTracks);
    } catch (error) {
      console.error('Failed to remove track:', error);
    }
  };

  const handleLoadTrackToDeck = (trackId: string, deck: 'A' | 'B') => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;

    if (deck === 'A' && !isPlaying) {
      setCurrentTrackIndex(trackIndex);
      setCurrentTime(0);
      setIsMixing(false);
    } else if (deck === 'B') {
      const reorderedTracks = [...tracks];
      const [movedTrack] = reorderedTracks.splice(trackIndex, 1);
      reorderedTracks.splice(currentTrackIndex + 1, 0, movedTrack);
      setTracks(reorderedTracks);
    }
  };

  const handleExportMix = async () => {
    if (!session) return;

    try {
      await mixerService.renderMix(session.id, {
        format: 'wav',
        quality: 'standard'
      });
      alert('Mix export started! This may take a few minutes.');
    } catch (error) {
      console.error('Failed to export mix:', error);
      alert('Failed to start export. Please try again.');
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    setIsMixing(false);
  };

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
      setCurrentTime(0);
      setIsMixing(false);
      setCrossfadePosition(0.5);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
      setCurrentTime(0);
      setIsMixing(false);
      setCrossfadePosition(0.5);
    }
  };

  const handleSync = () => {
    console.log('Sync enabled');
  };

  const handleSoftSkip = useCallback(() => {
    if (currentTrackIndex >= tracks.length - 1) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    setIsMixing(true);
    let fadeProgress = 0;
    const fadeDuration = aiMood === 'chill' ? 120 : aiMood === 'smooth' ? 80 : 40;

    fadeIntervalRef.current = window.setInterval(() => {
      fadeProgress++;
      const progress = fadeProgress / fadeDuration;
      setCrossfadePosition(0.5 + progress * 0.5);

      if (fadeProgress >= fadeDuration) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        handleNext();
      }
    }, 50);
  }, [currentTrackIndex, tracks.length, aiMood]);

  const handleHardSkip = useCallback(() => {
    if (currentTrackIndex >= tracks.length - 1) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    handleNext();
  }, [currentTrackIndex, tracks.length]);

  const handleThemeChange = (theme: PresetTheme) => {
    setMixerTheme(theme);
    setShowThemePanel(false);
  };

  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading DJ booth...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Session not found</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold text-white truncate">{session.name}</h1>
              <p className="text-xs md:text-sm text-gray-400 hidden md:block">DJ Mixer Session</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowLibraryPanel(!showLibraryPanel)}
              className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors ${
                showLibraryPanel
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <Library size={18} />
              <span className="hidden md:inline">Library</span>
            </button>
            <AIAutoMixButton
              isAIActive={isAIActive}
              onClick={() => setShowAIModal(true)}
              mixerTheme={mixerTheme}
              disabled={tracks.length < 2}
            />
            <button
              onClick={() => setShowThemePanel(!showThemePanel)}
              className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors ${
                showThemePanel
                  ? 'text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
              style={showThemePanel ? {
                backgroundColor: mixerTheme.deckAColors?.glow || '#06b6d4'
              } : undefined}
            >
              <Palette size={18} />
              <span className="hidden md:inline">Theme</span>
            </button>
            <button
              onClick={handleExportMix}
              disabled={tracks.length < 2}
              className={`flex items-center gap-2 p-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors ${
                tracks.length >= 2
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download size={18} />
              <span className="hidden md:inline">Export</span>
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Library Panel - full overlay on mobile, sidebar on desktop */}
        {showLibraryPanel && (
          <>
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setShowLibraryPanel(false)}
              />
            )}
            <div className={
              isMobile
                ? 'fixed inset-0 z-50 bg-gray-900 flex flex-col'
                : 'w-[600px] border-r border-gray-700 flex-shrink-0'
            }>
              {isMobile && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-bold text-white">Mash Up Library</h2>
                  <button
                    onClick={() => setShowLibraryPanel(false)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <BlendLibraryPanel
                  onSelectBlend={(blend) => {
                    handleAddBlendToQueue(blend);
                    if (isMobile) setShowLibraryPanel(false);
                  }}
                  selectedBlendIds={tracks.map(t => t.blendId)}
                />
              </div>
            </div>
          </>
        )}

        {/* DJ Booth Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-6 lg:p-8 space-y-4">
            {/* Queue Strip - Above Mixer */}
            <MixerQueueStrip
              tracks={tracks}
              currentTrackIndex={currentTrackIndex}
              onSelectTrack={(index) => {
                setCurrentTrackIndex(index);
                setCurrentTime(0);
                setIsMixing(false);
              }}
              mixerTheme={mixerTheme}
            />

            {/* Main Mixer Area */}
            <div className="relative">
              <NightclubEffects
                mixerTheme={mixerTheme}
                isPlaying={isPlaying}
                isAIActive={isAIActive}
              />
              <DJMixerTable
                tracks={tracks}
                currentTrackIndex={currentTrackIndex}
                currentTime={currentTime}
                isPlaying={isPlaying}
                isMixing={isMixing}
                masterVolume={masterVolume}
                crossfadePosition={crossfadePosition}
                deckAVolume={deckAVolume}
                deckBVolume={deckBVolume}
                deckAEQ={deckAEQ}
                deckBEQ={deckBEQ}
                mixerTheme={mixerTheme}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSync={handleSync}
                onCrossfadeChange={setCrossfadePosition}
                onMasterVolumeChange={setMasterVolume}
                onDeckAVolumeChange={setDeckAVolume}
                onDeckBVolumeChange={setDeckBVolume}
                onDeckAEQChange={(type, value) => setDeckAEQ({ ...deckAEQ, [type]: value })}
                onDeckBEQChange={(type, value) => setDeckBEQ({ ...deckBEQ, [type]: value })}
                onSelectTrack={(index) => {
                  setCurrentTrackIndex(index);
                  setCurrentTime(0);
                  setIsMixing(false);
                }}
                onLoadTrackToDeck={handleLoadTrackToDeck}
                isAIActive={isAIActive}
              />
            </div>
          </div>
        </div>

        {/* Theme Panel Overlay */}
        {showThemePanel && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowThemePanel(false)}
            />
            <div className={`fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden ${
              isMobile
                ? 'inset-x-4 bottom-4 max-h-[70vh]'
                : 'right-4 top-20 w-80 max-h-[calc(100vh-6rem)]'
            }`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="font-bold text-white">Choose Theme</h3>
                <button
                  onClick={() => setShowThemePanel(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Nightclub Themes</div>
                {getPresetThemes().filter(t => t.category === 'nightclub').map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      mixerTheme.presetName === theme.presetName
                        ? 'border-white/30 bg-white/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.deckAColors.from}, ${theme.deckBColors.to})`,
                        boxShadow: `0 0 15px ${theme.deckAColors.glow}50`
                      }}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{theme.name}</div>
                      <div className="text-xs text-gray-500">{theme.description}</div>
                    </div>
                  </button>
                ))}
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-4">Classic Themes</div>
                {getPresetThemes().filter(t => t.category === 'classic').map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      mixerTheme.presetName === theme.presetName
                        ? 'border-white/30 bg-white/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.deckAColors.from}, ${theme.deckBColors.to})`
                      }}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{theme.name}</div>
                      <div className="text-xs text-gray-500">{theme.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Auto-Mix Modal */}
      <AIAutoMixModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        isAIActive={isAIActive}
        onToggleAI={setIsAIActive}
        onSoftSkip={handleSoftSkip}
        onHardSkip={handleHardSkip}
        trackCount={tracks.length}
        mixerTheme={mixerTheme}
        isPlaying={isPlaying}
        currentAIMood={aiMood}
        onMoodChange={setAiMood}
        onPlay={handlePlay}
        onPause={handlePause}
      />
    </div>
  );
};

export default MixerEditorView;
