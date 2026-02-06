import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, AlertCircle, X } from 'lucide-react';

interface RenderProgressModalProps {
  isOpen: boolean;
  stage: 'saving' | 'rendering' | 'success' | 'error';
  message: string;
  progress?: number;
  onClose?: () => void;
  canClose?: boolean;
}

export const RenderProgressModal: React.FC<RenderProgressModalProps> = ({
  isOpen,
  stage,
  message,
  progress = 0,
  onClose,
  canClose = false
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (stage === 'saving' || stage === 'rendering') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [stage]);

  if (!isOpen) return null;

  const getStageConfig = () => {
    switch (stage) {
      case 'saving':
        return {
          icon: <Loader className="w-12 h-12 animate-spin text-cyan-500" />,
          title: 'Saving Metadata',
          color: 'text-cyan-400'
        };
      case 'rendering':
        return {
          icon: <Loader className="w-12 h-12 animate-spin text-blue-500" />,
          title: 'Rendering Transition Audio',
          color: 'text-blue-400'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-500" />,
          title: 'Render Complete',
          color: 'text-green-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
          title: 'Render Failed',
          color: 'text-red-400'
        };
    }
  };

  const config = getStageConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-6">
        {canClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}

        <div className="flex flex-col items-center space-y-4">
          {config.icon}

          <div className="text-center space-y-2">
            <h2 className={`text-xl font-semibold ${config.color}`}>
              {config.title}
            </h2>
            <p className="text-gray-300 text-sm">
              {message}{stage === 'saving' || stage === 'rendering' ? dots : ''}
            </p>
          </div>

          {(stage === 'rendering') && (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Processing audio</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {stage === 'success' && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-lg transition-colors text-white font-semibold"
            >
              Continue
            </button>
          )}

          {stage === 'error' && (
            <div className="flex flex-col space-y-2 w-full">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-colors text-white font-semibold"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {(stage === 'saving' || stage === 'rendering') && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
            <p className="text-yellow-300 text-xs text-center">
              Please do not close this window or navigate away
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RenderProgressModal;
