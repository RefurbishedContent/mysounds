import React, { useState } from 'react';
import { Folder, Search, Filter, Upload, Download, Trash2, MoreVertical, File, FolderOpen, Grid3X3, List, Clock, HardDrive } from 'lucide-react';

const FilesView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');

  const folders = [
    { value: 'all', label: 'All Files' },
    { value: 'uploads', label: 'Uploads' },
    { value: 'projects', label: 'Project Files' },
    { value: 'exports', label: 'Exported Mixes' },
    { value: 'temp', label: 'Temporary Files' }
  ];

  return (
    <div className="h-full flex flex-col p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-lg font-bold text-white mb-0.5">File Manager</h1>
          <p className="text-xs text-gray-400">Manage your project files, uploads, and exports</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-0.5 bg-gray-800 rounded-lg p-0.5">
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
          </div>

          <button className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white text-sm rounded-lg font-semibold transition-all duration-200 flex items-center space-x-1.5 shadow-lg shadow-cyan-500/30">
            <Upload size={14} />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
          >
            {folders.map(folder => (
              <option key={folder.value} value={folder.value}>
                {folder.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Storage Info Banner */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive size={16} className="text-gray-400" />
            <div>
              <h3 className="text-white text-sm font-medium">Storage Usage</h3>
              <p className="text-gray-400 text-xs">0 MB used of 1 GB available</p>
            </div>
          </div>
          <div className="w-24 bg-gray-700 rounded-full h-1.5">
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto">
            <Folder size={24} className="text-cyan-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">No Files Yet</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your file storage is empty. Upload audio files, create projects, or export mixes to start building your file collection.
            </p>
          </div>

          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white text-sm rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:scale-105">
              <Upload size={16} />
              <span>Upload Your First File</span>
            </button>

            <div className="text-center">
              <p className="text-gray-500 text-xs mb-2">Supported file types:</p>
              <div className="flex justify-center space-x-2">
                {['Audio Files', 'Project Files', 'Image Assets'].map((type) => (
                  <span key={type} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <FolderOpen size={18} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-xs">Organize</h4>
                <p className="text-gray-500 text-xs">Create folders and structure</p>
              </div>
              <div className="space-y-1">
                <Download size={18} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-xs">Download</h4>
                <p className="text-gray-500 text-xs">Export and backup files</p>
              </div>
              <div className="space-y-1">
                <Clock size={18} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-xs">Version History</h4>
                <p className="text-gray-500 text-xs">Track file changes over time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesView;