import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { TransitionData } from '../lib/transitionsService';
import { BlendData } from '../lib/blendExportService';
import BlenderStartScreen from './blender/BlenderStartScreen';
import BlenderVisualizationScreen from './blender/BlenderVisualizationScreen';
import BlenderProcessingScreen from './blender/BlenderProcessingScreen';
import BlenderCompletionScreen from './blender/BlenderCompletionScreen';

interface BlenderViewProps {
  onBack: () => void;
  onNavigate: (view: string, params?: any) => void;
}

type BlenderScreen = 'start' | 'visualization' | 'processing' | 'completion';

const BlenderView: React.FC<BlenderViewProps> = ({ onBack, onNavigate }) => {
  const [currentScreen, setCurrentScreen] = useState<BlenderScreen>('start');
  const [selectedTransition, setSelectedTransition] = useState<TransitionData | null>(null);
  const [createdBlend, setCreatedBlend] = useState<BlendData | null>(null);

  const handleSelectTransition = (transition: TransitionData) => {
    setSelectedTransition(transition);
    setCurrentScreen('visualization');
  };

  const handleStartBlending = () => {
    setCurrentScreen('processing');
  };

  const handleBlendComplete = (blend: BlendData) => {
    setCreatedBlend(blend);
    setCurrentScreen('completion');
  };

  const handleCreateAnother = () => {
    setSelectedTransition(null);
    setCreatedBlend(null);
    setCurrentScreen('start');
  };

  const handleBackToSelection = () => {
    setCurrentScreen('start');
  };

  const handleEditTransition = (transitionId: string) => {
    onNavigate('transition-editor', { transitionId });
  };

  const handleGoToLibrary = () => {
    onNavigate('library', { tab: 'blends' });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {currentScreen === 'start' && (
        <>
          <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-600/10 p-3 md:p-4 border-b border-gray-700">
            <div className="max-w-6xl mx-auto">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-3"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">Back to Labs</span>
              </button>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Blender</h1>
                  <p className="text-xs text-gray-400">Create seamless audio blends</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Select a configured transition and blend it into a complete audio file.
                Perfect for creating professional mashups and mixes.
              </p>
            </div>
          </div>

          <BlenderStartScreen
            onSelectTransition={handleSelectTransition}
            onEditTransition={handleEditTransition}
          />
        </>
      )}

      {currentScreen === 'visualization' && selectedTransition && (
        <BlenderVisualizationScreen
          transition={selectedTransition}
          onStartBlending={handleStartBlending}
          onBack={handleBackToSelection}
        />
      )}

      {currentScreen === 'processing' && selectedTransition && (
        <BlenderProcessingScreen
          transition={selectedTransition}
          onComplete={handleBlendComplete}
          onBack={handleBackToSelection}
        />
      )}

      {currentScreen === 'completion' && createdBlend && (
        <BlenderCompletionScreen
          blend={createdBlend}
          onCreateAnother={handleCreateAnother}
          onGoToLibrary={handleGoToLibrary}
        />
      )}
    </div>
  );
};

export default BlenderView;
