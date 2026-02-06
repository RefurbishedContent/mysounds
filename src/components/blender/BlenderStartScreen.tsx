import React, { useState, useEffect } from 'react';
import { Search, Filter, Music, Clock, Layers, Edit3, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { TransitionData, transitionsService } from '../../lib/transitionsService';
import { storageService } from '../../lib/storage';
import { useAuth } from '../../contexts/AuthContext';

interface BlenderStartScreenProps {
  onSelectTransition: (transition: TransitionData) => void;
  onEditTransition: (transitionId: string) => void;
}

const BlenderStartScreen: React.FC<BlenderStartScreenProps> = ({
  onSelectTransition,
  onEditTransition
}) => {
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<TransitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'draft'>('ready');
  const [songNames, setSongNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadTransitions();
    }
  }, [user]);

  const loadTransitions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await transitionsService.getUserTransitions(user.id);
      setTransitions(data);

      const names: Record<string, string> = {};
      for (const transition of data) {
        if (!names[transition.songAId]) {
          const songA = await storageService.getUpload(transition.songAId);
          names[transition.songAId] = songA?.originalName || 'Unknown Song';
        }
        if (!names[transition.songBId]) {
          const songB = await storageService.getUpload(transition.songBId);
          names[transition.songBId] = songB?.originalName || 'Unknown Song';
        }
      }
      setSongNames(names);
    } catch (error) {
      console.error('Failed to load transitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransitions = transitions.filter(transition => {
    const matchesSearch = searchQuery === '' ||
      transition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      songNames[transition.songAId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      songNames[transition.songBId]?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || transition.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const readyCount = transitions.filter(t => t.status === 'ready').length;
  const totalCount = transitions.length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading transitions...</p>
        </div>
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Transitions Yet</h3>
          <p className="text-gray-400 mb-6">
            You need to create transitions before you can use the Blender.
            Head to the Transitions tool to get started.
          </p>
          <button
            onClick={() => onEditTransition('new')}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-medium hover:from-teal-600 hover:to-cyan-600 transition-all"
          >
            Create First Transition
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="p-3 md:p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Transitions</p>
                  <p className="text-2xl font-bold text-white">{totalCount}</p>
                </div>
                <Layers className="w-8 h-8 text-teal-500" />
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Ready to Blend</p>
                  <p className="text-2xl font-bold text-white">{readyCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Draft</p>
                  <p className="text-2xl font-bold text-white">{totalCount - readyCount}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search transitions by name or song..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-teal-500 text-sm appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransitions.map((transition) => (
              <TransitionCard
                key={transition.id}
                transition={transition}
                songAName={songNames[transition.songAId] || 'Loading...'}
                songBName={songNames[transition.songBId] || 'Loading...'}
                onSelect={() => onSelectTransition(transition)}
                onEdit={() => onEditTransition(transition.id)}
              />
            ))}
          </div>

          {filteredTransitions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No transitions found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TransitionCardProps {
  transition: TransitionData;
  songAName: string;
  songBName: string;
  onSelect: () => void;
  onEdit: () => void;
}

const TransitionCard: React.FC<TransitionCardProps> = ({
  transition,
  songAName,
  songBName,
  onSelect,
  onEdit
}) => {
  const isReady = transition.status === 'ready';
  const totalDuration = Math.round(
    (transition.songAMarkerPoint || 0) +
    transition.transitionDuration +
    ((transition.songBMarkerPoint || 0))
  );

  const statusColors = {
    ready: 'bg-green-500/10 text-green-400 border-green-500/30',
    draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30'
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-teal-500/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 flex-1">
          {transition.name}
        </h3>
        <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[transition.status]} ml-2`}>
          {transition.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-xs text-gray-400">
          <Music size={14} className="mr-1.5 flex-shrink-0" />
          <span className="line-clamp-1">{songAName}</span>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          <Music size={14} className="mr-1.5 flex-shrink-0" />
          <span className="line-clamp-1">{songBName}</span>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          <Clock size={14} className="mr-1.5 flex-shrink-0" />
          <span>~{totalDuration}s total</span>
        </div>
        {transition.metadata?.templateName && (
          <div className="flex items-center text-xs text-gray-400">
            <Layers size={14} className="mr-1.5 flex-shrink-0" />
            <span className="line-clamp-1">{transition.metadata.templateName}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelect}
          disabled={!isReady}
          className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
            isReady
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isReady ? 'Select' : 'Not Ready'}
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Edit3 size={16} />
        </button>
      </div>
    </div>
  );
};

export default BlenderStartScreen;
