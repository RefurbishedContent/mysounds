import React, { useState, useEffect } from 'react';
import { Play, Pause, Music, Star, Check } from 'lucide-react';
import { BlendData } from '../../lib/blendExportService';
import { audioPlayer } from '../../lib/audioPlayer';

interface BlendPreviewCardProps {
  blend: BlendData;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onTogglePlay: () => void;
  onToggleFavorite?: (isFavorite: boolean) => void;
}

export const BlendPreviewCard: React.FC<BlendPreviewCardProps> = ({
  blend,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePlay,
  onToggleFavorite
}) => {
  const [progress, setProgress] = useState(0);
  const isFavorite = blend.is_favorite || false;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        const currentTime = audioPlayer.getCurrentTime();
        const duration = audioPlayer.getDuration();
        if (duration > 0) {
          setProgress((currentTime / duration) * 100);
        }
      }, 100);
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className={`relative group rounded-xl border-2 overflow-hidden transition-all duration-300 ${
        isSelected
          ? 'bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/30'
          : 'bg-gray-800 border-gray-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20'
      }`}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 z-20">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
            <Check size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Favorite Button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(isFavorite);
          }}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-gray-900/80 hover:bg-gray-900 transition-colors"
        >
          <Star
            size={16}
            className={isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}
          />
        </button>
      )}

      {/* Waveform Visualization */}
      <div className="relative h-32 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        {/* Animated Waveform Bars */}
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-4">
          {Array.from({ length: 32 }).map((_, i) => {
            const height = Math.random() * 80 + 20;
            const animationDelay = i * 0.02;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-cyan-500 via-cyan-400 to-blue-500'
                    : 'bg-gradient-to-t from-gray-600 to-gray-500'
                }`}
                style={{
                  height: `${height}%`,
                  animation: isPlaying ? `pulse 0.8s ease-in-out ${animationDelay}s infinite alternate` : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Progress Bar */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900/50">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Play/Pause Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <div className="w-14 h-14 bg-cyan-500 hover:bg-cyan-400 rounded-full flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-200">
            {isPlaying ? (
              <Pause size={24} className="text-white ml-0" fill="white" />
            ) : (
              <Play size={24} className="text-white ml-1" fill="white" />
            )}
          </div>
        </button>

        {/* Now Playing Indicator */}
        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-cyan-500 text-white px-2.5 py-1 rounded-full text-xs font-medium shadow-lg">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            Now Playing
          </div>
        )}
      </div>

      {/* Blend Info */}
      <button
        onClick={onSelect}
        disabled={isSelected}
        className="w-full p-4 text-left"
      >
        <h4 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors" title={blend.name}>
          {blend.name}
        </h4>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Music size={12} />
            <span>{formatDuration(blend.duration)}</span>
            <span>•</span>
            <span className="uppercase">{blend.format}</span>
          </div>

          {blend.template_name && (
            <div className="inline-block bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-xs">
              {blend.template_name}
            </div>
          )}

          {blend.transitionDuration && (
            <div className="text-xs text-gray-500">
              {blend.transitionDuration}s transition
            </div>
          )}
        </div>
      </button>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.6; transform: scaleY(0.8); }
          to { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
