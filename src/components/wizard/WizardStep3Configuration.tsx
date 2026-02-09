import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Edit2, Music, ListMusic } from 'lucide-react';
import { ProjectType } from '../../hooks/useProjectWizard';
import { UploadResult } from '../../lib/storage';
import { TemplateData } from '../../lib/database';
import { BlendData } from '../../lib/blendExportService';
import { MixerTheme } from '../../lib/themeUtils';
import TransitionConfig from './TransitionConfig';
import MixerConfig from './MixerConfig';
import TemplateSelector from './TemplateSelector';
import ColorThemeSelector from './ColorThemeSelector';
import PreviousMixerThemeModal from './PreviousMixerThemeModal';

interface WizardStep3ConfigurationProps {
  projectType: ProjectType;
  projectName: string;
  selectedSongs: UploadResult[];
  selectedBlends?: BlendData[];
  selectedTemplate: TemplateData | null;
  useAITemplate: boolean;
  transitionDuration: number;
  transitionStartPoint: number;
  mixerTheme?: MixerTheme;
  onProjectNameChange: (name: string) => void;
  onTemplateChange: (template: TemplateData | null) => void;
  onToggleAI: (useAI: boolean) => void;
  onTransitionDurationChange: (duration: number) => void;
  onTransitionStartPointChange: (startPoint: number) => void;
  onMixerThemeChange?: (theme: MixerTheme) => void;
  onCreateProject: () => void;
  onBack: () => void;
  onGoToStep2?: () => void;
  canProceed: boolean;
}

const WizardStep3Configuration: React.FC<WizardStep3ConfigurationProps> = ({
  projectType,
  projectName,
  selectedSongs,
  selectedBlends = [],
  selectedTemplate,
  useAITemplate,
  transitionDuration,
  transitionStartPoint,
  mixerTheme,
  onProjectNameChange,
  onTemplateChange,
  onToggleAI,
  onTransitionDurationChange,
  onTransitionStartPointChange,
  onMixerThemeChange,
  onCreateProject,
  onBack,
  onGoToStep2,
  canProceed
}) => {
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);

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
        names.push(`${selectedBlends.length}-Track Mix`);
        names.push('Fusion Playlist');
        names.push('DJ Mix Session');
      }

      setSuggestedNames(names);
    };

    generateNames();
  }, [projectType, selectedSongs, selectedBlends]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-full lg:max-w-4xl mx-auto space-y-4 px-2">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white">Configure Your Project</h2>
            <p className="text-sm text-gray-400">Name your project and adjust settings</p>
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

          {projectType === 'mixer' && mixerTheme && (
            <>
              <ColorThemeSelector
                selectedTheme={mixerTheme}
                onThemeChange={(theme) => onMixerThemeChange?.(theme)}
                onShowPreviousThemes={() => setShowThemeModal(true)}
              />

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <ListMusic size={24} className="text-cyan-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">Mash Up Playback Order</h3>
                      <p className="text-sm text-gray-400">The order your mash ups will play in the mixer</p>
                    </div>
                  </div>
                </div>

                {selectedBlends.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Music size={32} className="text-gray-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">No mash ups selected yet</h4>
                    <p className="text-sm text-gray-400 mb-6">
                      Add mash ups from Step 2 to build your mix
                    </p>
                    {onGoToStep2 && (
                      <button
                        onClick={onGoToStep2}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors duration-200"
                      >
                        Go Back to Step 2
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {selectedBlends.map((blend, index) => (
                        <div
                          key={blend.id}
                          className="flex items-start space-x-3 p-4 bg-gray-700 rounded-lg min-w-0 border border-gray-600"
                        >
                          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-white font-bold text-lg">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white break-words line-clamp-2 mb-2" title={blend.name}>
                              {blend.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                              <span className="bg-gray-600 px-2 py-1 rounded whitespace-nowrap">
                                {Math.floor(blend.duration / 60)}:{String(blend.duration % 60).padStart(2, '0')}
                              </span>
                              <span className="bg-gray-600 px-2 py-1 rounded whitespace-nowrap">
                                {blend.format.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Total Duration:</span>
                        <span className="text-white font-semibold">
                          {Math.floor(selectedBlends.reduce((acc, b) => acc + b.duration, 0) / 60)} minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400">Total Mash Ups:</span>
                        <span className="text-white font-semibold">{selectedBlends.length}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {projectType === 'transition' && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Selected Tracks</h3>
              <div className="space-y-3">
                {selectedSongs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg min-w-0"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">
                        {index === 0 ? 'A' : 'B'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-medium text-white break-words line-clamp-2 mb-1"
                        title={song.original_name}
                      >
                        {song.original_name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {song.analysis?.bpm && (
                          <span className="bg-gray-600 px-2 py-0.5 rounded whitespace-nowrap">
                            {Math.round(song.analysis.bpm)} BPM
                          </span>
                        )}
                        {song.analysis?.key && (
                          <span className="bg-gray-600 px-2 py-0.5 rounded whitespace-nowrap">
                            {song.analysis.key}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-full lg:max-w-4xl mx-auto flex items-center justify-between px-2">
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

      {showThemeModal && (
        <PreviousMixerThemeModal
          onClose={() => setShowThemeModal(false)}
          onSelectTheme={(theme) => onMixerThemeChange?.(theme)}
        />
      )}
    </div>
  );
};

export default WizardStep3Configuration;
