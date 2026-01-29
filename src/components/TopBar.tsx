import React from 'react';
import { Menu, Search, Bell, User, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TopBarProps {
  onToggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-3 py-2">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
          >
            <Menu size={18} />
          </button>

          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                DJ Blender
              </h1>
              <p className="text-xs text-gray-500 leading-tight">Professional Audio Mixing</p>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center space-x-1 ml-4">
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200">
              <SkipBack size={16} />
            </button>
            <button className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
              <Play size={16} />
            </button>
            <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search tracks, projects..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 relative">
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-gray-600">
            <div className="text-right">
              <p className="text-xs font-medium text-white">DJ Producer</p>
              <p className="text-xs text-gray-400">Free Account</p>
            </div>
            <div className="w-7 h-7 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;