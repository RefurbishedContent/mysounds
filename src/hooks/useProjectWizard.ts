import { useState, useCallback } from 'react';
import { UploadResult } from '../lib/storage';
import { TemplateData } from '../lib/database';

export type ProjectType = 'transition' | 'mixer';
export type WizardStep = 1 | 2 | 3 | 4;

export interface ProjectWizardState {
  currentStep: WizardStep;
  projectType: ProjectType | null;
  selectedSongs: UploadResult[];
  selectedTemplate: TemplateData | null;
  projectName: string;
  transitionDuration: number;
  transitionStartPoint: number;
  useAITemplate: boolean;
  isCreating: boolean;
  error: string | null;
}

const DEFAULT_STATE: ProjectWizardState = {
  currentStep: 1,
  projectType: null,
  selectedSongs: [],
  selectedTemplate: null,
  projectName: '',
  transitionDuration: 12,
  transitionStartPoint: 30,
  useAITemplate: true,
  isCreating: false,
  error: null
};

export const useProjectWizard = () => {
  const [state, setState] = useState<ProjectWizardState>(DEFAULT_STATE);

  const setProjectType = useCallback((type: ProjectType) => {
    setState(prev => ({
      ...prev,
      projectType: type,
      selectedSongs: [],
      currentStep: 2
    }));
  }, []);

  const selectSong = useCallback((song: UploadResult, position?: number) => {
    setState(prev => {
      const newSelectedSongs = [...prev.selectedSongs];

      if (prev.projectType === 'transition') {
        // For transitions, manage two slots (Song A and Song B)
        if (position !== undefined && position < 2) {
          newSelectedSongs[position] = song;
        } else {
          // Auto-fill next available slot
          if (newSelectedSongs.length < 2) {
            newSelectedSongs.push(song);
          }
        }
      } else if (prev.projectType === 'mixer') {
        // For mixer, allow multiple selections
        const exists = newSelectedSongs.find(s => s.id === song.id);
        if (!exists) {
          newSelectedSongs.push(song);
        }
      }

      return {
        ...prev,
        selectedSongs: newSelectedSongs
      };
    });
  }, []);

  const removeSong = useCallback((songId: string) => {
    setState(prev => ({
      ...prev,
      selectedSongs: prev.selectedSongs.filter(s => s.id !== songId)
    }));
  }, []);

  const clearSongSlot = useCallback((position: number) => {
    setState(prev => {
      const newSelectedSongs = [...prev.selectedSongs];
      newSelectedSongs.splice(position, 1);
      return {
        ...prev,
        selectedSongs: newSelectedSongs
      };
    });
  }, []);

  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newSelectedSongs = [...prev.selectedSongs];
      const [removed] = newSelectedSongs.splice(fromIndex, 1);
      newSelectedSongs.splice(toIndex, 0, removed);
      return {
        ...prev,
        selectedSongs: newSelectedSongs
      };
    });
  }, []);

  const setTemplate = useCallback((template: TemplateData | null) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      useAITemplate: false
    }));
  }, []);

  const setUseAITemplate = useCallback((useAI: boolean) => {
    setState(prev => ({
      ...prev,
      useAITemplate: useAI,
      selectedTemplate: useAI ? null : prev.selectedTemplate
    }));
  }, []);

  const setProjectName = useCallback((name: string) => {
    setState(prev => ({ ...prev, projectName: name }));
  }, []);

  const setTransitionDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, transitionDuration: duration }));
  }, []);

  const setTransitionStartPoint = useCallback((startPoint: number) => {
    setState(prev => ({ ...prev, transitionStartPoint: startPoint }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextStep = Math.min(4, prev.currentStep + 1) as WizardStep;
      return { ...prev, currentStep: nextStep, error: null };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => {
      const prevStep = Math.max(1, prev.currentStep - 1) as WizardStep;
      return { ...prev, currentStep: prevStep, error: null };
    });
  }, []);

  const setIsCreating = useCallback((isCreating: boolean) => {
    setState(prev => ({ ...prev, isCreating }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const resetWizard = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const canProceedFromStep = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 1:
        return state.projectType !== null;
      case 2:
        if (state.projectType === 'transition') {
          return state.selectedSongs.length === 2;
        } else if (state.projectType === 'mixer') {
          return state.selectedSongs.length >= 1;
        }
        return false;
      case 3:
        return state.projectName.trim().length > 0;
      default:
        return true;
    }
  }, [state.projectType, state.selectedSongs, state.projectName]);

  return {
    ...state,
    setProjectType,
    selectSong,
    removeSong,
    clearSongSlot,
    reorderSongs,
    setTemplate,
    setUseAITemplate,
    setProjectName,
    setTransitionDuration,
    setTransitionStartPoint,
    goToStep,
    nextStep,
    previousStep,
    setIsCreating,
    setError,
    resetWizard,
    canProceedFromStep
  };
};
