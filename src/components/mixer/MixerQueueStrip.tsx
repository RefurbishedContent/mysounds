import React from 'react';
import { Music, Clock } from 'lucide-react';
import { MixTrack } from '../../lib/mixerService';
import { MixerTheme } from '../../lib/themeUtils';

interface MixerQueueStripProps {
  tracks: MixTrack[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  mixerTheme: MixerTheme;
}

export const MixerQueueStrip: React.FC<MixerQueueStripProps> = ({
  tracks,
  currentTrackIndex,
  onSelectTrack,
  mixerTheme
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const isNightclub = mixerTheme.isNightclub;

  if (tracks.length === 0) {
    return (
      <div className={`rounded-lg border p-3 ${
        isNightclub
          ? 'bg-black/60 border-gray-800'
          : 'bg-gray-800/80 border-gray-700'
      }`}>
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Music size={16} />
          <span>No tracks in queue - Add from library</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isNightclub
          ? 'bg-black/60 border-gray-800'
          : 'bg-gray-800/80 border-gray-700'
      }`}
      style={isNightclub ? {
        boxShadow: `0 0 20px ${glowColor}20, inset 0 0 30px ${glowColor}05`
      } : undefined}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
        <Music size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Queue
        </span>
        <span className="text-xs text-gray-600">
          {tracks.length} tracks
        </span>
      </div>

      <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {tracks.map((track, index) => {
          const isCurrentTrack = index === currentTrackIndex;
          const isNextTrack = index === currentTrackIndex + 1;

          return (
            <button
              key={track.id}
              onClick={() => onSelectTrack(index)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-r border-gray-700/30 transition-all min-w-0 ${
                isCurrentTrack
                  ? isNightclub
                    ? 'bg-gradient-to-b from-white/10 to-transparent'
                    : 'bg-cyan-500/20'
                  : isNextTrack
                  ? 'bg-blue-500/10 hover:bg-blue-500/20'
                  : 'hover:bg-gray-700/50'
              }`}
              style={isCurrentTrack && isNightclub ? {
                boxShadow: `inset 0 2px 0 ${glowColor}`
              } : undefined}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  isCurrentTrack
                    ? 'text-white'
                    : isNextTrack
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-gray-700 text-gray-400'
                }`}
                style={isCurrentTrack ? {
                  backgroundColor: glowColor,
                  boxShadow: isNightclub ? `0 0 10px ${glowColor}` : undefined
                } : undefined}
              >
                {index + 1}
              </div>

              <div className="min-w-0 max-w-[120px] md:max-w-[160px]">
                <div className={`text-sm truncate ${
                  isCurrentTrack ? 'text-white font-medium' : 'text-gray-300'
                }`}>
                  {track.blend?.name || 'Unknown'}
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Clock size={10} />
                <span>{formatDuration(track.blend?.duration || 0)}</span>
              </div>

              {isCurrentTrack && (
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{
                    backgroundColor: glowColor,
                    boxShadow: isNightclub ? `0 0 8px ${glowColor}` : undefined
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
