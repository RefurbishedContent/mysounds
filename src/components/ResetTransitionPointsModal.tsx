import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ResetTransitionPointsModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ResetTransitionPointsModal: React.FC<ResetTransitionPointsModalProps> = ({
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-gray-800 rounded-2xl border-2 border-red-600/50 shadow-2xl shadow-red-500/20 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-900/50 border-2 border-red-600/50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Reset Transition Points?</h2>
                <p className="text-sm text-gray-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                All Progress Will Be Lost
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Going back to set new transition points will permanently delete all your work on the Professional Timeline Editor, including:
              </p>
            </div>

            <div className="space-y-2 pl-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300">All fade curve adjustments and keyframes</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300">Applied template settings and configurations</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300">Volume automation and custom transitions</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300">Any timeline modifications and arrangements</p>
              </div>
            </div>

            <div className="bg-cyan-900/20 border border-cyan-600/30 rounded-lg p-3">
              <p className="text-xs text-cyan-200 leading-relaxed">
                <strong>Tip:</strong> If you only want to adjust minor details, consider using the "Start Fresh" button instead to keep your marker points while resetting the timeline settings.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Points</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetTransitionPointsModal;
