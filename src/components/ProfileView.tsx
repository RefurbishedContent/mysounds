import React from 'react';
import { User, Settings, CreditCard, HelpCircle, LogOut, Activity, Bell, Shield, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CreditsIndicator from './CreditsIndicator';

interface ProfileViewProps {
  onShowTutorial?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onShowTutorial }) => {
  const { user, signOut } = useAuth();

  const menuSections = [
    {
      title: 'Account',
      items: [
        { id: 'profile', icon: User, label: 'Edit Profile', action: () => console.log('Edit Profile') },
        { id: 'credits', icon: CreditCard, label: 'Credits & Billing', action: () => console.log('Credits') },
        { id: 'activity', icon: Activity, label: 'Activity Log', action: () => console.log('Activity') },
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'preferences', icon: Settings, label: 'Preferences', action: () => console.log('Preferences') },
        { id: 'notifications', icon: Bell, label: 'Notifications', action: () => console.log('Notifications') },
        { id: 'appearance', icon: Palette, label: 'Appearance', action: () => console.log('Appearance') },
        { id: 'security', icon: Shield, label: 'Security', action: () => console.log('Security') },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: HelpCircle, label: 'Help Center', action: () => console.log('Help') },
        { id: 'tutorial', icon: HelpCircle, label: 'Show Tutorial', action: onShowTutorial },
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-600/10 p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full" />
              ) : (
                <User size={32} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white capitalize">
                  {user?.plan} Account
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Available Credits</span>
              <CreditsIndicator />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                    >
                      <Icon size={20} className="text-gray-400" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            >
              <LogOut size={20} />
              <span className="flex-1 text-left font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
