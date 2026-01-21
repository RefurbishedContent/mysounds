import React from 'react';
import { Sparkles, Wand2, Music, Mic, Video, Zap, TrendingUp, Brain } from 'lucide-react';

interface AIFusionViewProps {
  onSelectTool: (tool: string) => void;
}

const AIFusionView: React.FC<AIFusionViewProps> = ({ onSelectTool }) => {
  const tools = [
    {
      id: 'smart-blend',
      icon: Sparkles,
      title: 'Smart Blend',
      description: 'AI-powered song blending with automatic transition detection',
      gradient: 'from-cyan-500 to-blue-500',
      action: () => onSelectTool('library')
    },
    {
      id: 'auto-transition',
      icon: Wand2,
      title: 'Auto Transition',
      description: 'Let AI find the perfect transition points between tracks',
      gradient: 'from-blue-500 to-purple-500',
      action: () => onSelectTool('library')
    },
    {
      id: 'voice-enhance',
      icon: Mic,
      title: 'Voice Enhancement',
      description: 'AI-powered vocal isolation and enhancement',
      gradient: 'from-purple-500 to-pink-500',
      comingSoon: true
    },
    {
      id: 'beat-match',
      icon: Zap,
      title: 'Beat Matching',
      description: 'Automatically sync BPM and match beats between songs',
      gradient: 'from-pink-500 to-red-500',
      comingSoon: true
    },
    {
      id: 'mood-analysis',
      icon: Brain,
      title: 'Mood Analysis',
      description: 'Analyze track mood and energy to suggest perfect pairings',
      gradient: 'from-green-500 to-teal-500',
      comingSoon: true
    },
    {
      id: 'mashup-creator',
      icon: Music,
      title: 'AI Mashup',
      description: 'Create intelligent mashups with harmonically compatible tracks',
      gradient: 'from-teal-500 to-cyan-500',
      comingSoon: true
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-600/10 p-6 md:p-8 border-b border-gray-700">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Fusion</h1>
                <p className="text-sm text-gray-400">AI-powered music creation tools</p>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Harness the power of artificial intelligence to create seamless transitions,
              intelligent mashups, and professional-quality song blends in seconds.
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={tool.comingSoon ? undefined : tool.action}
                    disabled={tool.comingSoon}
                    className={`relative overflow-hidden text-left p-6 bg-gray-800 border border-gray-700 rounded-xl transition-all duration-200 ${
                      tool.comingSoon
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className={`w-12 h-12 bg-gradient-to-r ${tool.gradient} rounded-lg flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                        <span>{tool.title}</span>
                        {tool.comingSoon && (
                          <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-400">
                            Coming Soon
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                    <div className={`absolute inset-0 bg-gradient-to-r ${tool.gradient} opacity-0 ${!tool.comingSoon && 'hover:opacity-5'} transition-opacity duration-200`} />
                  </button>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Get Started</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Upload your music library to begin creating AI-powered transitions and blends.
                    Our intelligent algorithms will analyze your tracks and suggest the best combinations.
                  </p>
                  <button
                    onClick={() => onSelectTool('library')}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/30"
                  >
                    Go to Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFusionView;
