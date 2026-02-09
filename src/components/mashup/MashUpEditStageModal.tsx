import React, { useState } from 'react';
import { X, Music, Scissors, LayoutTemplate, AlertTriangle, Check, Lock } from 'lucide-react';
import {
  DraftStageInfo,
  STAGE_LABELS,
  getUnavailableReason,
  getResetWarningMessage,
} from './draftStageUtils';

interface MashUpEditStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStage: (stage: number) => void;
  stageInfo: DraftStageInfo;
  mashUpName: string;
}

const STAGE_ICONS: Record<number, React.FC<{ size?: number; className?: string }>> = {
  1: Music,
  2: Scissors,
  3: LayoutTemplate,
};

const MashUpEditStageModal: React.FC<MashUpEditStageModalProps> = ({
  isOpen,
  onClose,
  onSelectStage,
  stageInfo,
  mashUpName,
}) => {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStageClick = (stage: number) => {
    if (!stageInfo.availableStages.includes(stage)) {
      return;
    }
    setSelectedStage(stage);
  };

  const handleContinue = () => {
    if (selectedStage === null) return;

    const warning = getResetWarningMessage(selectedStage, stageInfo.currentStage);
    if (warning) {
      setWarningMessage(warning);
      setShowWarning(true);
    } else {
      onSelectStage(selectedStage);
    }
  };

  const handleConfirmReset = () => {
    if (selectedStage !== null) {
      onSelectStage(selectedStage);
    }
    setShowWarning(false);
  };

  const handleCancelReset = () => {
    setShowWarning(false);
    setWarningMessage(null);
  };

  const handleClose = () => {
    setSelectedStage(null);
    setShowWarning(false);
    setWarningMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Edit Mash Up</h2>
              <p className="text-sm text-gray-400 mt-1 truncate max-w-[280px]">
                {mashUpName}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <p className="text-sm text-gray-300 mb-4">
            Choose which step you'd like to continue from:
          </p>

          <div className="space-y-3">
            {[1, 2, 3].map((stage) => {
              const Icon = STAGE_ICONS[stage];
              const label = STAGE_LABELS[stage];
              const isAvailable = stageInfo.availableStages.includes(stage);
              const isSelected = selectedStage === stage;
              const isCurrent = stageInfo.currentStage === stage;
              const unavailableReason = getUnavailableReason(stage, stageInfo.availableStages);

              return (
                <div key={stage} className="relative group">
                  <button
                    onClick={() => handleStageClick(stage)}
                    disabled={!isAvailable}
                    className={`w-full p-4 rounded-xl border transition-all duration-200 text-left flex items-center gap-4 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-500/30'
                        : isAvailable
                        ? 'bg-gray-750 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                        : 'bg-gray-800/50 border-gray-700/50 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500'
                          : isAvailable
                          ? 'bg-gray-700'
                          : 'bg-gray-800'
                      }`}
                    >
                      {isAvailable ? (
                        <Icon
                          size={24}
                          className={isSelected ? 'text-white' : 'text-gray-400'}
                        />
                      ) : (
                        <Lock size={20} className="text-gray-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            isAvailable ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {label.name}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm mt-0.5 ${
                          isAvailable ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {label.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>

                  {!isAvailable && unavailableReason && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      {unavailableReason}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform rotate-45 -mt-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedStage === null}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                selectedStage !== null
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>

        {showWarning && (
          <div className="absolute inset-0 bg-gray-800/95 rounded-2xl flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Reset Progress?</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
                {warningMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelReset}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors"
                >
                  Go Back Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MashUpEditStageModal;
