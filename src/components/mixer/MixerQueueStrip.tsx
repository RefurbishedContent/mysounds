import React from 'react';
import { Music, Clock, GripVertical } from 'lucide-react';
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
  mixerTheme
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const glowColor = mixerTheme.deckAColors?.glow || '#06b6d4';
  const isNightclub = mixerTheme.isNightclub;

  const handleDragStart = (e: React.DragEvent, track: MixTrack, index: number) => {
    e.dataTransfer.setData('text/plain', track.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      trackId: track.id,
      index,
      name: track.blend?.name || 'Track'
    }));
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-gray-800 px-4 py-2 rounded-lg shadow-xl text-white text-sm border border-gray-600';
    dragImage.textContent = track.blend?.name || 'Track';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  if (tracks.length === 0) {
    return (
      <div className={`rounded-lg border p-4 ${
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
        <span className="ml-auto text-[10px] text-gray-500">
          Drag to deck to load
        </span>
      </div>

      <div className="divide-y divide-gray-700/50 max-h-[280px] overflow-y-auto">
        {tracks.map((track, index) => {
          const isCurrentTrack = index === currentTrackIndex;
          const isNextTrack = index === currentTrackIndex + 1;
          const isPlayedOrPlaying = index <= currentTrackIndex;

          return (
            <div
              key={track.id}
              draggable={!isPlayedOrPlaying}
              onDragStart={(e) => handleDragStart(e, track, index)}
              className={`flex items-center gap-3 px-3 py-3 transition-all group ${
                isPlayedOrPlaying
                  ? 'cursor-default'
                  : 'cursor-grab active:cursor-grabbing'
              } ${
                isCurrentTrack
                  ? isNightclub
                    ? 'bg-gradient-to-r from-white/10 to-transparent'
                    : 'bg-cyan-500/20'
                  : isNextTrack
                  ? 'bg-blue-500/10'
                  : isPlayedOrPlaying
                  ? 'opacity-50'
                  : 'hover:bg-gray-700/50'
              }`}
              style={isCurrentTrack && isNightclub ? {
                boxShadow: `inset 3px 0 0 ${glowColor}`
              } : undefined}
            >
              {!isPlayedOrPlaying && (
                <GripVertical
                  size={16}
                  className="text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors"
                />
              )}

              {isPlayedOrPlaying && <div className="w-4" />}

              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isCurrentTrack
                    ? 'text-white'
                    : isNextTrack
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-gray-700 text-gray-400'
                }`}
                style={isCurrentTrack ? {
                  backgroundColor: glowColor,
                  boxShadow: isNightclub ? `0 0 12px ${glowColor}` : undefined
                } : undefined}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${
                  isCurrentTrack ? 'text-white font-medium' : 'text-gray-300'
                }`}>
                  {track.blend?.name || 'Unknown Track'}
                </div>
                {isCurrentTrack && (
                  <div className="text-[10px] text-gray-500 mt-0.5">Now Playing</div>
                )}
                {isNextTrack && (
                  <div className="text-[10px] text-blue-400 mt-0.5">Up Next</div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                <Clock size={12} />
                <span>{formatDuration(track.blend?.duration || 0)}</span>
              </div>

              {isCurrentTrack && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                  style={{
                    backgroundColor: glowColor,
                    boxShadow: isNightclub ? `0 0 8px ${glowColor}` : undefined
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
