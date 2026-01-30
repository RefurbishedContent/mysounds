import React from 'react';
import { Music, Layers } from 'lucide-react';

interface MixerConfigProps {
  trackCount: number;
}

const MixerConfig: React.FC<MixerConfigProps> = ({ trackCount }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Mixer Configuration</h3>
        <p className="text-sm text-gray-400">Your project is ready to be created</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Layers size={24} className="text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Multi-Track Project</h4>
            <p className="text-sm text-gray-400">{trackCount} {trackCount === 1 ? 'track' : 'tracks'} selected</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <Music size={20} className="text-cyan-400 mx-auto mb-1" />
            <div className="text-xs text-gray-400 mb-1">Tracks</div>
            <div className="text-lg font-bold text-white">{trackCount}</div>
          </div>
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <Layers size={20} className="text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-gray-400 mb-1">Channels</div>
            <div className="text-lg font-bold text-white">{trackCount * 2}</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6 space-y-3">
        <h4 className="font-semibold text-cyan-300">What you can do in the mixer:</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
            <span>Adjust volume, pan, and effects for each track</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
            <span>Layer multiple songs with precise timing</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
            <span>Create complex arrangements and mashups</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
            <span>Export your final mix in high quality</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MixerConfig;
