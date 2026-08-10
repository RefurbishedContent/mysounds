import React, { useState, useEffect } from 'react';
import { Music, Search, X, SlidersHorizontal, Upload } from 'lucide-react';
import { UploadResult } from '../lib/storage';
import LibraryUploader from './LibraryUploader';

interface SongSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: UploadResult) => void;
  currentSongA?: UploadResult | null;
  currentSongB?: UploadResult | null;
  selectingFor?: 'A' | 'B';
  songs: UploadResult[];
  selectedSongIds?: string[];
  modalTitle?: string;
  onRefreshLibrary?: () => void;
}

export const SongSelectionModal: React.FC<SongSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  currentSongA,
  currentSongB,
  selectingFor,
  songs,
  selectedSongIds,
  modalTitle,
  onRefreshLibrary,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [bpmFilter, setBpmFilter] = useState<'all' | 'slow' | 'medium' | 'fast'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'bpm'>('recent');
  const [showUploader, setShowUploader] = useState(false);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setBpmFilter('all');
      setSortBy('recent');
      setShowFilters(false);
      setShowUploader(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getFilteredAndSortedSongs = () => {
    let filtered = [...songs];

    if (searchQuery) {
      filtered = filtered.filter(song =>
        song.originalName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (bpmFilter !== 'all') {
      filtered = filtered.filter(song => {
        const bpm = song.analysis?.bpm || 0;
        if (bpmFilter === 'slow') return bpm < 100;
        if (bpmFilter === 'medium') return bpm >= 100 && bpm <= 140;
        if (bpmFilter === 'fast') return bpm > 140;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.originalName.localeCompare(b.originalName);
      } else if (sortBy === 'bpm') {
        return (a.analysis?.bpm || 0) - (b.analysis?.bpm || 0);
      } else {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    return filtered;
  };

  const handleSongClick = (song: UploadResult) => {
    onSelectSong(song);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredSongs = getFilteredAndSortedSongs();
  const title = modalTitle || (selectingFor === 'A' ? 'Select First Song' : 'Select Second Song');

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Choose from your library</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-700 space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                showFilters
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
            <p className="text-sm text-gray-500">
              {filteredSongs.length} of {songs.length} songs
            </p>
          </div>

          {showFilters && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">BPM Range</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['all', 'slow', 'medium', 'fast'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setBpmFilter(filter as any)}
                        className={`px-3 py-2 rounded text-xs font-medium transition-all duration-200 ${
                          bpmFilter === filter
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {filter === 'all' ? 'All' : filter === 'slow' ? '<100' : filter === 'medium' ? '100-140' : '140+'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="bpm">BPM (Low to High)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBpmFilter('all');
                    setSortBy('recent');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Songs Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
          {showUploader ? (
            <div className="max-w-md mx-auto py-6">
              <div className="flex items-center gap-2 mb-4">
                <Upload size={16} className="text-cyan-400" />
                <span className="text-sm font-semibold text-white">Upload Songs</span>
              </div>
              <LibraryUploader onUploadComplete={() => onRefreshLibrary?.()} />
              <button
                onClick={() => setShowUploader(false)}
                className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Back to Library
              </button>
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Music size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400 text-base mb-1">No songs in your library</p>
              <p className="text-gray-500 text-sm mb-4">Upload some tracks to get started!</p>
              <button
                onClick={() => setShowUploader(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
              >
                <Upload size={16} />
                <span>Upload Songs</span>
              </button>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Search size={48} className="text-gray-600 mb-4" />
              <p className="text-gray-400 text-base mb-3">No songs match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setBpmFilter('all');
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredSongs.map((song) => {
                const isAlreadySelected = selectedSongIds
                  ? selectedSongIds.includes(song.id)
                  : false;
                const isSongA = currentSongA?.id === song.id;
                const isSongB = currentSongB?.id === song.id;
                const isSelected = isAlreadySelected || isSongA || isSongB;
                const isOtherSlot = isAlreadySelected || (selectingFor === 'A' && isSongB) || (selectingFor === 'B' && isSongA);

                return (
                  <button
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    disabled={isOtherSlot}
                    className={`
                      min-w-0 bg-gray-800 rounded-lg p-3 text-left transition-all duration-200 group
                      ${isOtherSlot
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                        ? `ring-2 ${isSongA ? 'ring-cyan-500 bg-cyan-500/5' : 'ring-green-500 bg-green-500/5'}`
                        : 'hover:bg-gray-750 hover:ring-1 hover:ring-gray-600 hover:scale-105'
                      }
                    `}
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-md mb-2 flex items-center justify-center relative overflow-hidden">
                      <Music className="w-8 h-8 text-cyan-400" />
                      {isSelected && (
                        <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded flex items-center justify-center font-bold text-xs text-white ${
                          isSongA ? 'bg-cyan-500' : 'bg-green-500'
                        }`}>
                          {isSongA ? 'A' : 'B'}
                        </div>
                      )}
                      {isOtherSlot && (
                        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                          <span className="text-xs text-gray-400 font-medium">Already selected</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-white font-medium text-sm truncate mb-1" title={song.originalName}>
                      {song.originalName}
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-gray-400">
                        {song.analysis?.bpm ? `${Math.round(song.analysis.bpm)} BPM` : 'No BPM'}
                      </p>
                      {song.analysis?.key && (
                        <p className="text-gray-500">{song.analysis.key}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          {!showUploader && songs.length > 0 && (
            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload size={16} />
              <span>Upload Songs</span>
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-750 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
