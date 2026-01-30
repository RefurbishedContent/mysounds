import React from 'react';
import { Sparkles } from 'lucide-react';
import { UploadResult } from '../../lib/storage';
import SongCard from './SongCard';

interface AISuggestionsProps {
  baseSong: UploadResult;
  availableSongs: UploadResult[];
  onSelectSuggestion: (song: UploadResult) => void;
  maxSuggestions?: number;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
  baseSong,
  availableSongs,
  onSelectSuggestion,
  maxSuggestions = 3
}) => {
  const baseAnalysis = baseSong.analysis || {};
  const baseBpm = baseAnalysis.bpm || 0;
  const baseKey = baseAnalysis.key || '';
  const baseEnergy = baseAnalysis.energy || 0.5;

  const scoreSong = (song: UploadResult): number => {
    if (song.id === baseSong.id) return 0;

    const analysis = song.analysis || {};
    const bpm = analysis.bpm || 0;
    const key = analysis.key || '';
    const energy = analysis.energy || 0.5;

    let score = 0;

    if (baseBpm && bpm) {
      const bpmDiff = Math.abs(baseBpm - bpm);
      const bpmPercent = (bpmDiff / Math.max(baseBpm, bpm)) * 100;
      score += Math.max(0, 100 - bpmPercent * 2);
    }

    if (baseKey && key) {
      if (baseKey === key) {
        score += 100;
      } else {
        const compatibleKeys: { [key: string]: string[] } = {
          'C': ['G', 'Am', 'F'],
          'G': ['D', 'Em', 'C'],
          'D': ['A', 'Bm', 'G'],
          'A': ['E', 'F#m', 'D'],
          'E': ['B', 'C#m', 'A'],
        };
        if (compatibleKeys[baseKey]?.includes(key)) {
          score += 70;
        }
      }
    }

    if (baseEnergy && energy) {
      const energyDiff = Math.abs(baseEnergy - energy);
      score += Math.max(0, 100 - energyDiff * 200);
    }

    return score / 3;
  };

  const suggestions = availableSongs
    .filter(song => song.id !== baseSong.id)
    .map(song => ({
      song,
      score: scoreSong(song)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
          <p className="text-xs text-gray-400">Best matches for your selection</p>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map(({ song, score }) => (
          <div key={song.id} className="relative">
            <SongCard
              song={song}
              onSelect={onSelectSuggestion}
              isSelected={false}
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-bold text-white shadow-lg">
              {Math.round(score)}% match
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Based on BPM, key, and energy compatibility
      </p>
    </div>
  );
};

export default AISuggestions;
