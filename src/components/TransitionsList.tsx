import React, { useState, useEffect } from 'react';
import { Play, Trash2, Music, Search, Filter, Clock, Sparkles, Plus } from 'lucide-react';
import { transitionsService, TransitionData } from '../lib/transitionsService';
import { useAuth } from '../contexts/AuthContext';

interface TransitionsListProps {
  onPlayTransition?: (transitionId: string) => void;
  onCreateNew?: () => void;
}

const TransitionsList: React.FC<TransitionsListProps> = ({ onPlayTransition, onCreateNew }) => {
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<TransitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'ready'>('all');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    loadTransitions();
  }, [user]);

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

  const loadTransitions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await transitionsService.getUserTransitions(user.id);
      setTransitions(data);
    } catch (error) {
      console.error('Failed to load transitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transitionId: string) => {
    if (!confirm('Are you sure you want to delete this transition?')) return;

    try {
      await transitionsService.deleteTransition(transitionId);
      setTransitions(prev => prev.filter(t => t.id !== transitionId));
    } catch (error) {
      console.error('Failed to delete transition:', error);
      alert('Failed to delete transition');
    }
  };

  const filteredTransitions = transitions.filter(transition => {
    const matchesSearch = transition.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || transition.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {!isScrolled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 transition-all duration-300">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Transitions</h1>
            <p className="text-gray-400">View and manage your saved song transitions</p>
          </div>

          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
          >
            <Plus size={20} />
            <span>Create New Transition</span>
          </button>
        </div>
      )}

      {!isScrolled && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 transition-all duration-300">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search transitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400">Loading transitions...</p>
            </div>
          </div>
        ) : filteredTransitions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles size={48} className="text-cyan-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">No Transitions Yet</h2>
                <p className="text-gray-400">
                  Create your first transition by blending two songs together
                </p>
              </div>
              <button
                onClick={onCreateNew}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
              >
                <Plus size={20} />
                <span>Create New Transition</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTransitions.map((transition) => (
              <div
                key={transition.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg mb-2 truncate">
                      {transition.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                      <Clock size={14} />
                      <span>{formatDate(transition.createdAt)}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transition.status === 'ready'
                        ? 'bg-green-900/30 text-green-400'
                        : transition.status === 'draft'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {transition.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3 bg-gray-900/50 rounded-lg p-3">
                    <Music className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Song A (Ending)</p>
                      <p className="text-sm text-white truncate">
                        {transition.metadata?.songAName || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-purple-400">
                      <div className="w-8 h-0.5 bg-purple-500"></div>
                      <Sparkles className="w-4 h-4" />
                      <div className="w-8 h-0.5 bg-purple-500"></div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-gray-900/50 rounded-lg p-3">
                    <Music className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Song B (Beginning)</p>
                      <p className="text-sm text-white truncate">
                        {transition.metadata?.songBName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Transition Duration</span>
                    <span className="text-white font-medium">{transition.transitionDuration}s</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Template</span>
                    <span className="text-white font-medium truncate ml-2">
                      {transition.metadata?.templateName || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPlayTransition?.(transition.id)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Play size={16} />
                    <span>Preview</span>
                  </button>
                  <button
                    onClick={() => handleDelete(transition.id)}
                    className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-all duration-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitionsList;
