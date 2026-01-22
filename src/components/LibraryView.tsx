import React, { useState, useEffect } from 'react';
import { Music, Search, Filter, Upload, Folder, Clock, Star, Grid3x3 as Grid3X3, List, Heart, MoreVertical, Shuffle, Plus, Sparkles, Download, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { blendExportService, BlendData } from '../lib/blendExportService';
import LibraryUploader from './LibraryUploader';
import SongDetailModal from './SongDetailModal';

interface LibraryViewProps {
  onCreateTransitionWithSong?: (song: UploadResult) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onCreateTransitionWithSong }) => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'songs' | 'blends'>('songs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [blends, setBlends] = useState<BlendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedSong, setSelectedSong] = useState<UploadResult | null>(null);

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-content-scroll');
    if (!scrollContainer) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = scrollContainer.scrollTop;
          const shouldBeScrolled = scrollTop > 20;
          setIsScrolled(prev => {
            if (prev !== shouldBeScrolled) {
              return shouldBeScrolled;
            }
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadData();
  }, [user, currentTab]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (currentTab === 'songs') {
        const uploads = await storageService.getUserUploads(user.id);
        setSongs(uploads.filter(u => u.status === 'ready'));
      } else {
        const userBlends = await blendExportService.getUserBlends(user.id);
        setBlends(userBlends);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSongs = loadData;

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 transition-all duration-300">
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

      {/* Tabs */}
      {!isScrolled && (
        <div className="flex items-center space-x-2 mb-6">
          <button
            onClick={() => setCurrentTab('songs')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
              currentTab === 'songs'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Music size={18} />
            <span>Songs</span>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{songs.length}</span>
          </button>
          <button
            onClick={() => setCurrentTab('blends')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
              currentTab === 'blends'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Sparkles size={18} />
            <span>Blends</span>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{blends.length}</span>
          </button>
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

      {/* Content: Songs or Blends */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400">Loading {currentTab === 'songs' ? 'your music library' : 'your blends'}...</p>
            </div>
          </div>
        ) : currentTab === 'songs' && filteredSongs.length === 0 ? (
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
        ) : currentTab === 'blends' && blends.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-blue-600/20 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles size={48} className="text-purple-400" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">No Blends Yet</h2>
                <p className="text-gray-400 leading-relaxed">
                  Create your first transition blend by selecting songs from your library and using the Transitions section.
                </p>
              </div>
            </div>
          </div>
        ) : currentTab === 'songs' ? (
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
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blends.map((blend) => (
              <div
                key={blend.id}
                className="group bg-gray-800 rounded-lg p-6 transition-all duration-200 hover:bg-gray-750 hover:shadow-lg border border-gray-700 hover:border-cyan-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      blend.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      blend.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {blend.status === 'completed' ? 'Ready' : blend.status === 'processing' ? 'Processing' : 'Failed'}
                    </span>
                  </div>
                  {blend.status === 'completed' && (
                    <a
                      href={blend.url}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </a>
                  )}
                </div>

                <h3 className="text-white font-semibold text-lg mb-2 truncate">
                  {blend.name}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white font-mono">{Math.floor(blend.duration / 60)}:{(blend.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Format:</span>
                    <span className="text-white uppercase">{blend.format}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Quality:</span>
                    <span className="text-white capitalize">{blend.quality}</span>
                  </div>
                </div>

                {blend.templateName && (
                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Clock size={14} />
                      <span>Template: {blend.templateName}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-700 mt-3">
                  <div className="text-xs text-gray-500">
                    Created {new Date(blend.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
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