import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, X, Upload } from 'lucide-react';
import { UploadResult } from '../../lib/storage';
import { ProjectType } from '../../hooks/useProjectWizard';
import SongSelectionGrid from './SongSelectionGrid';
import CompatibilityIndicator from './CompatibilityIndicator';
import AISuggestions from './AISuggestions';
import { storageService } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';

interface WizardStep2ContentSelectionProps {
  projectType: ProjectType;
  selectedSongs: UploadResult[];
  onSelectSong: (song: UploadResult, position?: number) => void;
  onClearSong: (position: number) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const WizardStep2ContentSelection: React.FC<WizardStep2ContentSelectionProps> = ({
  projectType,
  selectedSongs,
  onSelectSong,
  onClearSong,
  onNext,
  onBack,
  canProceed
}) => {
  const { user } = useAuth();
  const [allSongs, setAllSongs] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const songs = await storageService.listUserUploads(user.id);
        const readySongs = songs.filter(s => s.status === 'ready');
        setAllSongs(readySongs);
      } catch (error) {
        console.error('Failed to load songs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, [user]);

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
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white">Select Your Songs</h2>
              <p className="text-sm text-gray-400">Choose two songs to create a seamless transition</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Song A</h3>
                  {songA && (
                    <button
                      onClick={() => onClearSong(0)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                {songA ? (
                  <div className="p-4 bg-gray-800 border-2 border-cyan-500 rounded-xl">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">A</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{songA.original_name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          {songA.analysis?.bpm && <span>{Math.round(songA.analysis.bpm)} BPM</span>}
                          {songA.analysis?.key && <span>• {songA.analysis.key}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-600 rounded-xl text-center">
                    <p className="text-gray-500">Select Song A from below</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Song B</h3>
                  {songB && (
                    <button
                      onClick={() => onClearSong(1)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                {songB ? (
                  <div className="p-4 bg-gray-800 border-2 border-blue-500 rounded-xl">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">B</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{songB.original_name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          {songB.analysis?.bpm && <span>{Math.round(songB.analysis.bpm)} BPM</span>}
                          {songB.analysis?.key && <span>• {songB.analysis.key}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-600 rounded-xl text-center">
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
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-6xl mx-auto space-y-4">
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
                  <div key={song.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      </div>
                      <span className="text-white truncate">{song.original_name}</span>
                    </div>
                    <button
                      onClick={() => onClearSong(index)}
                      className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
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
            />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
