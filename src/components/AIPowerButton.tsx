import React, { useState } from 'react';
import { Sparkles, Zap, AlertCircle, Loader2, CheckCircle, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { aiService, AI_CREDITS_COST } from '../lib/ai/aiService';

interface AIPowerButtonProps {
  uploadIdA?: string;
  uploadIdB?: string;
  onAnalysisComplete?: (recommendations: any[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const AIPowerButton: React.FC<AIPowerButtonProps> = ({
  uploadIdA,
  uploadIdB,
  onAnalysisComplete,
  onError,
  disabled = false,
  className = '',
}) => {
  const { user, credits } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const creditsNeeded = AI_CREDITS_COST.TEMPLATE_RECOMMENDATION;
  const hasEnoughCredits = credits && credits.creditsRemaining >= creditsNeeded;
  const canAnalyze = uploadIdA && uploadIdB && hasEnoughCredits && !disabled;

  const handleClick = () => {
    if (!canAnalyze) {
      if (!uploadIdA || !uploadIdB) {
        onError?.('Please upload both tracks before using AI analysis');
      } else if (!hasEnoughCredits) {
        onError?.('Insufficient credits for AI analysis. Please upgrade your plan.');
      }
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (!user || !uploadIdA || !uploadIdB) return;

    setShowConfirmDialog(false);
    setIsAnalyzing(true);
    setAnalysisComplete(false);

    try {
      const recommendations = await aiService.runTemplateMatchAnalysis(
        user.id,
        uploadIdA,
        uploadIdB
      );

      setAnalysisComplete(true);
      setTimeout(() => setAnalysisComplete(false), 3000);
      onAnalysisComplete?.(recommendations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI analysis failed';
      onError?.(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!canAnalyze || isAnalyzing}
        className={`
          group relative px-6 py-3 rounded-lg font-semibold transition-all duration-200
          ${canAnalyze && !isAnalyzing
            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }
          ${className}
        `}
      >
        <div className="flex items-center space-x-2">
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : analysisComplete ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Complete!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>AI Match Templates</span>
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                <Zap className="w-3 h-3" />
                <span>{creditsNeeded}</span>
              </div>
            </>
          )}
        </div>

        {!hasEnoughCredits && !isAnalyzing && (
          <div className="absolute -top-2 -right-2">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
        )}
      </button>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">AI Template Matching</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Our AI will analyze your tracks and recommend the best templates based on BPM, musical key, genre, and energy levels.
                </p>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Credits Required</span>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-semibold">{creditsNeeded}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Your Credits</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${hasEnoughCredits ? 'text-green-400' : 'text-red-400'}`}>
                    {credits?.creditsRemaining || 0}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                <span className="text-gray-400 text-sm">After Analysis</span>
                <span className="text-white font-semibold">
                  {Math.max(0, (credits?.creditsRemaining || 0) - creditsNeeded)}
                </span>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-200 text-xs leading-relaxed">
                AI analysis typically takes 10-30 seconds. You'll get 3-5 template recommendations ranked by compatibility score.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasEnoughCredits}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200
                  ${hasEnoughCredits
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Analyze Tracks
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIPowerButton;
