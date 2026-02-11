import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Music, Clock } from 'lucide-react';
import { MixTrack } from '../lib/mixerService';

interface SongQueuePanelProps {
  tracks: MixTrack[];
  currentTrackIndex: number;
  onSelectTrack?: (index: number) => void;
}

export const SongQueuePanel: React.FC<SongQueuePanelProps> = ({
  tracks,
  currentTrackIndex,
  onSelectTrack
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleTracks = isExpanded ? tracks : tracks.slice(0, 4);
  const hasMore = tracks.length > 4;

  const handleDragStart = (e: React.DragEvent, track: MixTrack, index: number) => {
    e.dataTransfer.setData('text/plain', track.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ trackId: track.id, index }));
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-gray-800 px-3 py-2 rounded-lg shadow-lg text-white text-sm';
    dragImage.textContent = track.blend?.name || 'Track';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Music size={16} />
          <span>No tracks in queue</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Add tracks from your library to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Music size={14} className="text-cyan-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Queue
          </span>
          <span className="text-xs text-gray-500">
            ({tracks.length} tracks)
          </span>
        </div>
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Show all</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Track list */}
      <div className={`divide-y divide-gray-700/50 ${isExpanded ? 'max-h-64 overflow-y-auto' : ''}`}>
        {visibleTracks.map((track, index) => {
          const actualIndex = isExpanded ? index : index;
          const isCurrentTrack = actualIndex === currentTrackIndex;
          const isNextTrack = actualIndex === currentTrackIndex + 1;

          return (
            <div
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(e, track, actualIndex)}
              onClick={() => onSelectTrack?.(actualIndex)}
              className={`flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing transition-all group ${
                isCurrentTrack
                  ? 'bg-cyan-500/20 border-l-2 border-cyan-400'
                  : isNextTrack
                  ? 'bg-blue-500/10 border-l-2 border-blue-400/50'
                  : 'hover:bg-gray-700/50 border-l-2 border-transparent'
              }`}
            >
              {/* Drag handle */}
              <GripVertical
                size={14}
                className="text-gray-600 group-hover:text-gray-400 flex-shrink-0"
              />

              {/* Track number */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                isCurrentTrack
                  ? 'bg-cyan-500 text-white'
                  : isNextTrack
                  ? 'bg-blue-500/50 text-blue-200'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {actualIndex + 1}
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${
                  isCurrentTrack ? 'text-white font-medium' : 'text-gray-300'
                }`}>
                  {track.blend?.name || 'Unknown Track'}
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Clock size={10} />
                <span>{formatDuration(track.blend?.duration || 0)}</span>
              </div>

              {/* Status indicator */}
              {isCurrentTrack && (
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Collapsed indicator */}
      {!isExpanded && hasMore && (
        <div className="px-3 py-1.5 text-center border-t border-gray-700/50">
          <span className="text-[10px] text-gray-500">
            +{tracks.length - 4} more tracks
          </span>
        </div>
      )}

      {/* Drag hint */}
      <div className="px-3 py-1.5 bg-gray-900/50 border-t border-gray-700">
        <p className="text-[10px] text-gray-500 text-center">
          Drag tracks to load onto a deck
        </p>
      </div>
    </div>
  );
};
