import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader } from 'lucide-react';
import { TransitionEditorView } from './TransitionEditorView';
import { transitionsService } from '../lib/transitionsService';
import { storageService, UploadResult } from '../lib/storage';

interface TransitionEditorWrapperProps {
  transitionId: string;
  onBack: () => void;
  onSave: () => void;
}

const TransitionEditorWrapper: React.FC<TransitionEditorWrapperProps> = ({
  transitionId,
  onBack,
  onSave,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songA, setSongA] = useState<UploadResult | null>(null);
  const [songB, setSongB] = useState<UploadResult | null>(null);

  useEffect(() => {
    loadTransitionData();
  }, [transitionId]);

  const loadTransitionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const transition = await transitionsService.getTransition(transitionId);

      const [songAResult, songBResult] = await Promise.all([
        storageService.getUpload(transition.songAId),
        storageService.getUpload(transition.songBId),
      ]);

      if (!songAResult || !songBResult) {
        throw new Error('Could not load song files');
      }

      setSongA(songAResult);
      setSongB(songBResult);
    } catch (err) {
      console.error('Failed to load transition data:', err);
      setError('Failed to load transition. The songs may have been deleted.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Transition</h2>
            <p className="text-gray-400">Please wait while we load your transition data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !songA || !songB) {
    return (
      <div className="h-full flex flex-col p-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Transitions</span>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <ArrowLeft size={32} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Unable to Load Transition</h2>
            <p className="text-gray-400">
              {error || 'The transition could not be loaded. The songs may have been deleted from your library.'}
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
            >
              Back to Transitions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TransitionEditorView
      transitionId={transitionId}
      songA={songA}
      songB={songB}
      onBack={onBack}
      onSave={onSave}
    />
  );
};

export default TransitionEditorWrapper;
