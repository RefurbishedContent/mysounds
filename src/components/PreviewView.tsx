import React, { useState } from 'react';
import { Headphones, Play, Pause, Volume2, Download, Share, Clock, Music, AudioWaveform as Waveform, Settings, Upload, Disc3 } from 'lucide-react';

const PreviewView: React.FC = () => {
  const [volume, setVolume] = useState(75);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audio Preview</h1>
          <p className="text-gray-400">Listen to your mixes before exporting</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <Volume2 size={16} />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="w-8 text-right">{volume}</span>
          </div>
          
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2">
            <Settings size={16} />
            <span>Audio Settings</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto">
            <Headphones size={48} className="text-cyan-400" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">No Audio to Preview</h2>
            <p className="text-gray-400 leading-relaxed">
              Create a project and add mixing templates to preview your audio blend. 
              The preview system lets you hear exactly how your mix will sound before exporting.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
              <Disc3 size={20} />
              <span>Create New Project</span>
            </button>

            <button className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-cyan-500/50 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-lg hover:shadow-cyan-500/20">
              <Upload size={20} />
              <span>Browse Existing Projects</span>
            </button>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-white font-medium mb-4">Preview Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="space-y-2">
                <Play size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Real-time Playback</h4>
                <p className="text-gray-500 text-xs">Hear transitions as you create them</p>
              </div>
              <div className="space-y-2">
                <Waveform size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Waveform Display</h4>
                <p className="text-gray-500 text-xs">Visual feedback of your mix</p>
              </div>
              <div className="space-y-2">
                <Clock size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Timeline Sync</h4>
                <p className="text-gray-500 text-xs">Preview any section instantly</p>
              </div>
              <div className="space-y-2">
                <Download size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Export Ready</h4>
                <p className="text-gray-500 text-xs">Preview before final render</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewView;