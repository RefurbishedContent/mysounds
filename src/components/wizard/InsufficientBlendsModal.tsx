import React from 'react';
import { AlertCircle, ArrowRight, Music } from 'lucide-react';

interface InsufficientBlendsModalProps {
  blendCount: number;
  onCreateTransition: () => void;
  onContinueAnyway: () => void;
  onClose: () => void;
}

export const InsufficientBlendsModal: React.FC<InsufficientBlendsModalProps> = ({
  blendCount,
  onCreateTransition,
  onContinueAnyway,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-b border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">Not Enough Blends</h3>
              <p className="text-sm text-gray-300">
                You need at least 2 blends to create a mixer project
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-400">Current Blends</span>
              <span className="text-2xl font-bold text-white">{blendCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Minimum Required</span>
              <span className="text-2xl font-bold text-cyan-400">2</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-white">What are Blends?</h4>
            <p className="text-sm text-gray-400">
              Blends are seamless transitions between two songs, created in the Transition Editor.
              The mixer combines multiple blends to create longer, professional DJ mixes.
            </p>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
            <div className="flex gap-2">
              <Music size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-cyan-400">Quick Tip</p>
                <p className="text-xs text-gray-300">
                  Create a transition blend to seamlessly mix two songs together, then use the mixer to combine multiple blends into a full set.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-4 space-y-2.5 flex-shrink-0">
          <button
            onClick={onCreateTransition}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-200"
          >
            <span>Create Transition Blend</span>
            <ArrowRight size={18} />
          </button>

          <div className="flex gap-2">
            <button
              onClick={onContinueAnyway}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Continue Anyway
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can create an empty mixer and add blends later
          </p>
        </div>
      </div>
    </div>
  );
};
