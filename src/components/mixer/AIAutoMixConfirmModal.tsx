import React, { useState, useEffect } from 'react';
import { X, Cpu, Coins, AlertCircle, Sparkles, Music } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../lib/database';
import { MixerTheme } from '../../lib/themeUtils';

interface AIAutoMixConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trackCount: number;
  mixerTheme: MixerTheme;
}

export const AIAutoMixConfirmModal: React.FC<AIAutoMixConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  trackCount,
  mixerTheme
}) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const creditCost = trackCount;
  const hasEnoughCredits = credits !== null && credits >= creditCost;
  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const isNightclub = mixerTheme.isNightclub;

  useEffect(() => {
    const loadCredits = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userCredits = await databaseService.getUserCredits(user.id);
        setCredits(userCredits?.creditsRemaining ?? 0);
      } catch {
        setCredits(0);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadCredits();
    }
  }, [user, isOpen]);

  const handleConfirm = async () => {
    if (!hasEnoughCredits) return;
    setConfirming(true);
    try {
      onConfirm();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-md rounded-xl border overflow-hidden ${
          isNightclub
            ? 'bg-gray-900 border-gray-700'
            : 'bg-gray-800 border-gray-700'
        }`}
        style={isNightclub ? {
          boxShadow: `0 0 40px ${glowColor}30, 0 0 80px ${glowColor}10`
        } : undefined}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-700"
          style={isNightclub ? {
            background: `linear-gradient(to right, ${glowColor}15, transparent)`
          } : undefined}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${glowColor}20`,
                boxShadow: isNightclub ? `0 0 15px ${glowColor}40` : undefined
              }}
            >
              <Cpu size={20} style={{ color: glowColor }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Auto-Mix</h2>
              <p className="text-xs text-gray-400">Activate intelligent mixing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className={`rounded-lg p-4 ${
            isNightclub ? 'bg-black/40' : 'bg-gray-900/60'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <Music size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300">Tracks in Queue</span>
              <span className="ml-auto text-xl font-bold text-white">{trackCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <Coins size={16} style={{ color: glowColor }} />
              <span className="text-sm text-gray-300">Credit Cost</span>
              <span className="ml-auto text-xl font-bold" style={{ color: glowColor }}>
                {creditCost} credits
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              1 credit per track in your queue
            </p>
          </div>

          <div className={`rounded-lg p-4 border ${
            hasEnoughCredits
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : hasEnoughCredits ? (
                <Sparkles size={20} className="text-green-400" />
              ) : (
                <AlertCircle size={20} className="text-red-400" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  Your Balance
                </div>
                <div className={`text-2xl font-bold ${
                  hasEnoughCredits ? 'text-green-400' : 'text-red-400'
                }`}>
                  {loading ? '...' : `${credits} credits`}
                </div>
              </div>
            </div>
            {!loading && !hasEnoughCredits && (
              <p className="text-xs text-red-400 mt-2">
                You need {creditCost - (credits || 0)} more credits
              </p>
            )}
          </div>

          <div className={`rounded-lg p-3 ${
            isNightclub ? 'bg-black/30' : 'bg-gray-900/40'
          }`}>
            <p className="text-xs text-gray-400 leading-relaxed">
              AI Auto-Mix will intelligently transition between your tracks using
              beat-matching and smooth crossfades. You can override with skip buttons
              at any time.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasEnoughCredits || loading || confirming}
            className="flex-1 px-4 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: hasEnoughCredits ? glowColor : '#4b5563',
              boxShadow: hasEnoughCredits && isNightclub
                ? `0 0 20px ${glowColor}50`
                : undefined
            }}
          >
            {confirming ? 'Activating...' : 'Activate AI Mix'}
          </button>
        </div>
      </div>
    </div>
  );
};
