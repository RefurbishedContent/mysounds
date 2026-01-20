import React from 'react';

interface TemplateIconProps {
  category: string;
  className?: string;
  name?: string;
}

const TemplateIcon: React.FC<TemplateIconProps> = ({ category, className = '', name = '' }) => {
  const gradientId = `grad-${category}-${name}-${Math.random()}`;

  const getIconByCategory = () => {
    const lowerCategory = category.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerName.includes('cross') || lowerCategory === 'house') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* DJ Crossfader */}
          <rect x="30" y="80" width="140" height="40" rx="20" fill={`url(#${gradientId})`} opacity="0.2" />
          <rect x="60" y="70" width="40" height="60" rx="8" fill={`url(#${gradientId})`} />
          <line x1="40" y1="60" x2="40" y2="140" stroke={`url(#${gradientId})`} strokeWidth="6" opacity="0.4" />
          <line x1="160" y1="60" x2="160" y2="140" stroke={`url(#${gradientId})`} strokeWidth="6" opacity="0.4" />
        </svg>
      );
    }

    if (lowerName.includes('electronic') || lowerCategory === 'electronic') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Synthesizer Keyboard */}
          <rect x="40" y="75" width="28" height="70" rx="4" fill={`url(#${gradientId})`} />
          <rect x="73" y="75" width="28" height="70" rx="4" fill={`url(#${gradientId})`} opacity="0.8" />
          <rect x="106" y="75" width="28" height="70" rx="4" fill={`url(#${gradientId})`} />
          <rect x="139" y="75" width="28" height="70" rx="4" fill={`url(#${gradientId})`} opacity="0.8" />
          <rect x="57" y="55" width="18" height="40" rx="3" fill={`url(#${gradientId})`} opacity="0.9" />
          <rect x="90" y="55" width="18" height="40" rx="3" fill={`url(#${gradientId})`} opacity="0.9" />
          <rect x="123" y="55" width="18" height="40" rx="3" fill={`url(#${gradientId})`} opacity="0.9" />
        </svg>
      );
    }

    if (lowerName.includes('dubstep') || lowerCategory === 'dubstep') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Bass Speaker */}
          <rect x="40" y="40" width="120" height="120" rx="12" fill={`url(#${gradientId})`} opacity="0.15" />
          <circle cx="100" cy="100" r="45" fill={`url(#${gradientId})`} opacity="0.3" />
          <circle cx="100" cy="100" r="35" fill={`url(#${gradientId})`} opacity="0.5" />
          <circle cx="100" cy="100" r="20" fill={`url(#${gradientId})`} />
        </svg>
      );
    }

    if (lowerName.includes('trance') || lowerCategory === 'trance') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Headphones */}
          <path
            d="M100 45 Q55 45 40 90 L40 125 Q40 135 50 135 L65 135 Q72 135 72 128 L72 95 Q72 88 65 88 L55 88"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />
          <path
            d="M100 45 Q145 45 160 90 L160 125 Q160 135 150 135 L135 135 Q128 135 128 128 L128 95 Q128 88 135 88 L145 88"
            fill={`url(#${gradientId})`}
            opacity="0.9"
          />
          <rect x="50" y="95" width="22" height="40" rx="11" fill={`url(#${gradientId})`} />
          <rect x="128" y="95" width="22" height="40" rx="11" fill={`url(#${gradientId})`} />
        </svg>
      );
    }

    if (lowerName.includes('hip-hop') || lowerName.includes('scratch') || lowerCategory === 'hip-hop') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Turntable with tonearm */}
          <circle cx="90" cy="110" r="50" fill={`url(#${gradientId})`} opacity="0.2" />
          <circle cx="90" cy="110" r="38" fill={`url(#${gradientId})`} opacity="0.4" />
          <circle cx="90" cy="110" r="12" fill={`url(#${gradientId})`} />
          <path
            d="M108 95 L150 55"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="153" cy="52" r="10" fill={`url(#${gradientId})`} />
        </svg>
      );
    }

    if (lowerName.includes('progressive') || lowerCategory === 'progressive') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Waveform */}
          <path
            d="M25 100 L45 75 L65 125 L85 55 L105 145 L125 85 L145 115 L165 100 L185 95"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="25" y1="100" x2="185" y2="100" stroke={`url(#${gradientId})`} strokeWidth="3" opacity="0.2" />
        </svg>
      );
    }

    if (lowerName.includes('techno') || lowerCategory === 'techno') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* DJ Mixer with knobs */}
          <rect x="50" y="60" width="100" height="80" rx="8" fill={`url(#${gradientId})`} opacity="0.15" />
          <circle cx="80" cy="90" r="18" fill={`url(#${gradientId})`} opacity="0.5" />
          <circle cx="120" cy="90" r="18" fill={`url(#${gradientId})`} opacity="0.5" />
          <circle cx="80" cy="90" r="12" fill={`url(#${gradientId})`} />
          <circle cx="120" cy="90" r="12" fill={`url(#${gradientId})`} />
          <rect x="72" y="115" width="16" height="20" rx="3" fill={`url(#${gradientId})`} />
          <rect x="112" y="115" width="16" height="20" rx="3" fill={`url(#${gradientId})`} />
        </svg>
      );
    }

    if (lowerName.includes('ambient') || lowerCategory === 'ambient') {
      return (
        <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>
          {/* Sound waves radiating */}
          <circle cx="100" cy="100" r="15" fill={`url(#${gradientId})`} />
          <circle cx="100" cy="100" r="32" fill={`url(#${gradientId})`} opacity="0.4" />
          <circle cx="100" cy="100" r="50" fill={`url(#${gradientId})`} opacity="0.25" />
          <circle cx="100" cy="100" r="68" fill={`url(#${gradientId})`} opacity="0.1" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 200 200" className={`w-full h-full ${className}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
        {/* Music notes */}
        <g transform="scale(1.4) translate(20, 20)">
          <path
            d="M55 55 L55 95 C55 102 48 107 43 107 C38 107 33 102 33 95 C33 88 38 83 43 83 C48 83 52 85 55 88 L55 55 M65 55 L100 48 L100 88 C100 95 93 100 88 100 C83 100 78 95 78 88 C78 81 83 76 88 76 C93 76 97 78 100 81 L100 48"
            fill={`url(#${gradientId})`}
          />
        </g>
      </svg>
    );
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="w-3/4 h-3/4">
        {getIconByCategory()}
      </div>
    </div>
  );
};

export default TemplateIcon;
