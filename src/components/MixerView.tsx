import React, { useState } from 'react';
import { Sliders, Volume2, VolumeX, RotateCcw, Equal as Equalizer, Headphones, Settings, Play, Upload, Music, Zap, Disc3 } from 'lucide-react';

const MixerView: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audio Mixer</h1>
          <p className="text-gray-400">Professional mixing console for real-time audio control</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
          >
            <Settings size={16} />
            <span>{showAdvanced ? 'Simple' : 'Advanced'} Mode</span>
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 hover:shadow-xl hover:shadow-cyan-500/40">
            <Play size={20} />
            <span>Start Mixing</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Sliders size={48} className="text-cyan-400" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">No Active Mix Session</h2>
            <p className="text-gray-400 leading-relaxed">
              Load tracks and start a mixing session to access the professional mixer console. 
              Control volumes, apply effects, and create smooth transitions in real-time.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105">
              <Disc3 size={20} />
              <span>Create New Project</span>
            </button>
            
            <button className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-green-500/30 hover:shadow-2xl hover:shadow-green-400/60 hover:scale-105">
              <Upload size={20} />
              <span>Upload Tracks to Mix</span>
            </button>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-white font-medium mb-4">Mixer Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              <div className="space-y-2">
                <Volume2 size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Volume Control</h4>
                <p className="text-gray-500 text-xs">Independent track volume and crossfading</p>
              </div>
              <div className="space-y-2">
                <Equalizer size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">EQ & Effects</h4>
                <p className="text-gray-500 text-xs">Professional audio processing</p>
              </div>
              <div className="space-y-2">
                <Headphones size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Real-time Preview</h4>
                <p className="text-gray-500 text-xs">Monitor your mix as you create it</p>
              </div>
              <div className="space-y-2">
                <Zap size={24} className="text-gray-500 mx-auto" />
                <h4 className="text-white font-medium text-sm">Live Automation</h4>
                <p className="text-gray-500 text-xs">Record parameter changes in real-time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixerView;