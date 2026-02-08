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
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Create a New Project
          </h1>
          <p className="text-sm text-gray-400">
            Choose your project type to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                data-tutorial={type.id === 'transition' ? 'transition-project' : undefined}
                className="group relative overflow-hidden bg-gray-800 border-2 border-gray-700 rounded-2xl p-4 md:p-8 text-left transition-all duration-300 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-105 hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                <div className="relative z-10 space-y-3 md:space-y-6">
                  <div className="flex items-center md:items-start justify-between">
                    <div className={`w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br ${type.gradient} rounded-lg md:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon size={20} className="text-white md:hidden" />
                      <Icon size={32} className="text-white hidden md:block" />
                    </div>
                    <ArrowRight className="text-gray-600 group-hover:text-cyan-400 transition-all duration-300 group-hover:translate-x-1" size={20} />
                  </div>

                  <div className="space-y-1 md:space-y-3">
                    <h3 className="text-lg md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {type.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                  </div>

                  <div className="hidden md:block space-y-2">
                    {type.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm text-gray-500">
                        <Zap size={14} className="text-cyan-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4 pt-2 md:pt-4 border-t border-gray-700">
                    <div className="flex items-center space-x-1 text-xs md:text-sm">
                      <Users size={12} className="text-gray-500 md:hidden" />
                      <Users size={14} className="text-gray-500 hidden md:block" />
                      <span className="text-gray-400">{type.difficulty}</span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-400">
                      {type.time}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WizardStep1ProjectType;
