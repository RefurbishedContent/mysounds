import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface WizardLoadingStateProps {
  projectName: string;
}

const loadingMessages = [
  'Creating your project...',
  'Analyzing tracks...',
  'Setting up workspace...',
  'Preparing audio engine...',
  'Almost ready...'
];

const tips = [
  'Use the mixer to layer multiple tracks with precision',
  'Transitions work best when songs have similar BPM',
  'Try different templates to find the perfect blend',
  'Adjust fade curves for smoother transitions',
  'Export in high quality for the best results'
];

const WizardLoadingState: React.FC<WizardLoadingStateProps> = ({ projectName }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="relative">
          <div className="w-32 h-32 mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl animate-spin-slow opacity-20 blur-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/50 animate-pulse">
              <Sparkles size={48} className="text-white" />
            </div>
          </div>
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {projectName || 'Your Project'}
          </h2>
          <p className="text-xl text-white font-medium animate-pulse">
            {loadingMessages[messageIndex]}
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          <p className="text-sm text-gray-400">{Math.round(Math.min(progress, 100))}% Complete</p>
        </div>

        <div className="pt-8 px-6 py-4 bg-gray-800/50 border border-gray-700 rounded-xl backdrop-blur-sm">
          <p className="text-sm text-gray-400 mb-2">Did you know?</p>
          <p className="text-white">{currentTip}</p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default WizardLoadingState;
