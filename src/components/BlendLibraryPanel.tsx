import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Star, Plus, MoreVertical, CreditCard as Edit2, Trash2, Search, X, Grid2x2 as Grid, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BlendData } from '../lib/blendExportService';

interface BlendFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  parent_id: string | null;
  position: number;
  blendCount?: number;
}

interface BlendBin {
  id: string;
  folder_id: string;
  name: string;
  description: string;
  color: string;
  position: number;
  blendCount?: number;
}

interface BlendTag {
  id: string;
  name: string;
  color: string;
}

interface BlendLibraryPanelProps {
  onSelectBlend: (blend: BlendData) => void;
  selectedBlendIds?: string[];
}

export const BlendLibraryPanel: React.FC<BlendLibraryPanelProps> = ({
  onSelectBlend,
  selectedBlendIds = []
}) => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<BlendFolder[]>([]);
  const [bins, setBins] = useState<BlendBin[]>([]);
  const [tags, setTags] = useState<BlendTag[]>([]);
  const [blends, setBlends] = useState<BlendData[]>([]);
  const [favorites, setFavorites] = useState<BlendData[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['favorites']));
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibraryData();
  }, [user]);

  const loadLibraryData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load folders
      const { data: foldersData } = await supabase
        .from('blend_folders')
        .select('*')
        .order('position', { ascending: true });

      // Load bins
      const { data: binsData } = await supabase
        .from('blend_bins')
        .select('*')
        .order('position', { ascending: true });

      // Load tags
      const { data: tagsData } = await supabase
        .from('blend_tags')
        .select('*');

      // Load all blends
      const { data: blendsData } = await supabase
        .from('blends')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Load favorites
      const { data: favoritesData } = await supabase
        .from('blends')
        .select('*')
        .eq('status', 'completed')
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      setFolders(foldersData || []);
      setBins(binsData || []);
      setTags(tagsData || []);
      setBlends(blendsData || []);
      setFavorites(favoritesData || []);
    } catch (error) {
      console.error('Failed to load library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('blend_folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          color: '#3b82f6',
          icon: 'folder',
          position: folders.length
        })
        .select()
        .single();

      if (!error && data) {
        setFolders([...folders, data]);
        setNewFolderName('');
        setShowNewFolderDialog(false);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFavorite = async (blendId: string, currentValue: boolean) => {
    try {
      await supabase
        .from('blends')
        .update({ is_favorite: !currentValue })
        .eq('id', blendId);

      loadLibraryData();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const getFilteredBlends = () => {
    let filtered = [...blends];

    if (searchQuery) {
      filtered = filtered.filter(blend =>
        blend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFolder) {
      filtered = filtered.filter(blend => blend.folder_id === selectedFolder);
    }

    if (selectedBin) {
      filtered = filtered.filter(blend => blend.bin_id === selectedBin);
    }

    return filtered;
  };

  const getBinsForFolder = (folderId: string) => {
    return bins.filter(bin => bin.folder_id === folderId);
  };

  const getBlendsCount = (folderId?: string, binId?: string) => {
    if (binId) {
      return blends.filter(b => b.bin_id === binId).length;
    }
    if (folderId) {
      return blends.filter(b => b.folder_id === folderId).length;
    }
    return 0;
  };

  const filteredBlends = getFilteredBlends();

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar Tree */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white mb-3">Library</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mash ups..."
              className="w-full pl-9 pr-8 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Tree Structure */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
          {/* Favorites */}
          <div>
            <button
              onClick={() => {
                toggleFolder('favorites');
                setSelectedFolder(null);
                setSelectedBin(null);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                expandedFolders.has('favorites') && !selectedFolder && !selectedBin ? 'bg-gray-700' : ''
              }`}
            >
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
              <span className="flex-1 text-left text-sm text-white font-medium">Favorites</span>
              <span className="text-xs text-gray-400">{favorites.length}</span>
              {expandedFolders.has('favorites') ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* All Blends */}
          <button
            onClick={() => {
              setSelectedFolder(null);
              setSelectedBin(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
              !selectedFolder && !selectedBin ? 'bg-gray-700' : ''
            }`}
          >
            <Grid size={16} className="text-cyan-500" />
            <span className="flex-1 text-left text-sm text-white font-medium">All Mash Ups</span>
            <span className="text-xs text-gray-400">{blends.length}</span>
          </button>

          {/* Folders */}
          {folders.map(folder => {
            const isExpanded = expandedFolders.has(folder.id);
            const folderBins = getBinsForFolder(folder.id);
            const folderBlendCount = getBlendsCount(folder.id);

            return (
              <div key={folder.id}>
                <button
                  onClick={() => {
                    toggleFolder(folder.id);
                    setSelectedFolder(folder.id);
                    setSelectedBin(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                    selectedFolder === folder.id && !selectedBin ? 'bg-gray-700' : ''
                  }`}
                >
                  {isExpanded ? (
                    <FolderOpen size={16} style={{ color: folder.color }} />
                  ) : (
                    <Folder size={16} style={{ color: folder.color }} />
                  )}
                  <span className="flex-1 text-left text-sm text-white truncate">{folder.name}</span>
                  <span className="text-xs text-gray-400">{folderBlendCount}</span>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>

                {/* Bins */}
                {isExpanded && folderBins.length > 0 && (
                  <div className="ml-6 space-y-1 mt-1">
                    {folderBins.map(bin => {
                      const binBlendCount = getBlendsCount(undefined, bin.id);
                      return (
                        <button
                          key={bin.id}
                          onClick={() => {
                            setSelectedFolder(folder.id);
                            setSelectedBin(bin.id);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors ${
                            selectedBin === bin.id ? 'bg-gray-700' : ''
                          }`}
                        >
                          <Box size={14} style={{ color: bin.color }} />
                          <span className="flex-1 text-left text-xs text-white truncate">{bin.name}</span>
                          <span className="text-xs text-gray-400">{binBlendCount}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* New Folder Button */}
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-cyan-400"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">New Folder</span>
          </button>
        </div>
      </div>

      {/* Blend Grid */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {selectedBin
                  ? bins.find(b => b.id === selectedBin)?.name
                  : selectedFolder
                    ? folders.find(f => f.id === selectedFolder)?.name
                    : !selectedFolder && !selectedBin && !searchQuery
                      ? 'All Mash Ups'
                      : 'Search Results'}
              </h3>
              <p className="text-sm text-gray-400">{filteredBlends.length} mash ups</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredBlends.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400 text-sm">No mash ups found</p>
                <p className="text-gray-600 text-xs mt-2">
                  {searchQuery ? 'Try a different search term' : 'Create your first mash up in the Mash Up Editor'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredBlends.map(blend => {
                const isSelected = selectedBlendIds.includes(blend.id);
                const isFavorite = blend.is_favorite || false;

                return (
                  <div
                    key={blend.id}
                    className={`relative group p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-lg hover:shadow-cyan-500/10'
                    }`}
                  >
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(blend.id, isFavorite);
                      }}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700 transition-colors z-10"
                    >
                      <Star
                        size={16}
                        className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}
                      />
                    </button>

                    <button
                      onClick={() => !isSelected && onSelectBlend(blend)}
                      disabled={isSelected}
                      className="w-full text-left"
                    >
                      {/* Waveform Preview */}
                      <div className="h-16 bg-gray-900/50 rounded-lg mb-3 flex items-center justify-center">
                        <div className="flex items-end gap-0.5 h-8">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full"
                              style={{ height: `${Math.random() * 100}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      <h4 className="font-medium text-white text-sm mb-2 line-clamp-2" title={blend.name}>
                        {blend.name}
                      </h4>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{Math.floor(blend.duration / 60)}:{String(blend.duration % 60).padStart(2, '0')}</span>
                          <span>•</span>
                          <span>{blend.format.toUpperCase()}</span>
                        </div>
                        {blend.template_name && (
                          <div className="text-xs text-cyan-400 truncate">
                            {blend.template_name}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-96">
            <h3 className="text-lg font-bold text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
