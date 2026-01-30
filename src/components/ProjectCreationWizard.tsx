import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useProjectWizard } from '../hooks/useProjectWizard';
import { useAuth } from '../contexts/AuthContext';
import { transitionsService } from '../lib/transitionsService';
import WizardProgress from './wizard/WizardProgress';
import WizardStep1ProjectType from './wizard/WizardStep1ProjectType';
import WizardStep2ContentSelection from './wizard/WizardStep2ContentSelection';
import WizardStep3Configuration from './wizard/WizardStep3Configuration';
import WizardLoadingState from './wizard/WizardLoadingState';
import { UploadResult } from '../lib/storage';

interface ProjectCreationWizardProps {
  onComplete: (projectType: 'transition' | 'mixer', projectData: any) => void;
  onCancel: () => void;
}

const ProjectCreationWizard: React.FC<ProjectCreationWizardProps> = ({ onComplete, onCancel }) => {
  const { user } = useAuth();
  const wizard = useProjectWizard();

  const steps = [
    { number: 1 as const, label: 'Project Type' },
    { number: 2 as const, label: 'Select Content' },
    { number: 3 as const, label: 'Configure' }
  ];

  const handleCreateProject = async () => {
    if (!user || !wizard.projectType) return;

    wizard.setIsCreating(true);
    wizard.goToStep(4);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (wizard.projectType === 'transition') {
        const songA = wizard.selectedSongs[0];
        const songB = wizard.selectedSongs[1];

        if (!songA || !songB) {
          throw new Error('Both songs must be selected');
        }

        const transitionData = {
          name: wizard.projectName,
          songAId: songA.id,
          songBId: songB.id,
          templateId: wizard.useAITemplate ? null : (wizard.selectedTemplate?.id || null),
          transitionDuration: wizard.transitionDuration,
          transitionStartPoint: wizard.transitionStartPoint,
          songAEndTime: wizard.transitionStartPoint,
          songBStartTime: 0,
          songAMarkerPoint: wizard.transitionStartPoint,
          songBMarkerPoint: 0,
          metadata: {
            useAITemplate: wizard.useAITemplate,
            compatibility: calculateCompatibility(songA, songB)
          }
        };

        const transition = await transitionsService.createTransition(user.id, transitionData);

        onComplete('transition', {
          transitionId: transition.id,
          songA,
          songB,
          template: wizard.selectedTemplate
        });
      } else if (wizard.projectType === 'mixer') {
        const projectData = {
          name: wizard.projectName,
          tracks: wizard.selectedSongs,
          metadata: {
            trackCount: wizard.selectedSongs.length,
            createdViaWizard: true
          }
        };

        onComplete('mixer', projectData);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      wizard.setError('Failed to create project. Please try again.');
      wizard.setIsCreating(false);
      wizard.goToStep(3);
    }
  };

  const calculateCompatibility = (songA: UploadResult, songB: UploadResult) => {
    const analysisA = songA.analysis || {};
    const analysisB = songB.analysis || {};

    const bpmA = analysisA.bpm || 0;
    const bpmB = analysisB.bpm || 0;
    const bpmDiff = bpmA && bpmB ? Math.abs(bpmA - bpmB) / Math.max(bpmA, bpmB) * 100 : 0;

    return {
      bpmDiff,
      keyMatch: analysisA.key === analysisB.key,
      energyDiff: Math.abs((analysisA.energy || 0) - (analysisB.energy || 0))
    };
  };

  const handleCancel = () => {
    if (wizard.currentStep > 1) {
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
          <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Create New Project</h1>
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

      {wizard.currentStep === 1 && (
        <WizardStep1ProjectType onSelectType={wizard.setProjectType} />
      )}

      {wizard.currentStep === 2 && wizard.projectType && (
        <WizardStep2ContentSelection
          projectType={wizard.projectType}
          selectedSongs={wizard.selectedSongs}
          onSelectSong={wizard.selectSong}
          onClearSong={wizard.clearSongSlot}
          onNext={wizard.nextStep}
          onBack={wizard.previousStep}
          canProceed={wizard.canProceedFromStep(2)}
        />
      )}

      {wizard.currentStep === 3 && wizard.projectType && (
        <WizardStep3Configuration
          projectType={wizard.projectType}
          projectName={wizard.projectName}
          selectedSongs={wizard.selectedSongs}
          selectedTemplate={wizard.selectedTemplate}
          useAITemplate={wizard.useAITemplate}
          transitionDuration={wizard.transitionDuration}
          transitionStartPoint={wizard.transitionStartPoint}
          onProjectNameChange={wizard.setProjectName}
          onTemplateChange={wizard.setTemplate}
          onToggleAI={wizard.setUseAITemplate}
          onTransitionDurationChange={wizard.setTransitionDuration}
          onTransitionStartPointChange={wizard.setTransitionStartPoint}
          onCreateProject={handleCreateProject}
          onBack={wizard.previousStep}
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
