import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Edit2 } from 'lucide-react';
import { ProjectType } from '../../hooks/useProjectWizard';
import { UploadResult } from '../../lib/storage';
import { TemplateData } from '../../lib/database';
import TransitionConfig from './TransitionConfig';
import MixerConfig from './MixerConfig';
import TemplateSelector from './TemplateSelector';

interface WizardStep3ConfigurationProps {
  projectType: ProjectType;
  projectName: string;
  selectedSongs: UploadResult[];
  selectedTemplate: TemplateData | null;
  useAITemplate: boolean;
  transitionDuration: number;
  transitionStartPoint: number;
  onProjectNameChange: (name: string) => void;
  onTemplateChange: (template: TemplateData | null) => void;
  onToggleAI: (useAI: boolean) => void;
  onTransitionDurationChange: (duration: number) => void;
  onTransitionStartPointChange: (startPoint: number) => void;
  onCreateProject: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const WizardStep3Configuration: React.FC<WizardStep3ConfigurationProps> = ({
  projectType,
  projectName,
  selectedSongs,
  selectedTemplate,
  useAITemplate,
  transitionDuration,
  transitionStartPoint,
  onProjectNameChange,
  onTemplateChange,
  onToggleAI,
  onTransitionDurationChange,
  onTransitionStartPointChange,
  onCreateProject,
  onBack,
  canProceed
}) => {
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

  useEffect(() => {
    const generateNames = () => {
      const names: string[]= [];

      if (projectType === 'transition' && selectedSongs.length === 2) {
        const songA = selectedSongs[0].original_name?.replace(/\.[^/.]+$/, '') || 'Song A';
        const songB = selectedSongs[1].original_name?.replace(/\.[^/.]+$/, '') || 'Song B';

        names.push(`${songA} × ${songB}`);
        names.push(`${songA} into ${songB}`);
        names.push(`${songA} Fusion`);
      } else if (projectType === 'mixer') {
        names.push('My Mix Project');
        names.push('New Mashup');
        names.push('Untitled Mix');
      }

      setSuggestedNames(names);
    };

    generateNames();
  }, [projectType, selectedSongs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Configure Your Project</h2>
            <p className="text-gray-400">Name your project and adjust settings</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Project Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => onProjectNameChange(e.target.value)}
                  placeholder="Enter a name for your project"
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors duration-200"
                />
                <Edit2 size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            {suggestedNames.length > 0 && !projectName && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <span className="text-sm text-gray-400">Suggestions:</span>
                {suggestedNames.map((name, idx) => (
                  <button
                    key={idx}
                    onClick={() => onProjectNameChange(name)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded-lg transition-colors duration-200"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {projectType === 'transition' && (
            <>
              <TemplateSelector
                selectedSongs={selectedSongs}
                selectedTemplate={selectedTemplate}
                useAITemplate={useAITemplate}
                onSelectTemplate={onTemplateChange}
                onToggleAI={onToggleAI}
              />

              <TransitionConfig
                duration={transitionDuration}
                startPoint={transitionStartPoint}
                onDurationChange={onTransitionDurationChange}
                onStartPointChange={onTransitionStartPointChange}
              />
            </>
          )}

          {projectType === 'mixer' && (
            <MixerConfig trackCount={selectedSongs.length} />
          )}

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Selected Tracks</h3>
            <div className="space-y-3">
              {selectedSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">
                      {projectType === 'transition' ? (index === 0 ? 'A' : 'B') : index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{song.original_name}</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      {song.analysis?.bpm && <span>{Math.round(song.analysis.bpm)} BPM</span>}
                      {song.analysis?.key && <span>• {song.analysis.key}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <button
            onClick={onCreateProject}
            disabled={!canProceed}
            className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
              canProceed
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/50 hover:scale-105'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Sparkles size={20} />
            <span>Create Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WizardStep3Configuration;
