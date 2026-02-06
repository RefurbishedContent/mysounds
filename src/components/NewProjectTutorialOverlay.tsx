import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle, Plus, Music, Zap, Settings, Sparkles } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ComponentType<{ size: number; className?: string }>;
  action?: string;
}

interface NewProjectTutorialOverlayProps {
  currentStep: number;
  onAdvance: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to MySounds.AI!',
    description: 'Let me show you how to create professional DJ transitions in just a few clicks using our AI-powered workflow.',
    target: 'center',
    position: 'center',
    icon: Sparkles
  },
  {
    id: 'create-button',
    title: 'Start Creating',
    description: 'Click the "+Create New" button to begin creating your first project. This opens the project creation wizard.',
    target: '[data-tutorial="create-button"]',
    position: 'bottom',
    icon: Plus,
    action: 'Click "+Create New" to continue'
  },
  {
    id: 'project-type',
    title: 'Choose Project Type',
    description: 'Select "Transition Project" to create a seamless transition between two songs. Our AI will analyze and blend them perfectly.',
    target: '[data-tutorial="transition-project"]',
    position: 'bottom',
    icon: Music,
    action: 'Select "Transition Project"'
  },
  {
    id: 'song-a',
    title: 'Select First Song',
    description: 'Choose your first track. For this demo, we\'ve provided sample songs that are already analyzed and ready to mix.',
    target: '[data-tutorial="demo-song-1"]',
    position: 'right',
    icon: Music,
    action: 'Click on "Summer Beats"'
  },
  {
    id: 'song-b',
    title: 'Select Second Song',
    description: 'Now select your second track. The AI will show you compatibility indicators based on BPM, key, and energy levels.',
    target: '[data-tutorial="demo-song-2"]',
    position: 'right',
    icon: Music,
    action: 'Click on "Midnight Groove"'
  },
  {
    id: 'compatibility',
    title: 'AI Compatibility Analysis',
    description: 'Our AI analyzes both tracks and shows compatibility scores, suggesting optimal transition points and techniques.',
    target: '[data-tutorial="compatibility-panel"]',
    position: 'left',
    icon: Zap,
    action: 'Review the compatibility information'
  },
  {
    id: 'configuration',
    title: 'Configure Transition',
    description: 'Adjust transition settings like crossfade length and sync points. The AI provides smart defaults based on your tracks.',
    target: '[data-tutorial="transition-config"]',
    position: 'left',
    icon: Settings,
    action: 'Explore the configuration options'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'That\'s it! You now know how to create AI-powered transitions. Upload your own tracks to start creating professional mixes.',
    target: 'center',
    position: 'center',
    icon: CheckCircle
  }
];

const NewProjectTutorialOverlay: React.FC<NewProjectTutorialOverlayProps> = ({
  currentStep,
  onAdvance,
  onComplete,
  onSkip
}) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  useEffect(() => {
    if (!step || step.target === 'center') {
      setTargetElement(null);
      return;
    }

    const findElement = () => {
      const element = document.querySelector(step.target) as HTMLElement;
      setTargetElement(element);
    };

    findElement();

    const intervalId = setInterval(findElement, 100);
    return () => clearInterval(intervalId);
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep === TUTORIAL_STEPS.length - 1) {
      handleComplete();
    } else {
      onAdvance();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => onComplete(), 300);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(() => onSkip(), 300);
  };

  const getCoachMarkPosition = () => {
    if (!targetElement) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const coachMarkWidth = 400;
    const maxCoachMarkHeight = 500;
    const offset = 24;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top': {
        top = rect.top - maxCoachMarkHeight - offset;
        if (top < offset) {
          top = rect.bottom + offset;
        }
        left = rect.left + rect.width / 2 - coachMarkWidth / 2;
        break;
      }
      case 'bottom': {
        top = rect.bottom + offset;
        if (top + maxCoachMarkHeight > viewportHeight - offset) {
          top = rect.top - maxCoachMarkHeight - offset;
          if (top < offset) {
            top = offset;
          }
        }
        left = rect.left + rect.width / 2 - coachMarkWidth / 2;
        break;
      }
      case 'left': {
        left = rect.left - coachMarkWidth - offset;
        if (left < offset) {
          left = rect.right + offset;
          if (left + coachMarkWidth > viewportWidth - offset) {
            left = offset;
          }
        }
        top = rect.top + rect.height / 2 - 150;
        break;
      }
      case 'right': {
        left = rect.right + offset;
        if (left + coachMarkWidth > viewportWidth - offset) {
          left = rect.left - coachMarkWidth - offset;
          if (left < offset) {
            left = offset;
          }
        }
        top = rect.top + rect.height / 2 - 150;
        break;
      }
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }

    left = Math.max(offset, Math.min(viewportWidth - coachMarkWidth - offset, left));
    top = Math.max(offset, Math.min(viewportHeight - maxCoachMarkHeight - offset, top));

    return { top: `${top}px`, left: `${left}px` };
  };

  const getSpotlightStyle = () => {
    if (!targetElement) return null;

    const rect = targetElement.getBoundingClientRect();
    const padding = 8;

    return {
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`
    };
  };

  if (!isVisible) return null;

  const spotlightStyle = getSpotlightStyle();

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />

      {spotlightStyle && targetElement && (
        <>
          <div
            className="absolute pointer-events-none transition-all duration-300 ease-out"
            style={{
              ...spotlightStyle,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 40px 8px rgba(59, 130, 246, 0.5)',
              borderRadius: '12px',
              zIndex: 101
            }}
          />
          <div
            className="absolute border-4 border-blue-500 rounded-xl pointer-events-none animate-pulse transition-all duration-300"
            style={{
              ...spotlightStyle,
              zIndex: 102
            }}
          />
        </>
      )}

      <div
        className={`absolute pointer-events-auto transition-all duration-300 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          ...getCoachMarkPosition(),
          maxWidth: 'min(400px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          zIndex: 103
        }}
      >
        <div className="bg-gray-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl shadow-blue-500/20 p-6 max-h-[calc(100vh-32px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
                <div className="text-xs text-gray-400 mt-0.5">
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </div>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              aria-label="Skip tutorial"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-300 leading-relaxed text-base">
              {step.description}
            </p>

            {step.action && (
              <div className="p-4 bg-blue-900/30 border border-blue-600/40 rounded-xl">
                <p className="text-blue-200 text-sm font-medium flex items-center">
                  <Zap size={16} className="mr-2 flex-shrink-0" />
                  {step.action}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Progress</span>
                <span className="text-white font-semibold">
                  {Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-all duration-200"
              >
                Skip Tutorial
              </button>

              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/30"
              >
                <span>{currentStep === TUTORIAL_STEPS.length - 1 ? 'Get Started' : 'Next'}</span>
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <CheckCircle size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProjectTutorialOverlay;
