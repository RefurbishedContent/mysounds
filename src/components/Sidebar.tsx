import React from 'react';
import { Home, Music, Disc3, Headphones, Settings, Folder, AudioWaveform as Waveform, Sliders, FileAudio, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
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
      bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out relative
      ${isCollapsed ? 'w-14' : 'w-50'}
    `}>
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-50 w-6 h-6 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight size={14} className="text-gray-300" />
        ) : (
          <ChevronLeft size={14} className="text-gray-300" />
        )}
      </button>

      <div className="h-full flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className={`
                  w-full flex items-center px-2 py-1.5 text-sm rounded-lg transition-all duration-200
                  ${item.active
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-2.5 font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-2.5 border-t border-gray-700">
          <button className={`
            w-full flex items-center px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200
            ${isCollapsed ? 'justify-center' : 'justify-start'}
          `}>
            <Settings size={18} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="ml-2.5 font-medium">Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;