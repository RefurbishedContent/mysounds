import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface OnboardingState {
  showOnboarding: boolean;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
}

export const useOnboarding = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    showOnboarding: false,
    currentStep: 0,
    completed: false,
    skipped: false
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
    
    const completed = localStorage.getItem(completedKey) === 'true';
    const skipped = localStorage.getItem(skippedKey) === 'true';
    
    setState({
      showOnboarding: !completed && !skipped,
      currentStep: 0,
      completed,
      skipped
    });
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

  return {
    ...state,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    setStep
  };
};