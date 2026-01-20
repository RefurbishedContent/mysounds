import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw, 
  Zap,
  Download,
  Share,
  Heart,
  MoreVertical,
  Info
} from 'lucide-react';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('mixer');
  const [volume, setVolume] = useState(75);
  const [showDialog, setShowDialog] = useState(false);

  const tabs = [
    { id: 'mixer', label: 'Mixer', active: true },
    { id: 'effects', label: 'Effects' },
    { id: 'samples', label: 'Samples' },
    { id: 'timeline', label: 'Timeline' }
  ];

  return (
    <div className="flex-1 bg-gray-900 overflow-hidden">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-1 px-6 py-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="h-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Volume Control Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Master Volume</h3>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <VolumeX size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <Volume2 size={20} className="text-gray-400" />
                  <span className="text-white font-medium w-8">{volume}</span>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200">
                    <RotateCcw size={16} className="mx-auto" />
                  </button>
                  <button className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200">
                    <RotateCw size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sample Buttons */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
                  <Zap size={16} />
                  <span className="text-sm font-medium">Auto Mix</span>
                </button>
                <button className="py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
                  <Download size={16} />
                  <span className="text-sm font-medium">Export</span>
                </button>
                <button className="py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
                  <Share size={16} />
                  <span className="text-sm font-medium">Share</span>
                </button>
                <button 
                  onClick={() => setShowDialog(true)}
                  className="py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Heart size={16} />
                  <span className="text-sm font-medium">Save</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center Panel - Waveform Display */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Audio Editor</h3>
                <div className="flex items-center space-x-2">
                  <button className="text-gray-400 hover:text-white transition-colors group relative">
                    <Info size={16} />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Click to learn more
                    </div>
                  </button>
                </div>
              </div>

              {/* Placeholder Waveform */}
              <div className="relative bg-gray-900 rounded-lg h-48 mb-6 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-purple-600 to-pink-600 rounded-full opacity-60"
                        style={{
                          width: '4px',
                          height: `${Math.random() * 120 + 20}px`,
                          animation: `pulse ${Math.random() * 2 + 1}s infinite alternate`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-4 left-4 text-gray-400 text-sm">
                  00:00 / 03:45
                </div>
                <div className="absolute top-4 right-4 text-gray-400 text-sm">
                  120 BPM
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="space-y-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Track 1: Main Mix</span>
                  <span>Ready to blend</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Save Project</h3>
            <p className="text-gray-400 mb-6">
              Your mix will be saved to your library. You can access it anytime from the Projects tab.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #8B5CF6, #EC4899);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }

        @keyframes pulse {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default MainContent;