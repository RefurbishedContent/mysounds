import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Save, Sparkles, Music } from 'lucide-react';
import { UploadResult } from '../lib/storage';
import { TemplateData } from '../lib/database';
import { transitionsService } from '../lib/transitionsService';
import { useAuth } from '../contexts/AuthContext';
import TemplateGallery from './TemplateGallery';
import AIPowerButton from './AIPowerButton';
import AIRecommendationsPanel from './AIRecommendationsPanel';
import { TemplateRecommendation } from '../lib/ai/aiService';

interface TransitionEditorViewProps {
  songA: UploadResult;
  songB: UploadResult;
  onBack: () => void;
}

export const TransitionEditorView: React.FC<TransitionEditorViewProps> = ({
  songA,
  songB,
  onBack,
}) => {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [transitionStartPoint, setTransitionStartPoint] = useState(30);
  const [transitionDuration, setTransitionDuration] = useState(16);
  const [aiRecommendations, setAiRecommendations] = useState<TemplateRecommendation[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [saving, setSaving] = useState(false);

  const songADuration = songA.metadata.duration || 180;
  const songBDuration = songB.metadata.duration || 180;

  const songAEndTime = transitionStartPoint;
  const transitionEndTime = transitionStartPoint + transitionDuration;
  const totalDuration = songAEndTime + transitionDuration + 30;

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) {
      alert('Please select a transition template first');
      return;
    }

    if (!user) {
      alert('You must be logged in to save transitions');
      return;
    }

    setSaving(true);
    try {
      await transitionsService.createTransition(user.id, {
        name: `${songA.originalName} → ${songB.originalName}`,
        songAId: songA.id,
        songBId: songB.id,
        templateId: selectedTemplate.id,
        transitionStartPoint,
        transitionDuration,
        songAEndTime,
        songBStartTime: 0,
        metadata: {
          templateName: selectedTemplate.name,
          songAName: songA.originalName,
          songBName: songB.originalName,
        },
      });

      alert('Transition saved successfully!');
      onBack();
    } catch (error) {
      console.error('Failed to save transition:', error);
      alert('Failed to save transition. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Transition Editor</h1>
              <p className="text-sm text-gray-400">
                Create smooth blend between songs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={!selectedTemplate || saving}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2
                ${selectedTemplate && !saving
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Transition'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Songs</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Music className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Current Song (Ending)</span>
              </div>
              <h3 className="text-white font-medium truncate">{songA.originalName}</h3>
              <p className="text-sm text-gray-400">Duration: {formatTime(songADuration)}</p>
              <p className="text-sm text-blue-400 mt-2">
                Playing last {transitionStartPoint}s before transition
              </p>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Music className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Next Song (Beginning)</span>
              </div>
              <h3 className="text-white font-medium truncate">{songB.originalName}</h3>
              <p className="text-sm text-gray-400">Duration: {formatTime(songBDuration)}</p>
              <p className="text-sm text-green-400 mt-2">
                Playing first 30s after transition
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Transition Preview</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRestart}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-gray-300" />
              </button>
              <button
                onClick={handlePlayPause}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 space-y-4">
            <div className="relative h-32">
              <div className="absolute inset-0 flex">
                <div
                  className="bg-blue-600/30 border-2 border-blue-500 rounded-l-lg flex items-center justify-center"
                  style={{ width: `${(songAEndTime / totalDuration) * 100}%` }}
                >
                  <span className="text-blue-400 font-medium text-sm">
                    End of Song A ({transitionStartPoint}s)
                  </span>
                </div>

                <div
                  className="bg-purple-600/30 border-2 border-purple-500 flex items-center justify-center"
                  style={{ width: `${(transitionDuration / totalDuration) * 100}%` }}
                >
                  <div className="text-center">
                    <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <span className="text-purple-400 font-medium text-sm">
                      {selectedTemplate ? selectedTemplate.name : 'Select Template'}
                    </span>
                    <span className="text-purple-300 text-xs block">
                      ({transitionDuration}s blend)
                    </span>
                  </div>
                </div>

                <div
                  className="bg-green-600/30 border-2 border-green-500 rounded-r-lg flex items-center justify-center"
                  style={{ width: `${(30 / totalDuration) * 100}%` }}
                >
                  <span className="text-green-400 font-medium text-sm">
                    Start of Song B (30s)
                  </span>
                </div>
              </div>

              <div
                className="absolute top-0 bottom-0 w-1 bg-white z-10"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 h-1 bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Select Transition Template</h2>
            <AIPowerButton
              uploadIdA={songA.id}
              uploadIdB={songB.id}
              onAnalysisComplete={(recommendations) => {
                setAiRecommendations(recommendations);
                setShowAIRecommendations(true);
              }}
              onError={(errorMsg) => {
                alert(errorMsg);
              }}
            />
          </div>

          {showAIRecommendations && aiRecommendations.length > 0 && (
            <div className="mb-6">
              <AIRecommendationsPanel
                recommendations={aiRecommendations}
                onSelectTemplate={(templateId) => {
                  const template = aiRecommendations.find(r => r.templateId === templateId)?.template;
                  if (template) {
                    setSelectedTemplate(template);
                    setTransitionDuration(template.duration);
                  }
                }}
                onClose={() => setShowAIRecommendations(false)}
                isVisible={showAIRecommendations}
              />
            </div>
          )}

          <TemplateGallery
            onSelectTemplate={(template) => {
              setSelectedTemplate(template);
              setTransitionDuration(template.duration);
            }}
            compact={false}
            trackA={songA}
            trackB={songB}
          />
        </div>
      </div>
    </div>
  );
};

export default TransitionEditorView;
