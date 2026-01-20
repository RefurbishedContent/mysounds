import React, { useState } from 'react';
import { useEffect } from 'react';
import { Plus, Search, Filter, Play, MoreVertical, Clock, Music, Trash2, Edit3, Copy, Archive, FolderOpen, Calendar, SortAsc, SortDesc } from 'lucide-react';
import { databaseService, ProjectData } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, activityLogger } from '../lib/analytics';

interface ProjectListProps {
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onCreateProject, onOpenProject }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Load user's projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const projectsData = await databaseService.getUserProjects(user.id);
        setProjects(projectsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

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

  // Sort and filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'created':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updated':
      default:
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    
    try {
      await databaseService.deleteProject(projectId, user.id);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setShowDropdown(null);
      
      // Track analytics
      analyticsService.trackFeature('project', 'deleted', { projectId }, user.id);
      await activityLogger.logProject('deleted', projectId, user.id);
    } catch (err) {
      console.error('Failed to delete project:', err);
      // Could show error toast here
    }
  };

  const handleRenameProject = async (projectId: string, newProjectName: string) => {
    if (!user || !newProjectName.trim()) return;
    
    try {
      setActionLoading(projectId);
      await databaseService.updateProject(projectId, user.id, {
        name: newProjectName.trim()
      });
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, name: newProjectName.trim() } : p
      ));
      setEditingName(null);
      setShowDropdown(null);
      
      // Track analytics
      analyticsService.trackFeature('project', 'renamed', {
        projectId,
        oldName: projects.find(p => p.id === projectId)?.name,
        newName: newProjectName.trim()
      }, user.id);
    } catch (err) {
      console.error('Failed to rename project:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateProject = async (project: ProjectData) => {
    if (!user) return;
    
    try {
      setActionLoading(project.id);
      const duplicatedProject = await databaseService.duplicateProject(project.id, user.id);
      setProjects(prev => [duplicatedProject, ...prev]);
      setShowDropdown(null);
      
      // Track analytics
      analyticsService.trackFeature('project', 'duplicated', {
        originalProjectId: project.id,
        newProjectId: duplicatedProject.id,
        originalName: project.name,
        newName: duplicatedProject.name
      }, user.id);
      
      await activityLogger.logProject('duplicated', duplicatedProject.id, user.id, {
        originalProjectId: project.id,
        originalName: project.name,
        templateCount: project.templatePlacements?.length || 0
      });
    } catch (err) {
      console.error('Failed to duplicate project:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!user) return;
    
    if (!confirm('Archive this project? You can restore it later from the archived projects view.')) {
      return;
    }
    
    try {
      setActionLoading(projectId);
      await databaseService.updateProject(projectId, user.id, {
        status: 'archived' as any
      });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setShowDropdown(null);
    } catch (err) {
      console.error('Failed to archive project:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const startRename = (project: ProjectData) => {
    setEditingName(project.id);
    setNewName(project.name);
    setShowDropdown(null);
  };

  const cancelRename = () => {
    setEditingName(null);
    setNewName('');
  };

  const getStatusColor = (status: ProjectData['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900/30';
      case 'processing': return 'text-yellow-400 bg-yellow-900/30';
      case 'draft': return 'text-gray-400 bg-gray-800/50';
      case 'error': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-800/50';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      {!isScrolled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 transition-all duration-300">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
            <p className="text-gray-400">Manage and organize your DJ mixes</p>
          </div>
          <button
            onClick={onCreateProject}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 hover:shadow-xl hover:shadow-cyan-500/40"
          >
            <Plus size={20} />
            <span>New Project</span>
          </button>
        </div>
      )}

      {/* Filters */}
      {!isScrolled && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 transition-all duration-300">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="draft">Draft</option>
            </select>

            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
              >
                <option value="updated">Last Modified</option>
                <option value="created">Date Created</option>
                <option value="name">Name</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="glass-surface rounded-2xl p-12 text-center shadow-xl shadow-cyan-500/10">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Projects</h3>
            <p className="text-gray-400">Fetching your mixing projects...</p>
          </div>
        ) : error ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Projects</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30"
            >
              Retry
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <Music size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No projects found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first project to get started'
              }
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={onCreateProject}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/40"
              >
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="glass-surface rounded-xl overflow-hidden group hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300">
                {/* Thumbnail */}
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden">
                    <div className="relative w-40 h-40 group-hover:scale-110 transition-transform duration-300">
                      <svg viewBox="0 0 200 200" className="w-full h-full animate-spin-slow">
                        <defs>
                          <linearGradient id={`vinyl-grad-${project.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0891b2" />
                            <stop offset="50%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                          <radialGradient id={`vinyl-center-${project.id}`}>
                            <stop offset="0%" stopColor="#1f2937" />
                            <stop offset="100%" stopColor="#111827" />
                          </radialGradient>
                        </defs>

                        {/* Vinyl disc */}
                        <circle cx="100" cy="100" r="95" fill="#0f172a" />

                        {/* Grooves */}
                        {[...Array(15)].map((_, i) => (
                          <circle
                            key={i}
                            cx="100"
                            cy="100"
                            r={85 - i * 5}
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="2"
                            opacity={0.3}
                          />
                        ))}

                        {/* Gradient ring */}
                        <circle
                          cx="100"
                          cy="100"
                          r="88"
                          fill="none"
                          stroke={`url(#vinyl-grad-${project.id})`}
                          strokeWidth="4"
                          opacity={0.8}
                        />

                        {/* Center label */}
                        <circle cx="100" cy="100" r="35" fill={`url(#vinyl-center-${project.id})`} />
                        <circle
                          cx="100"
                          cy="100"
                          r="35"
                          fill="none"
                          stroke={`url(#vinyl-grad-${project.id})`}
                          strokeWidth="2"
                        />

                        {/* Center hole */}
                        <circle cx="100" cy="100" r="8" fill="#000000" />

                        {/* Music note icon */}
                        <g transform="translate(85, 85)">
                          <path
                            d="M10 0C10 0 10 12 10 15C10 18 8 20 5 20C2 20 0 18 0 15C0 12 2 10 5 10C6.5 10 8 10.5 10 11.5V0Z M20 0C20 0 20 10 20 13C20 16 18 18 15 18C12 18 10 16 10 13C10 10 12 8 15 8C16.5 8 18 8.5 20 9.5V0Z"
                            fill={`url(#vinyl-grad-${project.id})`}
                            transform="scale(0.7)"
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      onClick={() => onOpenProject(project.id)}
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/30 transition-all duration-200 flex items-center space-x-2"
                    >
                      <Play size={16} />
                      <span>Open</span>
                    </button>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </div>

                  {/* Actions Menu */}
                  <div className="absolute top-3 right-3">
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(showDropdown === project.id ? null : project.id)}
                        className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-200"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {showDropdown === project.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10">
                          <div className="py-1">
                            <button 
                              onClick={() => startRename(project)}
                              disabled={actionLoading === project.id}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                            >
                              <Edit3 size={16} />
                              <span>Rename</span>
                            </button>
                            <button 
                              onClick={() => handleDuplicateProject(project)}
                              disabled={actionLoading === project.id}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                            >
                              <Copy size={16} />
                              <span>Duplicate</span>
                            </button>
                            <button 
                              onClick={() => handleArchiveProject(project.id)}
                              disabled={actionLoading === project.id}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
                            >
                              <Archive size={16} />
                              <span>Archive</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={actionLoading === project.id}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors duration-200"
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                            
                            {actionLoading === project.id && (
                              <div className="px-4 py-2 text-center">
                                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    {editingName === project.id ? (
                      <div className="flex items-center space-x-2 mb-1">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameProject(project.id, newName);
                            } else if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-500 rounded text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:shadow-lg focus:shadow-cyan-500/20"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameProject(project.id, newName)}
                          disabled={!newName.trim() || actionLoading === project.id}
                          className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                    )}
                    <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>
                  </div>

                  {/* Tracks */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Music size={14} />
                      <span className="truncate">{project.trackAName || 'Track A'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Music size={14} />
                      <span className="truncate">{project.trackBName || 'Track B'}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock size={14} />
                        <span>{formatDuration(project.duration)}</span>
                      </div>
                      <span className="text-gray-500">{project.bpm} BPM</span>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">{getRelativeTime(project.updatedAt)}</div>
                      <div className="text-gray-500 text-xs">{formatDate(project.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Click outside to close dropdowns */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(null)}
        />
      )}
    </div>
  );
};

export default ProjectList;