import React from 'react';
import { FlaskConical, Scissors, AudioWaveform, Sliders, Zap, Settings, Layers, Volume2 } from 'lucide-react';

interface LabsViewProps {
  onSelectTool: (tool: string) => void;
}

const LabsView: React.FC<LabsViewProps> = ({ onSelectTool }) => {
  const tools = [
    {
      id: 'transitions',
      icon: AudioWaveform,
      title: 'Transitions',
      description: 'Create and edit custom transitions between songs',
      gradient: 'from-cyan-500 to-blue-500',
      action: () => onSelectTool('transitions')
    },
    {
      id: 'mixer',
      icon: Sliders,
      title: 'Mixer',
      description: 'Advanced mixing controls for fine-tuning your blends',
      gradient: 'from-blue-500 to-purple-500',
      action: () => onSelectTool('mixer')
    },
    {
      id: 'editor',
      icon: Scissors,
      title: 'Audio Editor',
      description: 'Precise audio editing tools for professional results',
      gradient: 'from-purple-500 to-pink-500',
      comingSoon: true
    },
    {
      id: 'effects',
      icon: Zap,
      title: 'Effects Rack',
      description: 'Apply professional effects to your transitions',
      gradient: 'from-pink-500 to-red-500',
      comingSoon: true
    },
    {
      id: 'equalizer',
      icon: Volume2,
      title: 'Equalizer',
      description: 'Advanced EQ controls for perfect frequency balance',
      gradient: 'from-green-500 to-teal-500',
      comingSoon: true
    },
    {
      id: 'multi-track',
      icon: Layers,
      title: 'Multi-Track',
      description: 'Layer multiple tracks with precise timing control',
      gradient: 'from-teal-500 to-cyan-500',
      comingSoon: true
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-600/10 p-3 md:p-4 border-b border-gray-700">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/30">
                <FlaskConical size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Labs</h1>
                <p className="text-xs text-gray-400">Professional editing & mixing tools</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Access powerful editing and mixing tools to craft the perfect transitions.
              Experiment with advanced features to achieve professional-quality results.
            </p>
          </div>
        </div>

        <div className="p-3 md:p-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={tool.comingSoon ? undefined : tool.action}
                    disabled={tool.comingSoon}
                    className={`relative overflow-hidden text-left p-4 bg-gray-800 border border-gray-700 rounded-lg transition-all duration-200 ${
                      tool.comingSoon
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className={`w-10 h-10 bg-gradient-to-r ${tool.gradient} rounded-lg flex items-center justify-center mb-3 shadow-lg`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5 flex items-center space-x-1.5">
                        <span>{tool.title}</span>
                        {tool.comingSoon && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                            Soon
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-400 text-xs leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-r ${tool.gradient} opacity-0 ${!tool.comingSoon && 'hover:opacity-5'} transition-opacity duration-200`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabsView;
