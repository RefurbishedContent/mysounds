import React, { useState } from 'react';
import { Plus, X, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { UploadResult } from '../../lib/storage';
import { SongSelectionModal } from '../SongSelectionModal';
import {
  MAX_SONGS,
  SONG_LETTERS,
  SONG_COLORS,
  getCompatibilityScore,
} from './constants';

interface MashUpSongSelectorProps {
  allSongs: UploadResult[];
  selectedSongs: UploadResult[];
  onSongsChange: (songs: UploadResult[]) => void;
  onContinue: () => void;
}

const MashUpSongSelector: React.FC<MashUpSongSelectorProps> = ({
  allSongs,
  selectedSongs,
  onSongsChange,
  onContinue,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const canAddMore = selectedSongs.length < MAX_SONGS;
  const canContinue = selectedSongs.length >= 2;

  const handleAddSong = () => {
    setReplacingIndex(null);
    setShowModal(true);
  };

  const handleReplaceSong = (index: number) => {
    setReplacingIndex(index);
    setShowModal(true);
  };

  const handleSongSelected = (song: UploadResult) => {
    const newSongs = [...selectedSongs];
    if (replacingIndex !== null && replacingIndex < newSongs.length) {
      newSongs[replacingIndex] = song;
    } else {
      newSongs.push(song);
    }
    onSongsChange(newSongs);
    setShowModal(false);
    setReplacingIndex(null);
  };

  const handleRemoveSong = (index: number) => {
    onSongsChange(selectedSongs.filter((_, i) => i !== index));
  };

  const handleMoveSong = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= selectedSongs.length) return;
    const newSongs = [...selectedSongs];
    [newSongs[fromIndex], newSongs[toIndex]] = [newSongs[toIndex], newSongs[fromIndex]];
    onSongsChange(newSongs);
  };

  const modalTitle = replacingIndex !== null
    ? `Replace Song ${SONG_LETTERS[replacingIndex]}`
    : `Select Song ${SONG_LETTERS[selectedSongs.length]}`;

  return (
    <div data-tutorial="song-selection-interface">
      <div className="bg-gradient-to-b from-gray-800 via-gray-800 to-gray-800/95 border-b border-gray-700 shadow-2xl">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {selectedSongs.length === 0
                  ? 'Add Songs to Your Mash Up'
                  : `${selectedSongs.length} Song${selectedSongs.length !== 1 ? 's' : ''} Selected`}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedSongs.length < 2
                  ? `Select at least 2 songs (up to ${MAX_SONGS})`
                  : `${MAX_SONGS - selectedSongs.length} more slot${MAX_SONGS - selectedSongs.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-3xl font-bold text-white">{selectedSongs.length}</span>
              <span className="text-sm text-gray-500">/{MAX_SONGS}</span>
            </div>
          </div>

          <div className="h-1.5 bg-gray-700 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(selectedSongs.length / MAX_SONGS) * 100}%` }}
            />
          </div>

          <div className="space-y-1.5">
            {selectedSongs.map((song, index) => {
              const colors = SONG_COLORS[index % SONG_COLORS.length];
              const letter = SONG_LETTERS[index];

              return (
                <React.Fragment key={`${song.id}-${index}`}>
                  <div className={`tracing-border-wrapper ${colors.tracingVariant}`}>
                    <div
                      className={`bg-gray-900/50 rounded-xl p-3 border-2 transition-all backdrop-blur-sm relative z-10 ${colors.border} ${colors.fill}`}
                    >
                      <div className="flex items-center gap-2.5">
                      {selectedSongs.length > 1 && (
                        <div className="flex flex-col gap-px">
                          <button
                            onClick={() => handleMoveSong(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => handleMoveSong(index, 'down')}
                            disabled={index === selectedSongs.length - 1}
                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      )}

                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.shadow}`}
                      >
                        <span className="text-white font-bold text-sm">{letter}</span>
                      </div>

                      <button
                        onClick={() => handleReplaceSong(index)}
                        className="flex-1 min-w-0 text-left group"
                      >
                        <p
                          className="text-white font-semibold text-sm truncate group-hover:text-gray-200 transition-colors"
                          title={song.originalName}
                        >
                          {song.originalName}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {song.analysis?.bpm && (
                            <div className={`flex items-center gap-1 ${colors.bpmBg} px-2 py-0.5 rounded`}>
                              <div className={`w-1.5 h-1.5 ${colors.dot} rounded-full animate-pulse`} />
                              <span className={`text-xs font-bold ${colors.bpmText}`}>
                                {Math.round(song.analysis.bpm)} BPM
                              </span>
                            </div>
                          )}
                          {song.analysis?.key && (
                            <div className="bg-gray-700/80 px-2 py-0.5 rounded">
                              <span className="text-xs font-medium text-gray-300">{song.analysis.key}</span>
                            </div>
                          )}
                        </div>
                      </button>

                      <button
                        onClick={() => handleRemoveSong(index)}
                        className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={16} className="text-gray-400 hover:text-white" />
                      </button>
                    </div>
                    </div>
                  </div>

                  {index < selectedSongs.length - 1 && (
                    <PairCompatibility
                      songA={selectedSongs[index]}
                      songB={selectedSongs[index + 1]}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {canAddMore && (
              <div className="tracing-border-wrapper variant-neutral mt-8">
                <button
                  onClick={handleAddSong}
                  className="w-full bg-gray-900/30 rounded-xl p-3 border border-white/30 transition-all duration-200 group flex items-center gap-3 relative z-10"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700 group-hover:bg-cyan-500/20 transition-colors flex-shrink-0">
                    <Plus size={20} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                      Add Song {SONG_LETTERS[selectedSongs.length]}
                    </p>
                    <p className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
                      {selectedSongs.length === 0
                        ? 'Click to select your first song'
                        : selectedSongs.length === 1
                        ? 'Add one more song to continue'
                        : `${MAX_SONGS - selectedSongs.length} more slot${MAX_SONGS - selectedSongs.length !== 1 ? 's' : ''} available`}
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {canContinue && (
            <button
              onClick={onContinue}
              className="w-full mt-5 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40"
            >
              <span>Continue with {selectedSongs.length} Song{selectedSongs.length !== 1 ? 's' : ''}</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <SongSelectionModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setReplacingIndex(null); }}
        onSelectSong={handleSongSelected}
        songs={allSongs}
        modalTitle={modalTitle}
      />
    </div>
  );
};

const PairCompatibility: React.FC<{ songA: UploadResult; songB: UploadResult }> = ({ songA, songB }) => {
  const score = getCompatibilityScore(songA, songB);
  const colorClass = score >= 80
    ? 'text-green-400 bg-green-500/10 border-green-500/30'
    : score >= 60
    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    : 'text-orange-400 bg-orange-500/10 border-orange-500/30';

  return (
    <div className="flex items-center justify-center py-0.5">
      <div className="flex-1 h-px bg-gray-700/50" />
      <div className={`mx-3 px-3 py-0.5 rounded-full border text-[11px] font-medium ${colorClass}`}>
        {score}% match
      </div>
      <div className="flex-1 h-px bg-gray-700/50" />
    </div>
  );
};

export default MashUpSongSelector;
