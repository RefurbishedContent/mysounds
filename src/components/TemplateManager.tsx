import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, Eye, Crown, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { databaseService, TemplateData } from '../lib/database';
import TemplateAuthor from './TemplateAuthor';

const TemplateManager: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const categories = [
    'all', 'electronic', 'hip-hop', 'house', 'techno', 'trance', 'dubstep', 'ambient', 'other'
  ];

  // Check admin access
  const isAdmin = user?.plan === 'admin';

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const templatesData = await databaseService.getTemplates();
        setTemplates(templatesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleCreateTemplate = () => {
    setEditingTemplateId(undefined);
    setCurrentView('create');
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplateId(templateId);
    setCurrentView('edit');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await databaseService.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Failed to delete template:', err);
      // Could show error toast here
    }
  };

  const handleSaveTemplate = (template: TemplateData) => {
    if (editingTemplateId) {
      // Update existing template
      setTemplates(prev => prev.map(t => t.id === editingTemplateId ? template : t));
    } else {
      // Add new template
      setTemplates(prev => [...prev, template]);
    }
    setCurrentView('list');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setEditingTemplateId(undefined);
  };

  const getDifficultyColor = (difficulty: TemplateData['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-900/30';
      case 'intermediate': return 'text-yellow-400 bg-yellow-900/30';
      case 'advanced': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-800/50';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-900/50 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">⚠</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-gray-400">Admin privileges required to access template authoring tools.</p>
        </div>
      </div>
    );
  }

  if (currentView === 'create' || currentView === 'edit') {
    return (
      <TemplateAuthor
        templateId={editingTemplateId}
        onBack={handleBackToList}
        onSave={handleSaveTemplate}
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Template Manager</h1>
          <p className="text-gray-400">Create and manage mixing templates for the community</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 hover:shadow-lg hover:shadow-purple-500/25"
        >
          <Plus size={20} />
          <span>Create Template</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search templates, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Loading Templates</h3>
            <p className="text-gray-400">Fetching template library...</p>
          </div>
        ) : error ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Templates</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Retry
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="glass-surface rounded-2xl p-12 text-center">
            <Search size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No templates found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first template to get started'
              }
            </p>
            {!searchQuery && selectedCategory === 'all' && selectedDifficulty === 'all' && (
              <button
                onClick={handleCreateTemplate}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-200"
              >
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="glass-surface rounded-xl overflow-hidden group hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                {/* Thumbnail */}
                <div className="relative">
                  <img 
                    src={template.thumbnailUrl} 
                    alt={template.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex space-x-2">
                    {template.isPopular && (
                      <span className="px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full flex items-center space-x-1">
                        <Star size={10} />
                        <span>Popular</span>
                      </span>
                    )}
                    {template.isPremium && (
                      <span className="px-2 py-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white text-xs rounded-full flex items-center space-x-1">
                        <Crown size={10} />
                        <span>Pro</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => handleEditTemplate(template.id)}
                      className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-200"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition-all duration-200">
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 bg-black/50 backdrop-blur-sm text-red-400 rounded-lg hover:bg-black/70 transition-all duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs rounded">
                      {template.duration}s
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{template.description}</p>
                  </div>

                  {/* Author & Category */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 truncate">by {template.author}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span>{formatNumber(template.downloads)} downloads</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star size={14} className="text-yellow-500" />
                        <span>{template.rating}</span>
                      </div>
                    </div>
                    <span className="capitalize">{template.category}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleEditTemplate(template.id)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Edit3 size={16} />
                      <span>Edit</span>
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200">
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;