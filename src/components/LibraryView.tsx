import React, { useState, useEffect } from 'react';
import { Music, Search, Filter, Upload, Folder, Clock, Star, Grid3x3 as Grid3X3, List, Heart, MoreVertical, Shuffle, Plus, Sparkles, Download, Play, Zap, CheckCircle, AlertCircle, Loader, Sliders, Trash, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { blendExportService, BlendData } from '../lib/blendExportService';
import { songAnalyzer } from '../lib/songAnalyzer';
import LibraryUploader from './LibraryUploader';
import SongDetailModal from './SongDetailModal';

interface LibraryViewProps {
  onCreateTransitionWithSong?: (song: UploadResult) => void;
  onNavigate?: (view: string, params?: any) => void;
  initialTab?: 'songs' | 'blends';
}

const LibraryView: React.FC<LibraryViewProps> = ({ onCreateTransitionWithSong, onNavigate, initialTab }) => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<'songs' | 'blends'>(initialTab || 'songs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'bpm'>('recent');
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [blends, setBlends] = useState<BlendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedSong, setSelectedSong] = useState<UploadResult | null>(null);

  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [uploads, userBlends] = await Promise.all([
        storageService.getUserUploads(user.id),
        blendExportService.getUserBlends(user.id)
      ]);

      setSongs(uploads.filter(u => u.status === 'ready'));
      setBlends(userBlends);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = loadAllData;

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

  const handleDeleteBlend = async (blendId: string) => {
    if (!user) return;

    const confirmed = window.confirm('Are you sure you want to delete this mash up? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await blendExportService.deleteBlend(blendId, user.id);
      setBlends(prevBlends => prevBlends.filter(b => b.id !== blendId));
    } catch (error) {
      console.error('Failed to delete blend:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete mash up. Please try again.');
    }
  };

  const uniqueGenres = Array.from(new Set(songs.map(song =>
    (song as any).manualGenre || song.analysis?.genre
  ).filter(Boolean))).sort();

  const filteredAndSortedSongs = songs
    .filter(song => {
      const matchesSearch = song.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFileType = selectedFilter === 'all' || song.mimeType?.includes(selectedFilter);
      const songGenre = (song as any).manualGenre || song.analysis?.genre;
      const matchesGenre = selectedGenre === 'all' || songGenre === selectedGenre;
      return matchesSearch && matchesFileType && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.originalName.localeCompare(b.originalName);
      } else if (sortBy === 'bpm') {
        const bpmA = a.analysis?.bpm || 0;
        const bpmB = b.analysis?.bpm || 0;
        return bpmB - bpmA;
      }
      return 0;
    });

  const filters = [
    { value: 'all', label: 'All Files' },
    { value: 'mp3', label: 'MP3' },
    { value: 'wav', label: 'WAV' },
    { value: 'flac', label: 'FLAC' }
  ];

  return (
    <div className="min-h-full flex flex-col p-2 sm:p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold text-white truncate">Music Library</h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <List size={14} />
            </button>
          </div>
          <button
            onClick={() => setShowUploader(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 text-sm"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTab('songs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-1.5 text-xs ${
              currentTab === 'songs'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Music size={13} />
            <span>Songs</span>
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{songs.length}</span>
          </button>
          <button
            onClick={() => setCurrentTab('blends')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-1.5 text-xs ${
              currentTab === 'blends'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Sparkles size={13} />
            <span>Mash Ups</span>
            <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">{blends.length}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
        >
          {filters.map(filter => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all duration-200 max-w-[100px] sm:max-w-none"
        >
          <option value="all">All Genres</option>
          {uniqueGenres.map(genre => {
            const count = songs.filter(s => ((s as any).manualGenre || s.analysis?.genre) === genre).length;
            return (
              <option key={genre} value={genre}>
                {genre} ({count})
              </option>
            );
          })}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'bpm')}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="bpm">BPM</option>
        </select>
      </div>

      {/* Content: Songs or Blends */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400">Loading {currentTab === 'songs' ? 'your music library' : 'your mash ups'}...</p>
            </div>
          </div>
        ) : currentTab === 'songs' && filteredAndSortedSongs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto">
                <Music size={32} className="text-cyan-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Your Library is Empty</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Start building your music collection by uploading audio files.
                </p>
              </div>
              <button
                onClick={() => setShowUploader(true)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
              >
                <Upload size={16} />
                <span className="text-sm">Upload Your First Track</span>
              </button>
            </div>
          </div>
        ) : currentTab === 'blends' && blends.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-blue-600/20 rounded-xl flex items-center justify-center mx-auto">
                <Sparkles size={32} className="text-purple-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">No Mash Ups Yet</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Create your first mash up by selecting songs from your library and using the Transitions section.
                </p>
              </div>
            </div>
          </div>
        ) : currentTab === 'songs' ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredAndSortedSongs.map((song) => {
                  const hasFullAnalysis = song.analysis?.bpm && song.analysis?.key;
                  const isAnalyzing = song.status === 'processing';

                  return (
                    <div
                      key={song.id}
                      className="group bg-gray-800 rounded-lg p-3 transition-all duration-200 hover:bg-gray-750 hover:shadow-lg relative"
                    >
                      <div
                        onClick={() => handleSongClick(song)}
                        className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-lg mb-2 flex items-center justify-center relative cursor-pointer"
                      >
                        <Music className="w-10 h-10 text-cyan-400" />

                        {!hasFullAnalysis && !isAnalyzing && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!user) return;
                              try {
                                await songAnalyzer.analyzeSong(song.id, user.id);
                              } catch (error) {
                                console.error('Analysis failed:', error);
                                alert(error instanceof Error ? error.message : 'Analysis failed');
                              }
                            }}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center"
                          >
                            <div className="flex flex-col items-center space-y-1">
                              <Sparkles className="w-6 h-6 text-purple-400" />
                              <span className="text-xs text-white font-medium">Analyze</span>
                            </div>
                          </button>
                        )}

                        {hasFullAnalysis && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500/90 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}

                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div onClick={() => handleSongClick(song)} className="cursor-pointer">
                        <h3 className="text-white font-medium text-xs truncate mb-0.5">
                          {song.originalName}
                        </h3>
                        <p className="text-gray-400 text-xs">
                          {song.analysis?.bpm ? `${Math.round(song.analysis.bpm)} BPM` : 'Not analyzed'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredAndSortedSongs.map((song) => {
                  const hasFullAnalysis = song.analysis?.bpm && song.analysis?.key;
                  const isAnalyzing = song.status === 'processing';

                  return (
                    <div
                      key={song.id}
                      className="group flex items-center space-x-3 bg-gray-800 rounded-lg p-3 transition-all duration-200 hover:bg-gray-750 relative"
                    >
                      <div
                        onClick={() => handleSongClick(song)}
                        className="w-10 h-10 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded flex items-center justify-center flex-shrink-0 cursor-pointer relative"
                      >
                        <Music className="w-5 h-5 text-cyan-400" />
                        {hasFullAnalysis && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                            <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div onClick={() => handleSongClick(song)} className="flex-1 min-w-0 cursor-pointer">
                        <h3 className="text-white font-medium text-sm truncate">{song.originalName}</h3>
                        <p className="text-gray-400 text-xs">
                          {song.analysis?.bpm ? `${Math.round(song.analysis.bpm)} BPM` : 'Not analyzed'}
                        </p>
                      </div>
                      {!hasFullAnalysis && !isAnalyzing && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!user) return;
                            try {
                              await songAnalyzer.analyzeSong(song.id, user.id);
                            } catch (error) {
                              console.error('Analysis failed:', error);
                              alert(error instanceof Error ? error.message : 'Analysis failed');
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Analyze</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {blends.map((blend) => (
              <div
                key={blend.id}
                className="group bg-gray-800 rounded-lg p-4 transition-all duration-200 hover:bg-gray-750 hover:shadow-lg border border-gray-700 hover:border-cyan-500"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      blend.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      blend.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {blend.status === 'completed' ? 'Ready' : blend.status === 'processing' ? 'Processing' : 'Failed'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {blend.status === 'completed' && blend.url && (
                      <a
                        href={blend.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBlend(blend.id);
                      }}
                      className="p-1.5 bg-gray-700 hover:bg-red-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full aspect-video bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mb-2 border border-cyan-500/30">
                    <Zap className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
                    {blend.name}
                  </h3>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white font-mono">{Math.floor(blend.duration / 60)}:{(blend.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Format:</span>
                    <span className="text-white uppercase">{blend.format}</span>
                  </div>
                  {blend.templateName && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Template:</span>
                      <span className="text-white truncate ml-2">{blend.templateName}</span>
                    </div>
                  )}
                </div>

                {blend.status === 'completed' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => onNavigate?.('mixer', { blendId: blend.id })}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1"
                      title="Use in Mixer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Use in Mix</span>
                    </button>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    {new Date(blend.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl sm:max-w-lg w-full max-h-[75vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-white">Upload Music</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
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