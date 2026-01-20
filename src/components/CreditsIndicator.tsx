import React, { useState } from 'react';
import { Zap, Crown, Info, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CreditsIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const CreditsIndicator: React.FC<CreditsIndicatorProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { user, credits } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!user || !credits) return null;

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'text-blue-400';
      case 'premium': return 'text-purple-400';
      case 'admin': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
      case 'premium':
        return <Crown size={14} className={getPlanColor(plan)} />;
      default:
        return <Zap size={14} className={getPlanColor(plan)} />;
    }
  };

  const getMonthlyAllocation = (plan: string) => {
    switch (plan) {
      case 'pro': return 50;
      case 'premium': return 200;
      case 'admin': return 9999;
      default: return 3;
    }
  };

  const isLowCredits = credits.creditsRemaining <= 1;
  const isOutOfCredits = credits.creditsRemaining === 0;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isOutOfCredits 
            ? 'bg-red-900/30 border border-red-700' 
            : isLowCredits 
            ? 'bg-yellow-900/30 border border-yellow-700' 
            : 'bg-gray-800 border border-gray-600 hover:border-gray-500'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="hidden sm:block">{getPlanIcon(user.plan)}</span>
        <span className={`text-xs sm:text-sm font-medium ${
          isOutOfCredits ? 'text-red-300' : isLowCredits ? 'text-yellow-300' : 'text-white'
        }`}>
          {credits.creditsRemaining}
        </span>

        {showDetails && (
          <div className="text-xs text-gray-400 hidden sm:block">
            / {getMonthlyAllocation(user.plan)} monthly
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl z-50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Export Credits</span>
              <span className={`text-sm ${getPlanColor(user.plan)} capitalize`}>
                {user.plan} Plan
              </span>
            </div>
            
            <div className="text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium">{credits.creditsRemaining}</span>
              </div>
              <div className="flex justify-between">
                <span>Used this month:</span>
                <span>{credits.creditsUsedThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly allocation:</span>
                <span>{getMonthlyAllocation(user.plan)}</span>
              </div>
            </div>
            
            {isLowCredits && (
              <div className="pt-2 border-t border-gray-600">
                <p className="text-xs text-yellow-300">
                  {isOutOfCredits 
                    ? 'No credits remaining. Upgrade for more exports.'
                    : 'Running low on credits. Consider upgrading.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditsIndicator;