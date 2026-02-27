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
      title: 'Mash Up Project',
      description: 'Mash up two songs together with AI-powered transitions',
      features: ['Smart beat matching', 'Harmonic key mixing', 'Custom mash up effects'],
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
    <div className="flex-1 flex flex-col p-3 md:p-4 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto space-y-3">
        <div className="text-center space-y-1">
          <h1 className="text-lg md:text-xl font-bold text-white">
            Create a New Project
          </h1>
          <p className="text-xs text-gray-400">
            Choose your project type to get started
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                data-tutorial={type.id === 'transition' ? 'transition-project' : undefined}
                className="group relative overflow-hidden bg-gray-800 border-2 border-gray-700 rounded-xl p-3 md:p-5 text-left transition-all duration-300 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-105 hover:-translate-y-1"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                <div className="relative z-10 space-y-2 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br ${type.gradient} rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon size={18} className="text-white md:hidden" />
                      <Icon size={24} className="text-white hidden md:block" />
                    </div>
                    <ArrowRight className="text-gray-600 group-hover:text-cyan-400 transition-all duration-300 group-hover:translate-x-1" size={18} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors duration-300">
                      {type.title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {type.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-gray-500">
                        <Zap size={11} className="text-cyan-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-4 pt-1.5 border-t border-gray-700">
                    <div className="flex items-center space-x-1 text-xs">
                      <Users size={11} className="text-gray-500" />
                      <span className="text-gray-400">{type.difficulty}</span>
                    </div>
                    <div className="text-xs text-gray-400">
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
