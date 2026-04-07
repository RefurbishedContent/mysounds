import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useProjectWizard } from '../hooks/useProjectWizard';
import { useAuth } from '../contexts/AuthContext';
import { mixerService } from '../lib/mixerService';
import { formatThemeForStorage } from '../lib/themeUtils';
import WizardProgress from './wizard/WizardProgress';
import WizardStep2ContentSelection from './wizard/WizardStep2ContentSelection';
import WizardStep3Configuration from './wizard/WizardStep3Configuration';
import WizardLoadingState from './wizard/WizardLoadingState';

interface ProjectCreationWizardProps {
  onComplete: (projectType: 'transition' | 'mixer', projectData: any) => void;
  onCancel: () => void;
  initialProjectType?: 'mixer';
}

const ProjectCreationWizard: React.FC<ProjectCreationWizardProps> = ({ onComplete, onCancel, initialProjectType }) => {
  const { user } = useAuth();
  const wizard = useProjectWizard();

  const steps = [
    { number: 2 as const, label: 'Select Mash Ups', displayNumber: 1 },
    { number: 3 as const, label: 'Configure', displayNumber: 2 }
  ];

  useEffect(() => {
    if (initialProjectType) {
      wizard.setProjectType(initialProjectType);
    }
  }, []);

  const handleCreateProject = async () => {
    if (!user || !wizard.projectType) return;

    wizard.setIsCreating(true);
    wizard.goToStep(4);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const themeMetadata = formatThemeForStorage(wizard.mixerTheme);

      const mixSession = await mixerService.createMixSession(user.id, {
        name: wizard.projectName,
        autoCrossfadeDuration: wizard.crossfadeDuration,
        normalizeVolume: true,
        masterGain: 0
      });

      await mixerService.updateMixSession(mixSession.id, {
        metadata: themeMetadata
      });

      for (let i = 0; i < wizard.selectedBlends.length; i++) {
        const blend = wizard.selectedBlends[i];
        await mixerService.addBlendToMix(mixSession.id, {
          blendId: blend.id,
          position: i,
          crossfadeType: 'beat-matched'
        });
      }

      onComplete('mixer', { mixSessionId: mixSession.id });
    } catch (error) {
      console.error('Failed to create project:', error);
      wizard.setError('Failed to create project. Please try again.');
      wizard.setIsCreating(false);
      wizard.goToStep(3);
    }
  };

  const handleCancel = () => {
    if (wizard.currentStep > 2) {
      const confirmed = window.confirm('Are you sure you want to exit? Your progress will be lost.');
      if (confirmed) {
        wizard.resetWizard();
        onCancel();
      }
    } else {
      wizard.resetWizard();
      onCancel();
    }
  };

  useEffect(() => {
    return () => {
      wizard.resetWizard();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {wizard.currentStep < 4 && (
        <>
          <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <h1 className="text-base font-bold text-white">Create New Project</h1>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors duration-200"
            >
              <X size={20} />
            </button>
          </div>

          <WizardProgress currentStep={wizard.currentStep} steps={steps} />
        </>
      )}

      {wizard.error && (
        <div className="flex-shrink-0 bg-red-500/10 border-b border-red-500/30 px-4 py-3">
          <p className="text-red-400 text-center">{wizard.error}</p>
        </div>
      )}

      {wizard.currentStep === 2 && wizard.projectType && (
        <WizardStep2ContentSelection
          projectType={wizard.projectType}
          selectedSongs={wizard.selectedSongs}
          selectedBlends={wizard.selectedBlends}
          onSelectSong={wizard.selectSong}
          onSelectBlend={wizard.selectBlend}
          onClearSong={wizard.clearSongSlot}
          onClearBlend={wizard.removeBlend}
          onNext={wizard.nextStep}
          onBack={onCancel}
          canProceed={wizard.canProceedFromStep(2)}
        />
      )}

      {wizard.currentStep === 3 && wizard.projectType && (
        <WizardStep3Configuration
          projectType={wizard.projectType}
          projectName={wizard.projectName}
          selectedSongs={wizard.selectedSongs}
          selectedBlends={wizard.selectedBlends}
          selectedTemplate={wizard.selectedTemplate}
          useAITemplate={wizard.useAITemplate}
          transitionDuration={wizard.transitionDuration}
          transitionStartPoint={wizard.transitionStartPoint}
          mixerTheme={wizard.mixerTheme}
          onProjectNameChange={wizard.setProjectName}
          onTemplateChange={wizard.setTemplate}
          onToggleAI={wizard.setUseAITemplate}
          onTransitionDurationChange={wizard.setTransitionDuration}
          onTransitionStartPointChange={wizard.setTransitionStartPoint}
          onMixerThemeChange={wizard.setMixerTheme}
          onCreateProject={handleCreateProject}
          onBack={wizard.previousStep}
          onGoToStep2={() => wizard.goToStep(2)}
          canProceed={wizard.canProceedFromStep(3)}
        />
      )}

      {wizard.currentStep === 4 && (
        <WizardLoadingState projectName={wizard.projectName} />
      )}
    </div>
  );
};

export default ProjectCreationWizard;
