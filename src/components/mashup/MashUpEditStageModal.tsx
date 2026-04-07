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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-gray-800 rounded-xl border border-gray-700 w-full max-w-xs shadow-2xl">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-white">Edit Mash Up</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                {mashUpName}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors -mr-1 -mt-1"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <p className="text-xs text-gray-300 mb-3">
            Choose which step to continue from:
          </p>

          <div className="space-y-2">
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
                    className={`w-full p-2.5 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500/30'
                        : isAvailable
                        ? 'bg-gray-750 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                        : 'bg-gray-800/50 border-gray-700/50 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500'
                          : isAvailable
                          ? 'bg-gray-700'
                          : 'bg-gray-800'
                      }`}
                    >
                      {isAvailable ? (
                        <Icon
                          size={18}
                          className={isSelected ? 'text-white' : 'text-gray-400'}
                        />
                      ) : (
                        <Lock size={14} className="text-gray-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-semibold ${
                            isAvailable ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {label.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          isAvailable ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {label.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" />
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

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedStage === null}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStage !== null
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>

        {showWarning && (
          <div className="absolute inset-0 bg-gray-800/95 rounded-xl flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">Reset Progress?</h3>
              <p className="text-xs text-gray-400 mb-4 max-w-[220px] mx-auto">
                {warningMessage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelReset}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  Go Back
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
