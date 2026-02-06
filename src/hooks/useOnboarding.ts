import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UploadResult } from '../lib/storage';
import { getDemoSongs } from '../lib/demoData';

export interface OnboardingState {
  showOnboarding: boolean;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  tutorialMode: boolean;
  tutorialStep: number;
  tutorialDemoSongs: UploadResult[];
  tutorialCompleted: boolean;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    showOnboarding: false,
    currentStep: 0,
    completed: false,
    skipped: false,
    tutorialMode: false,
    tutorialStep: 0,
    tutorialDemoSongs: [],
    tutorialCompleted: false
  });

  // Check onboarding status when user changes
  useEffect(() => {
    if (!user) {
      setState({
        showOnboarding: false,
        currentStep: 0,
        completed: false,
        skipped: false
      });
      return;
    }

    const completedKey = `onboarding_completed_${user.id}`;
    const skippedKey = `onboarding_skipped_${user.id}`;
    const tutorialCompletedKey = `tutorial_completed_${user.id}`;

    const completed = localStorage.getItem(completedKey) === 'true';
    const skipped = localStorage.getItem(skippedKey) === 'true';
    const tutorialCompleted = localStorage.getItem(tutorialCompletedKey) === 'true';

    setState(prev => ({
      ...prev,
      showOnboarding: !completed && !skipped,
      currentStep: 0,
      completed,
      skipped,
      tutorialCompleted
    }));
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setState(prev => ({
        ...prev,
        showOnboarding: false,
        completed: true
      }));
    }
  };

  const skipOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_skipped_${user.id}`, 'true');
      setState(prev => ({
        ...prev,
        showOnboarding: false,
        skipped: true
      }));
    }
  };

  const resetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`onboarding_completed_${user.id}`);
      localStorage.removeItem(`onboarding_skipped_${user.id}`);
      setState({
        showOnboarding: true,
        currentStep: 0,
        completed: false,
        skipped: false
      });
    }
  };

  const setStep = (step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }));
  };

  const startTutorial = () => {
    const demoSongs = getDemoSongs();
    setState(prev => ({
      ...prev,
      tutorialMode: true,
      tutorialStep: 0,
      tutorialDemoSongs: demoSongs
    }));
  };

  const endTutorial = () => {
    if (user) {
      localStorage.setItem(`tutorial_completed_${user.id}`, 'true');
    }
    setState(prev => ({
      ...prev,
      tutorialMode: false,
      tutorialStep: 0,
      tutorialDemoSongs: [],
      tutorialCompleted: true
    }));
  };

  const advanceTutorialStep = () => {
    setState(prev => ({
      ...prev,
      tutorialStep: prev.tutorialStep + 1
    }));
  };

  const setTutorialStep = (step: number) => {
    setState(prev => ({
      ...prev,
      tutorialStep: step
    }));
  };

  const resetTutorial = () => {
    if (user) {
      localStorage.removeItem(`tutorial_completed_${user.id}`);
    }
    setState(prev => ({
      ...prev,
      tutorialMode: false,
      tutorialStep: 0,
      tutorialDemoSongs: [],
      tutorialCompleted: false
    }));
  };

  return {
    ...state,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    setStep,
    startTutorial,
    endTutorial,
    advanceTutorialStep,
    setTutorialStep,
    resetTutorial
  };
};