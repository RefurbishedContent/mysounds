import React from 'react';
import { Sliders } from 'lucide-react';

interface TransitionConfigProps {
  duration: number;
  startPoint: number;
  onDurationChange: (duration: number) => void;
  onStartPointChange: (startPoint: number) => void;
}

const TransitionConfig: React.FC<TransitionConfigProps> = ({
  duration,
  startPoint,
  onDurationChange,
  onStartPointChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Transition Settings</h3>
        <p className="text-sm text-gray-400">Fine-tune how your songs will blend together</p>
      </div>

      <div className="space-y-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white flex items-center space-x-2">
              <Sliders size={16} className="text-cyan-400" />
              <span>Transition Duration</span>
            </label>
            <span className="text-lg font-bold text-cyan-400">{duration}s</span>
          </div>
          <input
            type="range"
            min="4"
            max="25"
            step="1"
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            style={{
              background: `linear-gradient(to right, rgb(6 182 212) 0%, rgb(6 182 212) ${((duration - 4) / (25 - 4)) * 100}%, rgb(55 65 81) ${((duration - 4) / (25 - 4)) * 100}%, rgb(55 65 81) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>4s (Quick)</span>
            <span>25s (Smooth)</span>
          </div>
          <p className="text-xs text-gray-400">
            How long the crossfade between songs will last
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white flex items-center space-x-2">
              <Sliders size={16} className="text-blue-400" />
              <span>Start Point</span>
            </label>
            <span className="text-lg font-bold text-blue-400">{startPoint}s</span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={startPoint}
            onChange={(e) => onStartPointChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            style={{
              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((startPoint - 10) / (120 - 10)) * 100}%, rgb(55 65 81) ${((startPoint - 10) / (120 - 10)) * 100}%, rgb(55 65 81) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>10s (Early)</span>
            <span>120s (Late)</span>
          </div>
          <p className="text-xs text-gray-400">
            Where in the first song the transition should begin
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <span className="font-semibold">Tip:</span> Shorter transitions work best for energetic tracks,
          while longer transitions create smoother blends for melodic songs.
        </p>
      </div>
    </div>
  );
};

export default TransitionConfig;
