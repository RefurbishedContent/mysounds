import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Download, Save, Settings, Volume2, ArrowLeft, Library, List } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mixerService, MixSession, MixTrack } from '../lib/mixerService';
import { blendExportService, BlendData } from '../lib/blendExportService';

interface MixerEditorViewProps {
  sessionId?: string;
  onBack?: () => void;
}

const MixerEditorView: React.FC<MixerEditorViewProps> = ({ sessionId, onBack }) => {
  const { user } = useAuth();
  const [session, setSession] = useState<MixSession | null>(null);
  const [tracks, setTracks] = useState<MixTrack[]>([]);
  const [availableBlends, setAvailableBlends] = useState<BlendData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [showBlendLibrary, setShowBlendLibrary] = useState(false);
  const [showPlaylistQueue, setShowPlaylistQueue] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      if (!user || !sessionId) return;

      try {
        setLoading(true);
        const sessionData = await mixerService.getMixSession(sessionId);
        const sessionTracks = await mixerService.getMixTracks(sessionId);
        const userBlends = await blendExportService.getUserBlends(user.id);
        const completedBlends = userBlends.filter(b => b.status === 'completed');

        setSession(sessionData);
        setTracks(sessionTracks);
        setAvailableBlends(completedBlends);
      } catch (error) {
        console.error('Failed to load mixer session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [user, sessionId]);

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

  const currentTrack = tracks[currentTrackIndex];
  const nextTrack = tracks[currentTrackIndex + 1];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading mixer session...</p>
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
      <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
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
            <p className="text-sm text-gray-400">{tracks.length} blends in queue</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportMix}
            disabled={tracks.length < 2}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              tracks.length >= 2
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Download size={18} />
            <span>Export Mix</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlendLibrary(!showBlendLibrary)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showBlendLibrary
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Library size={18} />
              <span>Blend Library</span>
            </button>
            <button
              onClick={() => setShowPlaylistQueue(!showPlaylistQueue)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showPlaylistQueue
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <List size={18} />
              <span>Playlist Queue ({tracks.length})</span>
            </button>
          </div>

          {/* Blend Library */}
          {showBlendLibrary && (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-4 py-3 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">Blend Library</h2>
                <p className="text-sm text-gray-400">{availableBlends.length} available</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {availableBlends.map((blend) => {
                  const isInQueue = tracks.some(t => t.blendId === blend.id);
                  return (
                    <button
                      key={blend.id}
                      onClick={() => !isInQueue && handleAddBlendToQueue(blend)}
                      disabled={isInQueue}
                      className={`p-3 rounded-lg text-left transition-all ${
                        isInQueue
                          ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-gray-700 hover:bg-gray-600 hover:shadow-lg hover:shadow-cyan-500/10'
                      }`}
                    >
                      <h3 className="font-medium text-white text-sm mb-1 line-clamp-1" title={blend.name}>
                        {blend.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{Math.floor(blend.duration / 60)}:{String(blend.duration % 60).padStart(2, '0')}</span>
                        <span>•</span>
                        <span>{blend.format.toUpperCase()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deck A - Current Track */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyan-400">
                        {currentTrack?.blend?.duration ? Math.round(currentTrack.blend.duration / 60) : 0}
                      </div>
                      <div className="text-xs text-gray-400 uppercase">BPM</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs text-gray-500 uppercase mb-1">Deck A - Current</h3>
                <h2 className="text-xl font-bold text-white mb-1 truncate">
                  {currentTrack?.blend?.name || 'No track loaded'}
                </h2>
                {currentTrack && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{currentTrack.blend?.format.toUpperCase()}</span>
                    <span>•</span>
                    <span>
                      {Math.floor((currentTrack.blend?.duration || 0) / 60)}:
                      {String((currentTrack.blend?.duration || 0) % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 h-24 bg-gray-800/50 rounded-lg p-4 flex items-center justify-center">
              <div className="text-gray-500 text-sm">Waveform visualization</div>
            </div>
          </div>

          {/* Deck B - Next Track */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center relative">
                  <div className="absolute inset-2 bg-gray-900 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {nextTrack?.blend?.duration ? Math.round(nextTrack.blend.duration / 60) : 0}
                      </div>
                      <div className="text-xs text-gray-400 uppercase">BPM</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs text-gray-500 uppercase mb-1">Deck B - Next</h3>
                <h2 className="text-xl font-bold text-white mb-1 truncate">
                  {nextTrack?.blend?.name || 'No track queued'}
                </h2>
                {nextTrack && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{nextTrack.blend?.format.toUpperCase()}</span>
                    <span>•</span>
                    <span>
                      {Math.floor((nextTrack.blend?.duration || 0) / 60)}:
                      {String((nextTrack.blend?.duration || 0) % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 h-24 bg-gray-800/50 rounded-lg p-4 flex items-center justify-center">
              <div className="text-gray-500 text-sm">Waveform visualization</div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setCurrentTrackIndex(Math.max(0, currentTrackIndex - 1))}
                  disabled={currentTrackIndex === 0}
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipBack size={24} />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!currentTrack}
                  className="p-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                </button>

                <button
                  onClick={() => setCurrentTrackIndex(Math.min(tracks.length - 1, currentTrackIndex + 1))}
                  disabled={currentTrackIndex >= tracks.length - 1}
                  className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipForward size={24} />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <Volume2 size={20} className="text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-sm text-gray-400 w-12 text-right">{Math.round(masterVolume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Playlist Queue */}
          {showPlaylistQueue && (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <div className="px-4 py-3 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">Playlist Queue</h2>
                <p className="text-sm text-gray-400">{tracks.length} tracks</p>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                {tracks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">No tracks in queue</p>
                    <p className="text-gray-600 text-xs mt-2">Add blends from the library</p>
                  </div>
                ) : (
                  tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className={`p-3 rounded-lg transition-all ${
                        index === currentTrackIndex
                          ? 'bg-cyan-500/20 border-2 border-cyan-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-sm font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm mb-1 line-clamp-2" title={track.blend?.name}>
                              {track.blend?.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>
                                {Math.floor((track.blend?.duration || 0) / 60)}:
                                {String((track.blend?.duration || 0) % 60).padStart(2, '0')}
                              </span>
                              <span>•</span>
                              <span className="text-cyan-400">{track.crossfadeType}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTrack(track.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                        >
                          <span className="text-lg">×</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MixerEditorView;
