import React, { useState } from 'react';
import { GripVertical, X, ChevronUp, ChevronDown, Music, Clock, Shuffle } from 'lucide-react';
import { MixTrack } from '../lib/mixerService';

interface PlaylistQueueDrawerProps {
  tracks: MixTrack[];
  currentTrackIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemoveTrack: (trackId: string) => void;
  onReorderTracks?: (tracks: MixTrack[]) => void;
  onSelectTrack?: (index: number) => void;
}

export const PlaylistQueueDrawer: React.FC<PlaylistQueueDrawerProps> = ({
  tracks,
  currentTrackIndex,
  isOpen,
  onToggle,
  onRemoveTrack,
  onReorderTracks,
  onSelectTrack
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const totalDuration = tracks.reduce((sum, track) => sum + (track.blend?.duration || 0), 0);
  const upcomingTracks = tracks.slice(currentTrackIndex + 1, currentTrackIndex + 4);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newTracks = [...tracks];
    const [draggedTrack] = newTracks.splice(draggedIndex, 1);
    newTracks.splice(dropIndex, 0, draggedTrack);

    // Update positions
    const updatedTracks = newTracks.map((track, idx) => ({
      ...track,
      position: idx
    }));

    onReorderTracks?.(updatedTracks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getCompatibilityScore = (track: MixTrack, nextTrack?: MixTrack) => {
    if (!nextTrack) return null;
    // Mock compatibility score based on blend metadata
    return Math.floor(Math.random() * 30) + 70;
  };

  return (
    <>
      {/* Quick Preview Bar (Always Visible) */}
      <div className="bg-gray-800 border-t border-gray-700">
        <button
          onClick={onToggle}
          className="w-full px-3 md:px-6 py-2 md:py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <Music size={16} className="text-cyan-400 md:w-[18px] md:h-[18px]" />
              <span className="text-xs md:text-sm font-bold text-white">Queue</span>
              <span className="px-1.5 md:px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] md:text-xs font-bold rounded">
                {tracks.length}
              </span>
            </div>

            {/* Upcoming Tracks Preview - hidden on mobile */}
            <div className="hidden md:flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <span className="text-xs text-gray-500">Up next:</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {upcomingTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 px-2 py-1 bg-gray-900 rounded text-xs whitespace-nowrap"
                  >
                    <span className="text-gray-500">{currentTrackIndex + idx + 2}</span>
                    <span className="text-white truncate max-w-32">{track.blend?.name || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-400 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Clock size={12} className="md:w-[14px] md:h-[14px]" />
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronUp size={18} className="text-gray-400" />}
          </div>
        </button>
      </div>

      {/* Full Queue Drawer */}
      {isOpen && (
        <div className="bg-gray-800 border-t border-gray-700 max-h-[60vh] md:max-h-96 overflow-y-auto">
          <div className="p-3 md:p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Playlist Queue</h3>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                  title="Shuffle"
                >
                  <Shuffle size={16} />
                </button>
              </div>
            </div>

            {/* Track List */}
            {tracks.length === 0 ? (
              <div className="text-center py-12">
                <Music size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">No tracks in queue</p>
                <p className="text-gray-600 text-xs mt-2">Add blends from your library</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track, index) => {
                  const isCurrent = index === currentTrackIndex;
                  const isNext = index === currentTrackIndex + 1;
                  const isPast = index < currentTrackIndex;
                  const compatScore = getCompatibilityScore(track, tracks[index + 1]);

                  return (
                    <div key={track.id}>
                      <div
                        draggable={!isCurrent}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`group relative p-3 rounded-lg transition-all cursor-pointer ${
                          dragOverIndex === index ? 'border-2 border-cyan-500' : ''
                        } ${
                          isCurrent
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500'
                            : isNext
                              ? 'bg-blue-500/10 border border-blue-500/30'
                              : isPast
                                ? 'bg-gray-700/50 opacity-50'
                                : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => onSelectTrack?.(index)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Drag Handle */}
                          {!isCurrent && (
                            <div className="cursor-grab active:cursor-grabbing text-gray-500 group-hover:text-gray-400">
                              <GripVertical size={16} />
                            </div>
                          )}

                          {/* Position Badge */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                              isCurrent
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                                : isNext
                                  ? 'bg-blue-500/30 text-blue-400'
                                  : 'bg-gray-600 text-gray-400'
                            }`}
                          >
                            {index + 1}
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm mb-1 truncate" title={track.blend?.name}>
                                  {track.blend?.name || 'Unknown Track'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <span>{formatTime(track.blend?.duration || 0)}</span>
                                  <span>•</span>
                                  <span className="text-cyan-400">{track.crossfadeType}</span>
                                  {track.blend?.template_name && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{track.blend.template_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Status Badges */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isCurrent && (
                                  <span className="px-2 py-1 bg-cyan-500 text-white text-xs font-bold rounded animate-pulse">
                                    NOW
                                  </span>
                                )}
                                {isNext && (
                                  <span className="px-2 py-1 bg-blue-500/30 text-blue-400 text-xs font-bold rounded">
                                    NEXT
                                  </span>
                                )}
                              </div>

                              {/* Remove Button */}
                              {!isCurrent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveTrack(track.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Compatibility Indicator */}
                        {compatScore && !isPast && (
                          <div className="mt-2 pt-2 border-t border-gray-600/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Blend compatibility:</span>
                              <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    compatScore >= 80
                                      ? 'bg-green-500'
                                      : compatScore >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${compatScore}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-bold ${
                                  compatScore >= 80
                                    ? 'text-green-400'
                                    : compatScore >= 60
                                      ? 'text-yellow-400'
                                      : 'text-red-400'
                                }`}
                              >
                                {compatScore}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
