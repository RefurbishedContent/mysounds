import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Music, Search, Filter, Clock, Sparkles, Plus, Edit, Layers } from 'lucide-react';
import { transitionsService, TransitionData } from '../lib/transitionsService';
import { useAuth } from '../contexts/AuthContext';
import MashUpEditStageModal from './mashup/MashUpEditStageModal';
import { getDraftStageProgress, DraftStageInfo } from './mashup/draftStageUtils';

interface TransitionsListProps {
  onPlayTransition?: (transitionId: string) => void;
  onEditTransition?: (transitionId: string, startingStage?: number) => void;
  onCreateNew?: () => void;
  onBlendTransition?: () => void;
}

interface GroupedMashUp {
  groupName: string;
  transitions: TransitionData[];
  stageInfo: DraftStageInfo;
  primaryTransition: TransitionData;
}

const TransitionsList: React.FC<TransitionsListProps> = ({
  onEditTransition,
  onCreateNew,
  onBlendTransition,
}) => {
  const { user } = useAuth();
  const [transitions, setTransitions] = useState<TransitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'ready'>('all');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupedMashUp | null>(null);

  useEffect(() => {
    loadTransitions();
  }, [user]);

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

  const groupedMashUps = useMemo(() => {
    const groups = new Map<string, TransitionData[]>();

    transitions.forEach((transition) => {
      const groupName = transition.metadata?.mashUpGroup || transition.id;
      const existing = groups.get(groupName) || [];
      existing.push(transition);
      groups.set(groupName, existing);
    });

    const result: GroupedMashUp[] = [];
    groups.forEach((groupTransitions, groupName) => {
      const sortedTransitions = groupTransitions.sort(
        (a, b) => (a.metadata?.pairIndex ?? 0) - (b.metadata?.pairIndex ?? 0)
      );
      const stageInfo = getDraftStageProgress(sortedTransitions);
      result.push({
        groupName,
        transitions: sortedTransitions,
        stageInfo,
        primaryTransition: sortedTransitions[0],
      });
    });

    return result.sort(
      (a, b) =>
        new Date(b.primaryTransition.createdAt).getTime() -
        new Date(a.primaryTransition.createdAt).getTime()
    );
  }, [transitions]);

  const handleDelete = async (group: GroupedMashUp) => {
    if (!confirm('Are you sure you want to delete this mash up and all its transitions?')) return;

    try {
      for (const t of group.transitions) {
        await transitionsService.deleteTransition(t.id);
      }
      setTransitions((prev) =>
        prev.filter((t) => !group.transitions.some((gt) => gt.id === t.id))
      );
    } catch (error) {
      console.error('Failed to delete transitions:', error);
      alert('Failed to delete mash up');
    }
  };

  const handleEditClick = (group: GroupedMashUp) => {
    setSelectedGroup(group);
    setEditModalOpen(true);
  };

  const handleStageSelect = (stage: number) => {
    if (selectedGroup) {
      onEditTransition?.(selectedGroup.primaryTransition.id, stage);
    }
    setEditModalOpen(false);
    setSelectedGroup(null);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
    setSelectedGroup(null);
  };

  const filteredGroups = groupedMashUps.filter((group) => {
    const matchesSearch =
      group.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.transitions.some(
        (t) =>
          t.metadata?.songAName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.metadata?.songBName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesFilter =
      filterStatus === 'all' || group.primaryTransition.status === filterStatus;
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

  const getProgressBadgeColor = (stageInfo: DraftStageInfo) => {
    if (stageInfo.stageKey === 'complete') {
      return 'bg-green-900/30 text-green-400';
    }
    return 'bg-amber-900/30 text-amber-400';
  };

  return (
    <div className="h-full flex flex-col p-2 sm:p-3 md:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">My Mash Ups</h1>
          <p className="text-sm text-gray-400">View and manage your saved song mash ups</p>
        </div>

        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
        >
          <Plus size={16} />
          <span className="text-sm">Create New Mash Up</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search mash ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'ready')}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-200"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400">Loading mash ups...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto">
                <Sparkles size={32} className="text-cyan-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">No Mash Ups Yet</h2>
                <p className="text-sm text-gray-400">
                  Create your first mash up by mixing two songs together
                </p>
              </div>
              <button
                onClick={onCreateNew}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105 mx-auto"
              >
                <Plus size={16} />
                <span className="text-sm">Create New Mash Up</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredGroups.map((group) => {
              const transition = group.primaryTransition;
              const songCount = group.transitions.length + 1;

              return (
                <div
                  key={group.groupName}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm mb-1.5 truncate">
                        {group.groupName}
                      </h3>
                      <div className="flex items-center space-x-1.5 text-xs text-gray-400 mb-2">
                        <Clock size={12} />
                        <span>{formatDate(transition.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        onClick={() => transition.status === 'ready' && onBlendTransition?.()}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          transition.status === 'ready'
                            ? 'bg-green-900/30 text-green-400 cursor-pointer hover:bg-green-900/50 transition-colors'
                            : transition.status === 'draft'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                        title={transition.status === 'ready' ? 'Click to create this mash up' : ''}
                      >
                        {transition.status}
                      </span>
                      {transition.status === 'draft' && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProgressBadgeColor(
                            group.stageInfo
                          )}`}
                        >
                          Step {group.stageInfo.currentStage} of {group.stageInfo.totalStages}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center space-x-2 bg-gray-900/50 rounded-lg p-2">
                      <Music className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">
                          {songCount} {songCount === 1 ? 'Song' : 'Songs'}
                        </p>
                        <p className="text-xs text-white truncate">
                          {transition.metadata?.songAName || 'Unknown'}
                          {group.transitions.length > 0 && ' + more'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-1.5 text-cyan-400">
                        <div className="w-6 h-0.5 bg-cyan-500"></div>
                        <Sparkles className="w-3 h-3" />
                        <div className="w-6 h-0.5 bg-cyan-500"></div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-gray-900/50 rounded-lg p-2">
                      <Layers className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">
                          {group.transitions.length}{' '}
                          {group.transitions.length === 1 ? 'Transition' : 'Transitions'}
                        </p>
                        <p className="text-xs text-white truncate">
                          {transition.metadata?.templateName || 'Template pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Total Duration</span>
                      <span className="text-white font-medium">
                        {group.transitions.reduce((sum, t) => sum + (t.transitionDuration || 0), 0)}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="text-gray-400">Current Step</span>
                      <span className="text-white font-medium truncate ml-2">
                        {group.stageInfo.stageName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleEditClick(group)}
                      className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onBlendTransition?.()}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <Layers size={14} />
                      <span>Mash Up</span>
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-all duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedGroup && (
        <MashUpEditStageModal
          isOpen={editModalOpen}
          onClose={handleModalClose}
          onSelectStage={handleStageSelect}
          stageInfo={selectedGroup.stageInfo}
          mashUpName={selectedGroup.groupName}
        />
      )}
    </div>
  );
};

export default TransitionsList;
