import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, Upload, Music } from 'lucide-react';
import { UploadResult } from '../../lib/storage';
import { ProjectType } from '../../hooks/useProjectWizard';
import SongSelectionGrid from './SongSelectionGrid';
import CompatibilityIndicator from './CompatibilityIndicator';
import AISuggestions from './AISuggestions';
import { BlendPreviewCard } from './BlendPreviewCard';
import { InsufficientBlendsModal } from './InsufficientBlendsModal';
import { storageService } from '../../lib/storage';
import { blendExportService, BlendData } from '../../lib/blendExportService';
import { useAuth } from '../../contexts/AuthContext';
import { getDemoSongs } from '../../lib/demoData';
import { audioPlayer } from '../../lib/audioPlayer';
import { supabase } from '../../lib/supabase';

interface WizardStep2ContentSelectionProps {
  projectType: ProjectType;
  selectedSongs: UploadResult[];
  selectedBlends?: BlendData[];
  onSelectSong: (song: UploadResult, position?: number) => void;
  onSelectBlend?: (blend: BlendData) => void;
  onClearSong: (position: number) => void;
  onClearBlend?: (blendId: string) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
  tutorialMode?: boolean;
}

const WizardStep2ContentSelection: React.FC<WizardStep2ContentSelectionProps> = ({
  projectType,
  selectedSongs,
  selectedBlends = [],
  onSelectSong,
  onSelectBlend,
  onClearSong,
  onClearBlend,
  onNext,
  onBack,
  canProceed,
  tutorialMode = false
}) => {
  const { user } = useAuth();
  const [allSongs, setAllSongs] = useState<UploadResult[]>([]);
  const [allBlends, setAllBlends] = useState<BlendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingBlendId, setPlayingBlendId] = useState<string | null>(null);
  const [showInsufficientBlendsModal, setShowInsufficientBlendsModal] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      if (tutorialMode) {
        const demoSongs = getDemoSongs();
        setAllSongs(demoSongs);
        setLoading(false);

        if (projectType === 'transition' && selectedSongs.length === 0 && demoSongs.length >= 2) {
          setTimeout(() => {
            onSelectSong(demoSongs[0], 0);
            setTimeout(() => {
              onSelectSong(demoSongs[1], 1);
            }, 500);
          }, 300);
        }
        return;
      }

      if (!user) return;
      try {
        setLoading(true);
        if (projectType === 'mixer') {
          const blends = await blendExportService.getUserBlends(user.id);
          const completedBlends = blends.filter(b => b.status === 'completed');
          setAllBlends(completedBlends);
        } else {
          const songs = await storageService.listUserUploads(user.id);
          const readySongs = songs.filter(s => s.status === 'ready');
          setAllSongs(readySongs);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [user, projectType, tutorialMode]);

  useEffect(() => {
    if (projectType === 'mixer' && !tutorialMode && !loading && allBlends.length < 2) {
      setShowInsufficientBlendsModal(true);
    }
  }, [projectType, tutorialMode, loading, allBlends.length]);

  const handleTogglePlay = async (blend: BlendData) => {
    if (playingBlendId === blend.id) {
      audioPlayer.pause();
      setPlayingBlendId(null);
    } else {
      if (playingBlendId) {
        audioPlayer.stop();
      }

      if (blend.file_url) {
        audioPlayer.play(blend.file_url);
        setPlayingBlendId(blend.id);

        audioPlayer.onEnded(() => {
          setPlayingBlendId(null);
        });
      }
    }
  };

  const handleToggleFavorite = async (blendId: string, currentValue: boolean) => {
    try {
      await supabase
        .from('blends')
        .update({ is_favorite: !currentValue })
        .eq('id', blendId);

      setAllBlends(prevBlends =>
        prevBlends.map(b =>
          b.id === blendId ? { ...b, is_favorite: !currentValue } : b
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCreateTransition = () => {
    audioPlayer.stop();
    setPlayingBlendId(null);
    onBack();
  };

  const handleContinueAnyway = () => {
    setShowInsufficientBlendsModal(false);
  };

  const handleSongSelect = (song: UploadResult, slot?: number) => {
    if (projectType === 'transition') {
      if (slot !== undefined) {
        onSelectSong(song, slot);
      } else {
        const emptySlot = selectedSongs.length < 2 ? selectedSongs.length : undefined;
        if (emptySlot !== undefined) {
          onSelectSong(song, emptySlot);
        }
      }
    } else {
      onSelectSong(song);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading your music library...</p>
        </div>
      </div>
    );
  }

  if (projectType === 'transition') {
    const songA = selectedSongs[0];
    const songB = selectedSongs[1];

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 px-2">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white">Select Your Songs</h2>
              <p className="text-sm text-gray-400">Choose two songs to create a seamless transition</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-semibold text-white">Song A (Ending)</h3>
                  {songA && (
                    <button
                      onClick={() => onClearSong(0)}
                      className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                {songA ? (
                  <div className="p-4 bg-gray-800 border-2 border-cyan-500 rounded-xl min-w-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">A</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-semibold text-white break-words line-clamp-2 mb-2"
                          title={songA.original_name}
                        >
                          {songA.original_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {songA.analysis?.bpm && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">{Math.round(songA.analysis.bpm)} BPM</span>
                          )}
                          {songA.analysis?.key && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">{songA.analysis.key}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-gray-600 rounded-xl text-center">
                    <p className="text-gray-500">Select Song A from below</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-semibold text-white">Song B (Beginning)</h3>
                  {songB && (
                    <button
                      onClick={() => onClearSong(1)}
                      className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                {songB ? (
                  <div className="p-4 bg-gray-800 border-2 border-blue-500 rounded-xl min-w-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">B</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-semibold text-white break-words line-clamp-2 mb-2"
                          title={songB.original_name}
                        >
                          {songB.original_name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          {songB.analysis?.bpm && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">{Math.round(songB.analysis.bpm)} BPM</span>
                          )}
                          {songB.analysis?.key && (
                            <span className="bg-gray-700 px-2 py-0.5 rounded">{songB.analysis.key}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-gray-600 rounded-xl text-center">
                    <p className="text-gray-500">Select Song B from below</p>
                  </div>
                )}
              </div>
            </div>

            {songA && songB && (
              <CompatibilityIndicator songA={songA} songB={songB} />
            )}

            {songA && !songB && allSongs.length > 1 && (
              <AISuggestions
                baseSong={songA}
                availableSongs={allSongs}
                onSelectSuggestion={(song) => handleSongSelect(song, 1)}
              />
            )}

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Library</h3>
              <SongSelectionGrid
                songs={allSongs}
                selectedSongs={selectedSongs}
                onSelectSong={handleSongSelect}
                emptyMessage="No songs in your library yet. Upload songs to get started!"
                tutorialMode={tutorialMode}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between px-2">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <button
              onClick={onNext}
              disabled={!canProceed}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                canProceed
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Continue</span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (projectType === 'mixer') {
    return (
      <>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 px-2">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-white">Select Your Blends</h2>
                <p className="text-sm text-gray-400">
                  {allBlends.length < 2
                    ? `You have ${allBlends.length} blend${allBlends.length === 1 ? '' : 's'}. Create at least 2 blends to start mixing`
                    : 'Choose blends to create a seamless mix'
                  }
                </p>
              </div>

              {selectedBlends.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Selected Blends ({selectedBlends.length})
                    </h3>
                    <span className="text-sm text-gray-400">
                      {selectedBlends.length < 2 && '2 minimum for playback'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedBlends.map((blend, index) => (
                      <div key={blend.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg min-w-0">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium break-words line-clamp-1" title={blend.name}>
                              {blend.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">{Math.floor(blend.duration / 60)}:{String(blend.duration % 60).padStart(2, '0')}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-400">{blend.format.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onClearBlend?.(blend.id)}
                          className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0 ml-2"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Your Blend Library</h3>
                {allBlends.length === 0 ? (
                  <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music size={32} className="text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Blends Yet</h3>
                    <p className="text-gray-400 mb-6">Create transition blends first to use them in your mix</p>
                    <button
                      onClick={handleCreateTransition}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-200"
                    >
                      <span>Create Your First Blend</span>
                      <ArrowRight size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allBlends.map((blend) => {
                      const isSelected = selectedBlends.some(b => b.id === blend.id);
                      const isPlaying = playingBlendId === blend.id;

                      return (
                        <BlendPreviewCard
                          key={blend.id}
                          blend={blend}
                          isSelected={isSelected}
                          isPlaying={isPlaying}
                          onSelect={() => !isSelected && onSelectBlend?.(blend)}
                          onTogglePlay={() => handleTogglePlay(blend)}
                          onToggleFavorite={(isFavorite) => handleToggleFavorite(blend.id, isFavorite)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
            <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between px-2">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <button
                onClick={onNext}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-medium shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-200"
              >
                <span>Continue {selectedBlends.length > 0 ? `with ${selectedBlends.length} Blend${selectedBlends.length === 1 ? '' : 's'}` : ''}</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {showInsufficientBlendsModal && (
          <InsufficientBlendsModal
            blendCount={allBlends.length}
            onCreateTransition={handleCreateTransition}
            onContinueAnyway={handleContinueAnyway}
            onClose={() => setShowInsufficientBlendsModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto space-y-4 px-2">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white">Select Your Tracks</h2>
            <p className="text-sm text-gray-400">Choose one or more tracks for your mixer project</p>
          </div>

          {selectedSongs.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Selected Tracks ({selectedSongs.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedSongs.map((song, index) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg min-w-0">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      </div>
                      <span
                        className="text-white break-words line-clamp-1"
                        title={song.original_name}
                      >
                        {song.original_name}
                      </span>
                    </div>
                    <button
                      onClick={() => onClearSong(index)}
                      className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0 ml-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Your Library</h3>
            <SongSelectionGrid
              songs={allSongs}
              selectedSongs={selectedSongs}
              onSelectSong={onSelectSong}
              multiSelect={true}
              emptyMessage="No songs in your library yet. Upload songs to get started!"
              tutorialMode={tutorialMode}
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-full lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between px-2">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              canProceed
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WizardStep2ContentSelection;
