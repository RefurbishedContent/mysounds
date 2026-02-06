import React from 'react';
import { UploadResult } from '../../lib/storage';
import SongCard from './SongCard';
import { Music } from 'lucide-react';

interface SongSelectionGridProps {
  songs: UploadResult[];
  selectedSongs: UploadResult[];
  onSelectSong: (song: UploadResult) => void;
  multiSelect?: boolean;
  emptyMessage?: string;
  tutorialMode?: boolean;
}

const SongSelectionGrid: React.FC<SongSelectionGridProps> = ({
  songs,
  selectedSongs,
  onSelectSong,
  multiSelect = false,
  emptyMessage = "No songs in your library yet",
  tutorialMode = false
}) => {
  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700">
          <Music size={32} className="text-gray-600" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-400">{emptyMessage}</h3>
          <p className="text-sm text-gray-500 max-w-md">
            Upload your songs to the library first, then come back here to create your project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {songs.map((song, index) => {
        const isSelected = selectedSongs.some(s => s.id === song.id);
        const dataTutorial = tutorialMode && index < 2 ? `demo-song-${index + 1}` : undefined;
        return (
          <SongCard
            key={song.id}
            song={song}
            isSelected={isSelected}
            onSelect={onSelectSong}
            showCheckbox={multiSelect}
            data-tutorial={dataTutorial}
          />
        );
      })}
    </div>
  );
};

export default SongSelectionGrid;
