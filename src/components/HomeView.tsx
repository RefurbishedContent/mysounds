import React from 'react';
import { AudioWaveform, Sliders, Upload, FileAudio, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HomeViewProps {
  onNavigate: (view: string) => void;
  onCreateNew: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onCreateNew }) => {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      id: 'new-transition',
      icon: AudioWaveform,
      title: 'New Mash Up',
      description: 'Mash up two tracks seamlessly',
      gradient: 'from-cyan-500 to-blue-600',
      action: onCreateNew,
    },
    {
      id: 'mixer',
      icon: Sliders,
      title: 'Open Mixer',
      description: 'Create full DJ sets',
      gradient: 'from-blue-500 to-teal-600',
      action: () => onNavigate('mixer'),
    },
    {
      id: 'upload',
      icon: Upload,
      title: 'Upload Tracks',
      description: 'Add songs to your library',
      gradient: 'from-teal-500 to-emerald-600',
      action: () => onNavigate('library'),
    },
    {
      id: 'templates',
      icon: FileAudio,
      title: 'Browse Templates',
      description: 'Explore mash up styles',
      gradient: 'from-emerald-500 to-cyan-600',
      action: () => onNavigate('templates'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-transparent relative">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 relative z-[1]">
        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 0 30px rgba(0,245,255,0.3)' }}>
                {getGreeting()}, {user?.name}
              </h1>
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-semibold text-white uppercase tracking-wide shadow-lg shadow-cyan-500/25">
                {user?.plan}
              </span>
            </div>
            <p className="text-sm text-gray-400">Ready to create something incredible?</p>
          </div>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/60 flex items-center gap-2 flex-shrink-0"
          >
            <Plus size={16} />
            Create New
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="group relative overflow-hidden bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/70 border border-gray-700/60 rounded-xl p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl text-left"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center mb-3 shadow-lg`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">{action.title}</h3>
                  <p className="text-xs text-gray-400">{action.description}</p>
                  <div className="mt-3 flex items-center text-cyan-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Get started <ArrowRight size={12} className="ml-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Get Started Guide for New Users */}
        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-teal-500/10 border border-cyan-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white mb-1">Welcome to MySounds.AI</h3>
              <p className="text-xs text-gray-400 mb-3">
                Get started by uploading your first tracks. Our AI will analyze them and help you create seamless mash ups.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('library')}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30"
                >
                  Upload Tracks
                </button>
                <button
                  onClick={() => onNavigate('templates')}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-medium transition-all duration-200"
                >
                  Browse Templates
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
