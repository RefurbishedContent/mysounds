import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Settings, Library, Layers, Maximize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mixerService, MixSession, MixTrack } from '../lib/mixerService';
import { blendExportService, BlendData } from '../lib/blendExportService';
import { DJDeck } from './DJDeck';
import { DJCrossfader } from './DJCrossfader';
import { PlaylistQueueDrawer } from './PlaylistQueueDrawer';
import { BlendLibraryPanel } from './BlendLibraryPanel';

interface MixerEditorViewProps {
  sessionId?: string;
  onBack?: () => void;
}

const MixerEditorView: React.FC<MixerEditorViewProps> = ({ sessionId, onBack }) => {
  const { user } = useAuth();
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
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [deckAVolume, setDeckAVolume] = useState(0.8);
  const [deckBVolume, setDeckBVolume] = useState(0.8);
  const [deckAEQ, setDeckAEQ] = useState({ high: 0, mid: 0, low: 0 });
  const [deckBEQ, setDeckBEQ] = useState({ high: 0, mid: 0, low: 0 });

  useEffect(() => {
    const loadSession = async () => {
      if (!user || !sessionId) return;

      try {
        setLoading(true);
        const sessionData = await mixerService.getMixSession(sessionId);
        const sessionTracks = await mixerService.getMixTracks(sessionId);

        setSession(sessionData);
        setTracks(sessionTracks);
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

  const handleReorderTracks = async (reorderedTracks: MixTrack[]) => {
    setTracks(reorderedTracks);
    // TODO: Save new order to database
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
    // TODO: Implement BPM sync between decks
    console.log('Sync enabled');
  };

  const currentTrack = tracks[currentTrackIndex];
  const nextTrack = tracks[currentTrackIndex + 1];

  // Calculate BPM from duration (mock calculation)
  const currentBPM = currentTrack?.blend?.duration ? 120 + (currentTrack.blend.duration % 20) : 120;
  const nextBPM = nextTrack?.blend?.duration ? 120 + (nextTrack.blend.duration % 20) : 120;

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
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{session.name}</h1>
              <p className="text-sm text-gray-400">DJ Mixer Session</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLibraryPanel(!showLibraryPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showLibraryPanel
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <Library size={18} />
              <span>Library</span>
            </button>
            <button
              onClick={handleExportMix}
              disabled={tracks.length < 2}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                tracks.length >= 2
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Library Panel (Collapsible) */}
        {showLibraryPanel && (
          <div className="w-[600px] border-r border-gray-700 flex-shrink-0">
            <BlendLibraryPanel
              onSelectBlend={handleAddBlendToQueue}
              selectedBlendIds={tracks.map(t => t.blendId)}
            />
          </div>
        )}

        {/* DJ Booth Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 p-6 space-y-6">
            {/* Dual Deck Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Deck A - Current Track */}
              <DJDeck
                deckId="A"
                trackName={currentTrack?.blend?.name}
                artist=""
                bpm={currentBPM}
                key="Am"
                duration={currentTrack?.blend?.duration || 0}
                currentTime={currentTime}
                isPlaying={isPlaying}
                volume={deckAVolume}
                eq={deckAEQ}
                onPlay={handlePlay}
                onPause={handlePause}
                onVolumeChange={setDeckAVolume}
                onEQChange={(type, value) => setDeckAEQ({ ...deckAEQ, [type]: value })}
              />

              {/* Deck B - Next Track */}
              <DJDeck
                deckId="B"
                trackName={nextTrack?.blend?.name}
                artist=""
                bpm={nextBPM}
                key="Gm"
                duration={nextTrack?.blend?.duration || 0}
                currentTime={0}
                isPlaying={false}
                isCueing={isMixing}
                volume={deckBVolume}
                eq={deckBEQ}
                onVolumeChange={setDeckBVolume}
                onEQChange={(type, value) => setDeckBEQ({ ...deckBEQ, [type]: value })}
              />
            </div>

            {/* Crossfader and Master Controls */}
            <DJCrossfader
              crossfadePosition={crossfadePosition}
              masterVolume={masterVolume}
              isPlaying={isPlaying}
              isMixing={isMixing}
              onCrossfadeChange={setCrossfadePosition}
              onMasterVolumeChange={setMasterVolume}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSync={handleSync}
              vuMeterLevels={{
                left: deckAVolume * (1 - crossfadePosition),
                right: deckBVolume * crossfadePosition
              }}
            />
          </div>

          {/* Playlist Queue Drawer (Bottom) */}
          <PlaylistQueueDrawer
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            isOpen={showQueueDrawer}
            onToggle={() => setShowQueueDrawer(!showQueueDrawer)}
            onRemoveTrack={handleRemoveTrack}
            onReorderTracks={handleReorderTracks}
            onSelectTrack={(index) => {
              setCurrentTrackIndex(index);
              setCurrentTime(0);
              setIsMixing(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MixerEditorView;
