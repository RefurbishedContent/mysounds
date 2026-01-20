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
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">File Manager</h1>
          <p className="text-gray-400">Manage your project files, uploads, and exports</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
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
          </div>
          
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
            <Upload size={20} />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <Filter size={18} className="text-gray-500" />
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
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
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive size={20} className="text-gray-400" />
            <div>
              <h3 className="text-white font-medium">Storage Usage</h3>
              <p className="text-gray-400 text-sm">0 MB used of 1 GB available</p>
            </div>
          </div>
          <div className="w-32 bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Folder size={48} className="text-cyan-400" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">No Files Yet</h2>
            <p className="text-gray-400 leading-relaxed">
              Your file storage is empty. Upload audio files, create projects, or export mixes 
              to start building your file collection. All your content will be organized here.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
              <Upload size={20} />
              <span>Upload Your First File</span>
            </button>
            
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Supported file types:</p>
              <div className="flex justify-center space-x-2">
                {['Audio Files', 'Project Files', 'Image Assets'].map((type) => (
                  <span key={type} className="px-3 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <FolderOpen size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Organize</h4>
                <p className="text-gray-500 text-xs">Create folders and structure</p>
              </div>
              <div className="space-y-2">
                <Download size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Download</h4>
                <p className="text-gray-500 text-xs">Export and backup files</p>
              </div>
              <div className="space-y-2">
                <Clock size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Version History</h4>
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