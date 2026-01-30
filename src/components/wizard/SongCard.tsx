import React from 'react';
import { Music, Clock, Check } from 'lucide-react';
import { UploadResult } from '../../lib/storage';

interface SongCardProps {
  song: UploadResult;
  isSelected?: boolean;
  onSelect: (song: UploadResult) => void;
  showCheckbox?: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, isSelected, onSelect, showCheckbox }) => {
  const analysis = song.analysis || {};
  const bpm = analysis.bpm ? Math.round(analysis.bpm) : null;
  const key = analysis.key || null;
  const duration = analysis.duration ? Math.round(analysis.duration) : null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <button
      onClick={() => onSelect(song)}
      className={`
        relative group w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:shadow-md'
        }
      `}
    >
      {showCheckbox && isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-in zoom-in">
          <Check size={16} className="text-white" />
        </div>
      )}

      <div className="flex items-start space-x-3">
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
          ${isSelected
            ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
            : 'bg-gray-700 group-hover:bg-gray-600'
          }
        `}>
          <Music size={20} className="text-white" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <h4 className={`
            font-semibold truncate transition-colors duration-200
            ${isSelected ? 'text-cyan-400' : 'text-white group-hover:text-gray-200'}
          `}>
            {song.original_name || song.filename}
          </h4>

          <div className="flex items-center space-x-3 text-xs">
            {bpm && (
              <div className={`
                px-2 py-1 rounded-md font-medium transition-colors duration-200
                ${isSelected
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-gray-700 text-gray-400'
                }
              `}>
                {bpm} BPM
              </div>
            )}

            {key && (
              <div className={`
                px-2 py-1 rounded-md font-medium transition-colors duration-200
                ${isSelected
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-gray-700 text-gray-400'
                }
              `}>
                {key}
              </div>
            )}

            {duration && (
              <div className="flex items-center space-x-1 text-gray-500">
                <Clock size={12} />
                <span>{formatDuration(duration)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="absolute inset-0 rounded-xl border-2 border-cyan-500 pointer-events-none animate-pulse"></div>
      )}
    </button>
  );
};

export default SongCard;
