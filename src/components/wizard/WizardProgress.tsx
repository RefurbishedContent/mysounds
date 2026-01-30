import React from 'react';
import { Check } from 'lucide-react';
import { WizardStep } from '../../hooks/useProjectWizard';

interface WizardProgressProps {
  currentStep: WizardStep;
  steps: { number: WizardStep; label: string }[];
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full bg-gray-800 border-b border-gray-700 px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            const isUpcoming = step.number > currentStep;

            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center relative z-10">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300
                      ${isCompleted
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                        : isCurrent
                        ? 'bg-gray-700 text-white ring-4 ring-cyan-500/30 ring-offset-2 ring-offset-gray-800 animate-pulse'
                        : 'bg-gray-700 text-gray-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check size={20} className="animate-in fade-in zoom-in" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`
                      mt-2 text-xs font-medium whitespace-nowrap transition-colors duration-300
                      ${isCurrent ? 'text-cyan-400' : isCompleted ? 'text-gray-300' : 'text-gray-500'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-4 relative top-[-20px]">
                    <div className="w-full h-full bg-gray-700"></div>
                    <div
                      className={`
                        h-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-blue-500
                        ${isCompleted ? 'w-full' : 'w-0'}
                      `}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WizardProgress;
