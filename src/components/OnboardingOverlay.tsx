import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowDown, Upload, Layers, Play, Settings, CheckCircle, Lightbulb } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ComponentType<{ size: number }>;
  action?: string;
}

interface OnboardingOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete, onSkip }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to MySounds.ai!',
      description: 'Let\'s fuse your first two songs with AI-powered templates in just 4 simple steps.',
      target: 'center',
      position: 'center',
      icon: Lightbulb
    },
    {
      id: 'upload',
      title: 'Upload Two Songs',
      description: 'Start by uploading two songs you want to fuse together. Drag and drop or click to browse.',
      target: '.upload-area, [data-onboarding="upload"]',
      position: 'bottom',
      icon: Upload,
      action: 'Upload your tracks to continue'
    },
    {
      id: 'template',
      title: 'Select AI Template',
      description: 'Drag an AI template from the gallery onto the timeline. Our AI analyzes your tracks and predicts the perfect transition points.',
      target: '.template-gallery, [data-onboarding="templates"]',
      position: 'right',
      icon: Layers,
      action: 'Drag an AI template to the timeline'
    },
    {
      id: 'preview',
      title: 'Preview Your Fusion',
      description: 'Press play to hear your fusion. The AI template will automatically blend your songs at the optimal transition point.',
      target: '.play-button, [data-onboarding="play"]',
      position: 'top',
      icon: Play,
      action: 'Click play to preview'
    },
    {
      id: 'inspector',
      title: 'Fine-tune AI Parameters',
      description: 'Use the Template Inspector to adjust AI prediction settings, crossfade length, and transition parameters for the perfect fusion.',
      target: '.template-inspector, [data-onboarding="inspector"]',
      position: 'left',
      icon: Settings,
      action: 'Adjust AI template parameters'
    }
  ];

  // Find target element for current step
  useEffect(() => {
    const step = steps[currentStep];
    if (!step || step.target === 'center') {
      setTargetElement(null);
      return;
    }

    const element = document.querySelector(step.target) as HTMLElement;
    setTargetElement(element);
  }, [currentStep]);

  // Auto-advance based on user actions
  useEffect(() => {
    const checkStepCompletion = () => {
      const step = steps[currentStep];
      
      switch (step.id) {
        case 'upload':
          // Check if both tracks are uploaded
          const uploadArea = document.querySelector('[data-onboarding="upload-complete"]');
          if (uploadArea) {
            setTimeout(() => nextStep(), 1000);
          }
          break;
        case 'template':
          // Check if template is placed
          const templatePlaced = document.querySelector('[data-onboarding="template-placed"]');
          if (templatePlaced) {
            setTimeout(() => nextStep(), 1000);
          }
          break;
        case 'preview':
          // Check if user has played the mix
          const hasPlayed = document.querySelector('[data-onboarding="has-played"]');
          if (hasPlayed) {
            setTimeout(() => nextStep(), 1000);
          }
          break;
      }
    };

    const interval = setInterval(checkStepCompletion, 500);
    return () => clearInterval(interval);
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = () => {
    setIsVisible(false);
    
    // Mark onboarding as completed
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    
    setTimeout(() => onComplete(), 300);
  };

  const skipOnboarding = () => {
    setIsVisible(false);
    
    // Mark onboarding as skipped
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    
    setTimeout(() => onSkip(), 300);
  };

  const getCoachMarkPosition = () => {
    if (!targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = targetElement.getBoundingClientRect();
    const step = steps[currentStep];
    
    const coachMarkWidth = 320;
    const coachMarkHeight = 200;
    const offset = 20;
   const viewportWidth = window.innerWidth;
   const viewportHeight = window.innerHeight;

    switch (step.position) {
      case 'top':
       {
         const top = Math.max(offset, rect.top - coachMarkHeight - offset);
         const left = Math.max(offset, Math.min(viewportWidth - coachMarkWidth - offset, rect.left + rect.width / 2 - coachMarkWidth / 2));
         return { top: `${top}px`, left: `${left}px` };
       }
      case 'bottom':
       {
         const top = Math.min(viewportHeight - coachMarkHeight - offset, rect.bottom + offset);
         const left = Math.max(offset, Math.min(viewportWidth - coachMarkWidth - offset, rect.left + rect.width / 2 - coachMarkWidth / 2));
         return { top: `${top}px`, left: `${left}px` };
       }
      case 'left':
       {
         const top = Math.max(offset, Math.min(viewportHeight - coachMarkHeight - offset, rect.top + rect.height / 2 - coachMarkHeight / 2));
         const left = Math.max(offset, rect.left - coachMarkWidth - offset);
         return { top: `${top}px`, left: `${left}px` };
       }
      case 'right':
       {
         const top = Math.max(offset, Math.min(viewportHeight - coachMarkHeight - offset, rect.top + rect.height / 2 - coachMarkHeight / 2));
         const left = Math.min(viewportWidth - coachMarkWidth - offset, rect.right + offset);
         return { top: `${top}px`, left: `${left}px` };
       }
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  const getArrowPosition = () => {
    if (!targetElement) return null;

    const step = steps[currentStep];
    
    switch (step.position) {
      case 'top':
        return 'bottom-arrow';
      case 'bottom':
        return 'top-arrow';
      case 'left':
        return 'right-arrow';
      case 'right':
        return 'left-arrow';
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />
      
      {/* Spotlight on target element */}
      {targetElement && (
        <div
          className="absolute border-4 border-purple-400 rounded-lg shadow-lg shadow-purple-500/50 pointer-events-none animate-pulse"
          style={{
            top: `${targetElement.offsetTop - 4}px`,
            left: `${targetElement.offsetLeft - 4}px`,
            width: `${targetElement.offsetWidth + 8}px`,
            height: `${targetElement.offsetHeight + 8}px`,
          }}
        />
      )}

      {/* Coach Mark */}
      <div
        className="absolute pointer-events-auto animate-fade-in"
        style={getCoachMarkPosition()}
      >
        <div className={`glass-surface rounded-2xl p-6 max-w-sm relative ${getArrowPosition()}`}>
          {/* Arrow */}
          {getArrowPosition() && (
            <div className={`absolute w-4 h-4 bg-gray-800 border border-gray-600 transform rotate-45 ${
              getArrowPosition() === 'top-arrow' ? '-top-2 left-1/2 -translate-x-1/2' :
              getArrowPosition() === 'bottom-arrow' ? '-bottom-2 left-1/2 -translate-x-1/2' :
              getArrowPosition() === 'left-arrow' ? '-left-2 top-1/2 -translate-y-1/2' :
              '-right-2 top-1/2 -translate-y-1/2'
            }`} />
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{currentStepData.title}</h3>
                <div className="text-xs text-gray-400">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
            </div>
            <button
              onClick={skipOnboarding}
              className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-300 leading-relaxed">
              {currentStepData.description}
            </p>

            {currentStepData.action && (
              <div className="p-3 bg-purple-900/30 border border-purple-600/50 rounded-lg">
                <p className="text-purple-200 text-sm font-medium">
                  {currentStepData.action}
                </p>
              </div>
            )}

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-white">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={skipOnboarding}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  Skip Tour
                </button>
                <button
                  onClick={currentStep === steps.length - 1 ? completeOnboarding : nextStep}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
                >
                  <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                  {currentStep === steps.length - 1 ? (
                    <CheckCircle size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .top-arrow::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 8px solid rgba(30, 30, 33, 0.9);
        }
        
        .bottom-arrow::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid rgba(30, 30, 33, 0.9);
        }
        
        .left-arrow::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-right: 8px solid rgba(30, 30, 33, 0.9);
        }
        
        .right-arrow::after {
          content: '';
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid rgba(30, 30, 33, 0.9);
        }
      `}</style>
    </div>
  );
};

export default OnboardingOverlay;