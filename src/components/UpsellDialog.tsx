import React from 'react';
import { X, Crown, Zap, Check, ExternalLink, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UpsellDialogProps {
  onClose: () => void;
  trigger: 'no_credits' | 'low_credits' | 'premium_feature';
  featureName?: string;
}

const UpsellDialog: React.FC<UpsellDialogProps> = ({ onClose, trigger, featureName }) => {
  const { user, credits } = useAuth();

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$9',
      period: 'month',
      credits: 50,
      features: [
        '50 exports per month',
        'High-quality renders',
        'Premium templates',
        'Priority processing',
        'Email support'
      ],
      popular: false,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$19',
      period: 'month',
      credits: 200,
      features: [
        '200 exports per month',
        'Lossless quality',
        'All premium templates',
        'Instant processing',
        'Advanced effects',
        'Priority support',
        'Commercial license'
      ],
      popular: true,
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const getDialogContent = () => {
    switch (trigger) {
      case 'no_credits':
        return {
          title: 'Out of Export Credits',
          subtitle: 'You\'ve used all your monthly export credits',
          description: 'Upgrade to continue creating professional mixes with unlimited exports.'
        };
      case 'low_credits':
        return {
          title: 'Running Low on Credits',
          subtitle: `Only ${credits?.creditsRemaining || 0} export credits remaining`,
          description: 'Upgrade now to avoid interruptions in your creative workflow.'
        };
      case 'premium_feature':
        return {
          title: `${featureName} - Premium Feature`,
          subtitle: 'This feature requires a Pro or Premium plan',
          description: 'Unlock advanced mixing capabilities with a paid plan.'
        };
      default:
        return {
          title: 'Upgrade Your Plan',
          subtitle: 'Get more credits and premium features',
          description: 'Take your mixing to the next level with our professional plans.'
        };
    }
  };

  const content = getDialogContent();

  const handleUpgrade = (planId: string) => {
    // In a real app, this would redirect to Stripe checkout
    console.log(`Upgrading to ${planId} plan`);
    // For demo purposes, just close the dialog
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-surface rounded-2xl max-w-4xl w-full p-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{content.title}</h2>
            <p className="text-xl text-gray-300 mb-2">{content.subtitle}</p>
            <p className="text-gray-400">{content.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Plan Status */}
        {user && (
          <div className="bg-gray-900/50 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Current Plan: {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}</h3>
                <p className="text-gray-400 text-sm">
                  {credits?.creditsRemaining || 0} credits remaining this month
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{credits?.creditsRemaining || 0}</div>
                <div className="text-xs text-gray-400">exports left</div>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative glass-surface rounded-xl p-6 transition-all duration-200 hover:shadow-xl ${
                plan.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star size={12} />
                    <span>Most Popular</span>
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">/{plan.period}</span>
                </div>
                <p className="text-gray-400 mt-2">{plan.credits} exports monthly</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check size={16} className="text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-3 bg-gradient-to-r ${plan.color} hover:shadow-lg text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2`}
              >
                <Crown size={18} />
                <span>Upgrade to {plan.name}</span>
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-white font-medium mb-1">How do credits work?</h4>
              <p className="text-gray-400">Each successful export consumes 1 credit. Credits reset monthly on your billing date.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">What if a render fails?</h4>
              <p className="text-gray-400">Failed renders are automatically refunded. You only pay for successful exports.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Can I cancel anytime?</h4>
              <p className="text-gray-400">Yes, cancel anytime. You'll keep your credits until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-1">Commercial use allowed?</h4>
              <p className="text-gray-400">Premium plan includes commercial license. Pro plan is for personal use only.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center space-x-4 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            Maybe Later
          </button>
          <a
            href="#"
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm"
          >
            <span>View detailed pricing</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default UpsellDialog;