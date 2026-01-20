import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  Upload, 
  ArrowLeft,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { databaseService, TemplateData } from '../lib/database';
import { Transition, Template } from '../types';

interface TemplateAuthorProps {
  templateId?: string;
  onBack: () => void;
  onSave: (template: TemplateData) => void;
}

interface ParameterSchema {
  type: 'number' | 'boolean' | 'string' | 'select';
  label: string;
  description?: string;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

interface VolumeAutomationPoint {
  time: number;
  trackA: number;
  trackB: number;
}

const TemplateAuthor: React.FC<TemplateAuthorProps> = ({ templateId, onBack, onSave }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Template data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('electronic');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [duration, setDuration] = useState(32);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Parameter schema
  const [parameters, setParameters] = useState<Record<string, ParameterSchema>>({});
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamType, setNewParamType] = useState<ParameterSchema['type']>('number');
  
  // Transitions
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  
  // Preview
  const [previewTime, setPreviewTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'transitions']));

  const categories = [
    'electronic', 'hip-hop', 'house', 'techno', 'trance', 'dubstep', 'ambient', 'other'
  ];

  const transitionTypes = [
    'crossfade', 'cut', 'scratch', 'echo', 'filter', 'reverse', 'stutter', 'drop'
  ];

  // Load existing template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) return;
      
      try {
        setLoading(true);
        const template = await databaseService.getTemplate(templateId);
        
        if (!template) {
          setError('Template not found');
          return;
        }
        
        // Populate form with template data
        setName(template.name);
        setDescription(template.description);
        setCategory(template.category);
        setDifficulty(template.difficulty);
        setDuration(template.duration);
        setThumbnailUrl(template.thumbnailUrl);
        setIsPremium(template.isPremium);
        setIsPopular(template.isPopular);
        
        // Load template data if available
        const templateData = template.templateData || {};
        setParameters(templateData.parameterSchema || {});
        setTransitions(templateData.transitions || []);
        setTags(templateData.tags || []);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // Preview animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setPreviewTime(prev => {
        const next = prev + 0.1;
        return next >= duration ? 0 : next;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addParameter = () => {
    if (newParamKey.trim() && !parameters[newParamKey]) {
      const newParam: ParameterSchema = {
        type: newParamType,
        label: newParamKey.charAt(0).toUpperCase() + newParamKey.slice(1),
        default: newParamType === 'boolean' ? false : newParamType === 'number' ? 0 : ''
      };
      
      if (newParamType === 'number') {
        newParam.min = 0;
        newParam.max = 100;
        newParam.step = 1;
      } else if (newParamType === 'select') {
        newParam.options = ['option1', 'option2'];
      }
      
      setParameters({ ...parameters, [newParamKey]: newParam });
      setNewParamKey('');
    }
  };

  const updateParameter = (key: string, updates: Partial<ParameterSchema>) => {
    setParameters({
      ...parameters,
      [key]: { ...parameters[key], ...updates }
    });
  };

  const removeParameter = (key: string) => {
    const newParams = { ...parameters };
    delete newParams[key];
    setParameters(newParams);
  };

  const addTransition = () => {
    const newTransition: Transition = {
      id: `transition-${Date.now()}`,
      type: 'crossfade',
      startTime: 0,
      duration: 8,
      parameters: {
        curve: 'scurve',
        volumeAutomation: [
          { time: 0, trackA: 100, trackB: 0 },
          { time: 8, trackA: 0, trackB: 100 }
        ]
      }
    };
    
    setTransitions([...transitions, newTransition]);
    setSelectedTransition(newTransition.id);
  };

  const updateTransition = (id: string, updates: Partial<Transition>) => {
    setTransitions(transitions.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const removeTransition = (id: string) => {
    setTransitions(transitions.filter(t => t.id !== id));
    if (selectedTransition === id) {
      setSelectedTransition(null);
    }
  };

  const addAutomationPoint = (transitionId: string) => {
    const transition = transitions.find(t => t.id === transitionId);
    if (!transition?.parameters.volumeAutomation) return;
    
    const automation = [...transition.parameters.volumeAutomation];
    const newPoint: VolumeAutomationPoint = {
      time: transition.duration / 2,
      trackA: 50,
      trackB: 50
    };
    
    automation.push(newPoint);
    automation.sort((a, b) => a.time - b.time);
    
    updateTransition(transitionId, {
      parameters: {
        ...transition.parameters,
        volumeAutomation: automation
      }
    });
  };

  const updateAutomationPoint = (transitionId: string, index: number, updates: Partial<VolumeAutomationPoint>) => {
    const transition = transitions.find(t => t.id === transitionId);
    if (!transition?.parameters.volumeAutomation) return;
    
    const automation = [...transition.parameters.volumeAutomation];
    automation[index] = { ...automation[index], ...updates };
    
    updateTransition(transitionId, {
      parameters: {
        ...transition.parameters,
        volumeAutomation: automation
      }
    });
  };

  const removeAutomationPoint = (transitionId: string, index: number) => {
    const transition = transitions.find(t => t.id === transitionId);
    if (!transition?.parameters.volumeAutomation || transition.parameters.volumeAutomation.length <= 2) return;
    
    const automation = [...transition.parameters.volumeAutomation];
    automation.splice(index, 1);
    
    updateTransition(transitionId, {
      parameters: {
        ...transition.parameters,
        volumeAutomation: automation
      }
    });
  };

  const renderAutomationCurve = (transition: Transition) => {
    if (!transition.parameters.volumeAutomation) return null;
    
    const automation = transition.parameters.volumeAutomation;
    const width = 400;
    const height = 200;
    const padding = 20;
    
    const scaleX = (time: number) => padding + (time / transition.duration) * (width - 2 * padding);
    const scaleY = (volume: number) => height - padding - (volume / 100) * (height - 2 * padding);
    
    // Generate path for Track A
    const pathA = automation.map((point, index) => {
      const x = scaleX(point.time);
      const y = scaleY(point.trackA);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    // Generate path for Track B
    const pathB = automation.map((point, index) => {
      const x = scaleX(point.time);
      const y = scaleY(point.trackB);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    // Preview playhead position
    const playheadX = scaleX(previewTime - transition.startTime);
    const showPlayhead = previewTime >= transition.startTime && previewTime <= transition.startTime + transition.duration;
    
    return (
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Volume Automation</h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => setPreviewTime(0)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        
        <svg width={width} height={height} className="border border-gray-700 rounded">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(volume => (
            <line
              key={volume}
              x1={padding}
              y1={scaleY(volume)}
              x2={width - padding}
              y2={scaleY(volume)}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Time markers */}
          {Array.from({ length: Math.ceil(transition.duration) + 1 }, (_, i) => (
            <line
              key={i}
              x1={scaleX(i)}
              y1={padding}
              x2={scaleX(i)}
              y2={height - padding}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          ))}
          
          {/* Track A curve */}
          <path
            d={pathA}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Track B curve */}
          <path
            d={pathB}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Automation points */}
          {automation.map((point, index) => (
            <g key={index}>
              <circle
                cx={scaleX(point.time)}
                cy={scaleY(point.trackA)}
                r="6"
                fill="#3B82F6"
                stroke="#1E40AF"
                strokeWidth="2"
                className="cursor-pointer hover:r-8 transition-all duration-200"
              />
              <circle
                cx={scaleX(point.time)}
                cy={scaleY(point.trackB)}
                r="6"
                fill="#F59E0B"
                stroke="#D97706"
                strokeWidth="2"
                className="cursor-pointer hover:r-8 transition-all duration-200"
              />
            </g>
          ))}
          
          {/* Preview playhead */}
          {showPlayhead && (
            <line
              x1={playheadX}
              y1={padding}
              x2={playheadX}
              y2={height - padding}
              stroke="#10B981"
              strokeWidth="2"
            />
          )}
          
          {/* Labels */}
          <text x={padding} y={15} fill="#9CA3AF" fontSize="12">100%</text>
          <text x={padding} y={height - 5} fill="#9CA3AF" fontSize="12">0%</text>
          <text x={padding} y={height - padding + 15} fill="#9CA3AF" fontSize="12">0s</text>
          <text x={width - padding - 20} y={height - padding + 15} fill="#9CA3AF" fontSize="12">{transition.duration}s</text>
        </svg>
        
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-300">Track A</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-300">Track B</span>
            </div>
          </div>
          <div className="text-gray-400">
            Time: {previewTime.toFixed(1)}s
          </div>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!user || user.plan !== 'admin') {
      setError('Admin access required');
      return;
    }
    
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const templateData: TemplateData = {
        id: templateId || '',
        name: name.trim(),
        description: description.trim(),
        category,
        difficulty,
        duration,
        thumbnailUrl: thumbnailUrl || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400',
        isPremium,
        isPopular,
        author: user.name,
        downloads: 0,
        rating: 0,
        templateData: {
          parameterSchema: parameters,
          transitions,
          tags,
          requirements: {
            minDuration: duration * 2,
            bpmRange: [80, 160] as [number, number],
            genreRecommendations: [category]
          }
        }
      };
      
      if (templateId) {
        // Update existing template
        await databaseService.updateTemplate(templateId, templateData);
      } else {
        // Create new template
        await databaseService.createTemplate(templateData);
      }
      
      onSave(templateData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {templateId ? 'Edit Template' : 'Create Template'}
            </h1>
            <p className="text-gray-400">Design mixing templates for the community</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2">
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <section className="glass-surface rounded-2xl p-6">
            <button
              onClick={() => toggleSection('basic')}
              className="flex items-center justify-between w-full text-left mb-6"
            >
              <h2 className="text-xl font-semibold text-white">Basic Information</h2>
              {expandedSections.has('basic') ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('basic') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter template name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Describe what this template does"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Duration (seconds)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min="1"
                      max="300"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Thumbnail URL</label>
                    <input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPremium}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-gray-300">Premium Template</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPopular}
                        onChange={(e) => setIsPopular(e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <span className="text-gray-300">Mark as Popular</span>
                    </label>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm flex items-center space-x-2"
                        >
                          <span>{tag}</span>
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-purple-400 hover:text-purple-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="Add tag"
                      />
                      <button
                        onClick={addTag}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Parameters */}
          <section className="glass-surface rounded-2xl p-6">
            <button
              onClick={() => toggleSection('parameters')}
              className="flex items-center justify-between w-full text-left mb-6"
            >
              <h2 className="text-xl font-semibold text-white">Parameters</h2>
              {expandedSections.has('parameters') ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('parameters') && (
              <div className="space-y-6">
                {/* Add Parameter */}
                <div className="flex space-x-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Parameter Key</label>
                    <input
                      type="text"
                      value={newParamKey}
                      onChange={(e) => setNewParamKey(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="parameterName"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={newParamType}
                      onChange={(e) => setNewParamType(e.target.value as any)}
                      className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="string">String</option>
                      <option value="select">Select</option>
                    </select>
                  </div>
                  <button
                    onClick={addParameter}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>
                
                {/* Parameter List */}
                <div className="space-y-4">
                  {Object.entries(parameters).map(([key, param]) => (
                    <div key={key} className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-white">{key}</h4>
                        <button
                          onClick={() => removeParameter(key)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
                          <input
                            type="text"
                            value={param.label}
                            onChange={(e) => updateParameter(key, { label: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                          <input
                            type="text"
                            value={param.description || ''}
                            onChange={(e) => updateParameter(key, { description: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Default Value</label>
                          {param.type === 'boolean' ? (
                            <select
                              value={param.default.toString()}
                              onChange={(e) => updateParameter(key, { default: e.target.value === 'true' })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            >
                              <option value="false">False</option>
                              <option value="true">True</option>
                            </select>
                          ) : param.type === 'select' ? (
                            <select
                              value={param.default}
                              onChange={(e) => updateParameter(key, { default: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            >
                              {param.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={param.type === 'number' ? 'number' : 'text'}
                              value={param.default}
                              onChange={(e) => updateParameter(key, { 
                                default: param.type === 'number' ? Number(e.target.value) : e.target.value 
                              })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                            />
                          )}
                        </div>
                        
                        {param.type === 'number' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Min</label>
                              <input
                                type="number"
                                value={param.min || 0}
                                onChange={(e) => updateParameter(key, { min: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Max</label>
                              <input
                                type="number"
                                value={param.max || 100}
                                onChange={(e) => updateParameter(key, { max: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Step</label>
                              <input
                                type="number"
                                value={param.step || 1}
                                onChange={(e) => updateParameter(key, { step: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                              />
                            </div>
                          </>
                        )}
                        
                        {param.type === 'select' && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Options (comma-separated)</label>
                            <input
                              type="text"
                              value={param.options?.join(', ') || ''}
                              onChange={(e) => updateParameter(key, { 
                                options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              })}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                              placeholder="option1, option2, option3"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Transitions */}
          <section className="glass-surface rounded-2xl p-6">
            <button
              onClick={() => toggleSection('transitions')}
              className="flex items-center justify-between w-full text-left mb-6"
            >
              <h2 className="text-xl font-semibold text-white">Transitions</h2>
              {expandedSections.has('transitions') ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            
            {expandedSections.has('transitions') && (
              <div className="space-y-6">
                <button
                  onClick={addTransition}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Add Transition</span>
                </button>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Transition List */}
                  <div className="space-y-4">
                    {transitions.map((transition) => (
                      <div
                        key={transition.id}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedTransition === transition.id
                            ? 'bg-purple-900/30 border-2 border-purple-600'
                            : 'bg-gray-900/50 border-2 border-transparent hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedTransition(transition.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white capitalize">{transition.type}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTransition(transition.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="text-sm text-gray-400">
                          {transition.startTime}s - {transition.startTime + transition.duration}s
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Transition Editor */}
                  {selectedTransition && (
                    <div className="space-y-4">
                      {(() => {
                        const transition = transitions.find(t => t.id === selectedTransition);
                        if (!transition) return null;
                        
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                                <select
                                  value={transition.type}
                                  onChange={(e) => updateTransition(transition.id, { type: e.target.value as any })}
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                >
                                  {transitionTypes.map(type => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (s)</label>
                                <input
                                  type="number"
                                  value={transition.duration}
                                  onChange={(e) => updateTransition(transition.id, { duration: Number(e.target.value) })}
                                  min="0.1"
                                  step="0.1"
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time (s)</label>
                                <input
                                  type="number"
                                  value={transition.startTime}
                                  onChange={(e) => updateTransition(transition.id, { startTime: Number(e.target.value) })}
                                  min="0"
                                  step="0.1"
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                />
                              </div>
                            </div>
                            
                            {/* Volume Automation */}
                            {transition.parameters.volumeAutomation && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-white">Automation Points</h4>
                                  <button
                                    onClick={() => addAutomationPoint(transition.id)}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors duration-200"
                                  >
                                    Add Point
                                  </button>
                                </div>
                                
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {transition.parameters.volumeAutomation.map((point, index) => (
                                    <div key={index} className="flex items-center space-x-2 text-sm">
                                      <input
                                        type="number"
                                        value={point.time}
                                        onChange={(e) => updateAutomationPoint(transition.id, index, { time: Number(e.target.value) })}
                                        min="0"
                                        max={transition.duration}
                                        step="0.1"
                                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
                                        placeholder="Time"
                                      />
                                      <span className="text-gray-400">s</span>
                                      <input
                                        type="number"
                                        value={point.trackA}
                                        onChange={(e) => updateAutomationPoint(transition.id, index, { trackA: Number(e.target.value) })}
                                        min="0"
                                        max="100"
                                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
                                        placeholder="A%"
                                      />
                                      <input
                                        type="number"
                                        value={point.trackB}
                                        onChange={(e) => updateAutomationPoint(transition.id, index, { trackB: Number(e.target.value) })}
                                        min="0"
                                        max="100"
                                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white"
                                        placeholder="B%"
                                      />
                                      {transition.parameters.volumeAutomation!.length > 2 && (
                                        <button
                                          onClick={() => removeAutomationPoint(transition.id, index)}
                                          className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                {/* Automation Curve Preview */}
                {selectedTransition && (
                  <div className="mt-6">
                    {(() => {
                      const transition = transitions.find(t => t.id === selectedTransition);
                      return transition ? renderAutomationCurve(transition) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TemplateAuthor;