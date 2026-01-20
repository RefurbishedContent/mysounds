import React, { useState, useEffect } from 'react';
import { Music, Search, Filter, Upload, Folder, Clock, Star, Grid3X3, List, Play, Heart, MoreVertical } from 'lucide-react';

const LibraryView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for minimizing header (listen to parent scroll)
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

            <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
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

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Music size={48} className="text-cyan-400" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Your Library is Empty</h2>
            <p className="text-gray-400 leading-relaxed">
              Start building your music collection by uploading audio files.
              Organize your tracks, create playlists, and access them quickly when creating mixes.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
              <Upload size={20} />
              <span>Upload Your First Track</span>
            </button>
            
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Supported formats:</p>
              <div className="flex justify-center space-x-2">
                {['MP3', 'WAV', 'FLAC', 'M4A', 'AAC'].map((format) => (
                  <span key={format} className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <Folder size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Organize</h4>
                <p className="text-gray-500 text-xs">Create folders and playlists</p>
              </div>
              <div className="space-y-2">
                <Star size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Favorite</h4>
                <p className="text-gray-500 text-xs">Mark your best tracks</p>
              </div>
              <div className="space-y-2">
                <Clock size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Recent</h4>
                <p className="text-gray-500 text-xs">Quick access to latest uploads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryView;