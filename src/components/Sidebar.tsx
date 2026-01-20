import React from 'react';
import { Home, Music, Disc3, Headphones, Settings, Folder, AudioWaveform as Waveform, Sliders, FileAudio } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const menuItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: Music, label: 'Library' },
    { icon: Disc3, label: 'Projects' },
    { icon: Waveform, label: 'Editor' },
    { icon: Sliders, label: 'Mixer' },
    { icon: FileAudio, label: 'Samples' },
    { icon: Headphones, label: 'Preview' },
    { icon: Folder, label: 'Files' },
  ];

  return (
    <div className={`
      bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      <div className="h-full flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className={`
                  w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200
                  ${item.active 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700">
          <button className={`
            w-full flex items-center px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200
            ${isCollapsed ? 'justify-center' : 'justify-start'}
          `}>
            <Settings size={20} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="ml-3 font-medium">Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;