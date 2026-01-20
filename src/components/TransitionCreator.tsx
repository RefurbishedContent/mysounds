import React, { useState, useEffect } from 'react';
import { Music, Play, Save, ArrowLeft, Sparkles, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storageService, UploadResult } from '../lib/storage';
import { databaseService, TemplateData } from '../lib/database';
import { transitionsService } from '../lib/transitionsService';

interface TransitionCreatorProps {
  onBack: () => void;
  onSave: () => void;
  initialSongA?: UploadResult;
}

type CreatorStep = 'select-songs' | 'select-template' | 'edit-timeline';

const TransitionCreator: React.FC<TransitionCreatorProps> = ({ onBack, onSave, initialSongA }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<CreatorStep>('select-songs');
  const [songs, setSongs] = useState<UploadResult[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [songA, setSongA] = useState<UploadResult | null>(initialSongA || null);
  const [songB, setSongB] = useState<UploadResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [transitionName, setTransitionName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [songsData, templatesData] = await Promise.all([
        storageService.getUserUploads(user.id),
        databaseService.listTemplates()
      ]);
      setSongs(songsData.filter(s => s.status === 'ready'));
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSongSelect = (song: UploadResult) => {
    if (!songA) {
      setSongA(song);
    } else if (!songB && song.id !== songA.id) {
      setSongB(song);
    } else if (songA && song.id === songA.id) {
      setSongA(null);
    } else if (songB && song.id === songB.id) {
      setSongB(null);
    }
  };

  const handleContinueToTemplates = () => {
    if (songA && songB) {
      setCurrentStep('select-template');
    }
  };

  const handleTemplateSelect = (template: TemplateData) => {
    setSelectedTemplate(template);
    setTransitionName(`${songA?.originalName} → ${songB?.originalName}`);
    setCurrentStep('edit-timeline');
  };

  const handleSaveTransition = async () => {
    if (!user || !songA || !songB || !selectedTemplate) return;

    setSaving(true);
    try {
      await transitionsService.createTransition({
        userId: user.id,
        name: transitionName || `${songA.originalName} → ${songB.originalName}`,
        songAId: songA.id,
        songBId: songB.id,
        templateId: selectedTemplate.id,
        transitionDuration: selectedTemplate.duration || 8,
        status: 'draft',
        metadata: {
          songAName: songA.originalName,
          songBName: songB.originalName,
          templateName: selectedTemplate.name
        }
      });
      onSave();
    } catch (error) {
      console.error('Failed to save transition:', error);
      alert('Failed to save transition');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Create New Transition</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs ${currentStep === 'select-songs' ? 'text-cyan-400' : 'text-gray-500'}`}>
                  Select Songs
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className={`text-xs ${currentStep === 'select-template' ? 'text-cyan-400' : 'text-gray-500'}`}>
                  Choose Template
                </span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className={`text-xs ${currentStep === 'edit-timeline' ? 'text-cyan-400' : 'text-gray-500'}`}>
                  Edit Timeline
                </span>
              </div>
            </div>
          </div>

          {currentStep === 'edit-timeline' && (
            <button
              onClick={handleSaveTransition}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
            >
              <Save size={20} />
              <span>{saving ? 'Saving...' : 'Save Transition'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'select-songs' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Select Two Songs to Blend</h2>
              <p className="text-gray-400">Choose the ending song and the beginning song for your transition</p>
            </div>

            {/* Selected Songs */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Music className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Song A (Ending)</p>
                  {songA ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">{songA.originalName}</p>
                      <div className="flex items-center justify-center space-x-1">
                        <Check size={14} className="text-green-400" />
                        <span className="text-xs text-green-400">Selected</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click a song below</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Music className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Song B (Beginning)</p>
                  {songB ? (
                    <div className="space-y-1">
                      <p className="text-white font-medium">{songB.originalName}</p>
                      <div className="flex items-center justify-center space-x-1">
                        <Check size={14} className="text-green-400" />
                        <span className="text-xs text-green-400">Selected</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click a song below</p>
                  )}
                </div>
              </div>
            </div>

            {/* Song Library */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Library</h3>
              {songs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No songs in your library. Upload some tracks first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {songs.map((song) => {
                    const isSelected = songA?.id === song.id || songB?.id === song.id;
                    const isDisabled = songA && songB && !isSelected;

                    return (
                      <button
                        key={song.id}
                        onClick={() => !isDisabled && handleSongSelect(song)}
                        disabled={isDisabled}
                        className={`
                          bg-gray-800 rounded-lg p-4 text-left transition-all duration-200
                          ${isSelected
                            ? 'ring-2 ring-cyan-500 bg-gray-750'
                            : isDisabled
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-gray-750 hover:shadow-lg'
                          }
                        `}
                      >
                        <div className="w-full aspect-square bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-lg mb-3 flex items-center justify-center relative">
                          <Music className="w-12 h-12 text-cyan-400" />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-white font-medium text-sm truncate mb-1">
                          {song.originalName}
                        </h3>
                        <p className="text-gray-400 text-xs">
                          {song.analysis?.bpm ? `${song.analysis.bpm} BPM` : 'Not analyzed'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Continue Button */}
            {songA && songB && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleContinueToTemplates}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60"
                >
                  <span>Continue to Templates</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'select-template' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Choose a Transition Template</h2>
              <p className="text-gray-400">Select a template that matches the vibe you want to create</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-cyan-500 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                      {template.duration || 8}s
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-cyan-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {template.description || 'A seamless transition template'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="bg-gray-700 px-2 py-1 rounded">{template.type}</span>
                    {template.tags?.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="bg-gray-700 px-2 py-1 rounded">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'edit-timeline' && songA && songB && selectedTemplate && (
          <div className="h-full">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Transition Name</label>
              <input
                type="text"
                value={transitionName}
                onChange={(e) => setTransitionName(e.target.value)}
                placeholder="Enter transition name..."
                className="w-full max-w-2xl px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Transition Overview</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Song A (Ending)</p>
                      <p className="text-white font-medium text-sm truncate">{songA.originalName}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                        <p className="text-xs text-purple-400 font-medium">{selectedTemplate.name}</p>
                      </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Song B (Beginning)</p>
                      <p className="text-white font-medium text-sm truncate">{songB.originalName}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Transition Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Transition Duration
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="range"
                          min="2"
                          max="16"
                          defaultValue={selectedTemplate.duration || 8}
                          className="flex-1"
                        />
                        <span className="text-white font-medium w-12 text-right">
                          {selectedTemplate.duration || 8}s
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-2">Template Type</p>
                      <p className="text-white font-medium">{selectedTemplate.type}</p>
                    </div>

                    {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                      <div className="bg-gray-900 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-3">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-800 text-cyan-400 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4">
                      <p className="text-cyan-300 text-sm">
                        <strong>Note:</strong> Advanced timeline editing will be available after saving.
                        Click "Save Transition" to create your transition draft.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitionCreator;
