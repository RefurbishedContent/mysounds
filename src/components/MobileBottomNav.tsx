import React from 'react';
import { Sparkles, FlaskConical, Music, FileAudio, User } from 'lucide-react';

export type MobileNavView = 'ai-fusion' | 'labs' | 'library' | 'templates' | 'profile';

interface MobileBottomNavProps {
  currentView: MobileNavView;
  onNavigate: (view: MobileNavView) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'ai-fusion' as MobileNavView, icon: Sparkles, label: 'AI Fusion' },
    { id: 'labs' as MobileNavView, icon: FlaskConical, label: 'Labs' },
    { id: 'library' as MobileNavView, icon: Music, label: 'Library' },
    { id: 'templates' as MobileNavView, icon: FileAudio, label: 'Templates' },
    { id: 'profile' as MobileNavView, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-lg border-t border-gray-700" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive ? 'text-white' : 'text-gray-400'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : ''} />
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
