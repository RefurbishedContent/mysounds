import React, { useState, useEffect } from 'react';
import { Music, Search, Filter, Upload, Folder, Clock, Star, Grid3X3, List, Heart, MoreVertical, Shuffle, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import LibraryUploader from './LibraryUploader';
import SongDetailModal from './SongDetailModal';

interface LibraryViewProps {
  onCreateTransitionWithSong?: (song: UploadResult) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onCreateTransitionWithSong }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedSong, setSelectedSong] = useState<UploadResult | null>(null);

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setIsScrolled(scrollTop > 20);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadSongs();
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const uploads = await storageService.getUserUploads(user.id);
      setSongs(uploads.filter(u => u.status === 'ready'));
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (upload: UploadResult) => {
    setShowUploader(false);
    // Reload the entire list to prevent duplicates
    await loadSongs();
  };

  const handleSongClick = (song: UploadResult) => {
    setSelectedSong(song);
  };

  const handleCreateTransition = (song: UploadResult) => {
    setSelectedSong(null);
    onCreateTransitionWithSong?.(song);
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' ||
      song.mimeType?.includes(selectedFilter);
    return matchesSearch && matchesFilter;
  });

  const filters = [
    { value: 'all', label: 'All Files' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'favorites', label: 'Favorites' },
    { value: 'mp3', label: 'MP3' },
    { value: 'wav', label: 'WAV' },
    { value: 'flac', label: 'FLAC' }
  ];

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      {!isScrolled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 transition-all duration-300">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Music Library</h1>
            <p className="text-gray-400">Organize and manage your audio collection</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <List size={18} />
              </button>
            </div>

            <button
              onClick={() => setShowUploader(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
            >
              <Upload size={20} />
              <span>Upload Music</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      {!isScrolled && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 transition-all duration-300">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search your music library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
            />
          </div>

          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-gray-500" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
            >
              {filters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Songs List/Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400">Loading your music library...</p>
            </div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
                <Music size={48} className="text-cyan-400" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Your Library is Empty</h2>
                <p className="text-gray-400 leading-relaxed">
                  Start building your music collection by uploading audio files.
                </p>
              </div>
              <button
                onClick={() => setShowUploader(true)}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
              >
                <Upload size={20} />
                <span>Upload Your First Track</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className="group bg-gray-800 rounded-lg p-4 transition-all duration-200 hover:bg-gray-750 hover:shadow-lg relative cursor-pointer"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-lg mb-3 flex items-center justify-center relative">
                      <Music className="w-12 h-12 text-cyan-400" />
                    </div>
                    <h3 className="text-white font-medium text-sm truncate mb-1">
                      {song.originalName}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {song.analysis?.bpm ? `${song.analysis.bpm} BPM` : 'Not analyzed'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className="group flex items-center space-x-4 bg-gray-800 rounded-lg p-4 transition-all duration-200 hover:bg-gray-750 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{song.originalName}</h3>
                      <p className="text-gray-400 text-sm">
                        {song.analysis?.bpm ? `${song.analysis.bpm} BPM` : 'Not analyzed'}
                        {song.analysis?.genre && ` • ${song.analysis.genre}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handlePlaySong(e, song)}
                      className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Dialog */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white">Upload Music</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            <div className="p-6">
              <LibraryUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {/* Song Detail Modal */}
      {selectedSong && (
        <SongDetailModal
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
          onCreateTransition={handleCreateTransition}
        />
      )}
    </div>
  );
};

export default LibraryView;