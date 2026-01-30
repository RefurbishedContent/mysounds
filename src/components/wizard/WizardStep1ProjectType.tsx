import React from 'react';
import { AudioWaveform, Sliders, ArrowRight, Zap, Users } from 'lucide-react';
import { ProjectType } from '../../hooks/useProjectWizard';

interface WizardStep1ProjectTypeProps {
  onSelectType: (type: ProjectType) => void;
}

const WizardStep1ProjectType: React.FC<WizardStep1ProjectTypeProps> = ({ onSelectType }) => {
  const projectTypes = [
    {
      id: 'transition' as ProjectType,
      icon: AudioWaveform,
      title: 'Transition Project',
      description: 'Blend two songs together with AI-powered transitions',
      features: ['Smart beat matching', 'Harmonic key blending', 'Custom transition effects'],
      gradient: 'from-cyan-500 via-blue-500 to-purple-500',
      difficulty: 'Beginner Friendly',
      time: '5-10 min'
    },
    {
      id: 'mixer' as ProjectType,
      icon: Sliders,
      title: 'Mixer Project',
      description: 'Advanced multi-track mixing workspace for creative control',
      features: ['Multi-track layering', 'Professional effects', 'Precise timing control'],
      gradient: 'from-blue-500 via-purple-500 to-pink-500',
      difficulty: 'Intermediate',
      time: '15-30 min'
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
      <div className="max-w-5xl w-full space-y-8">
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/50 animate-in zoom-in duration-500">
              <div className="w-10 h-10 bg-gradient-to-br from-white to-cyan-100 rounded-lg opacity-90"></div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create a New Project
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Choose your project type to get started. We'll guide you through each step to create something amazing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          {projectTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className="group relative overflow-hidden bg-gray-800 border-2 border-gray-700 rounded-2xl p-8 text-left transition-all duration-300 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-105 hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                <div className="relative z-10 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className={`w-16 h-16 bg-gradient-to-br ${type.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon size={32} className="text-white" />
                    </div>
                    <ArrowRight className="text-gray-600 group-hover:text-cyan-400 transition-all duration-300 group-hover:translate-x-1" size={24} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {type.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {type.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm text-gray-500">
                        <Zap size={14} className="text-cyan-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-1 text-sm">
                      <Users size={14} className="text-gray-500" />
                      <span className="text-gray-400">{type.difficulty}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {type.time}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-sm text-gray-500 animate-in fade-in duration-700 delay-300">
          <p>Don't worry, you can always create more projects later!</p>
        </div>
      </div>
    </div>
  );
};

export default WizardStep1ProjectType;
