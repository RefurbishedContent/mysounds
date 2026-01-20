import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Settings, 
  Download, 
  Share, 
  Heart, 
  Star,
  Check,
  X,
  ChevronDown,
  Home,
  Music,
  Headphones,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const UIShowcase: React.FC = () => {
  const [sliderValue, setSliderValue] = useState(50);
  const [toggleState, setToggleState] = useState(false);
  const [activeTab, setActiveTab] = useState('design');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [progress, setProgress] = useState(65);

  const tabs = [
    { id: 'design', label: 'Design System' },
    { id: 'components', label: 'Components' },
    { id: 'patterns', label: 'Patterns' }
  ];

  const breadcrumbs = [
    { label: 'Home', href: '#' },
    { label: 'UI Showcase', href: '#' },
    { label: 'Components', href: '#', active: true }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            MySounds.ai Design System
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A futuristic showcase of glowing cyan-blue components with advanced glassmorphism and neon effects.
          </p>
        </div>

        {/* Color Palette */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/30"></div>
              <p className="text-sm text-gray-400">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg shadow-blue-500/30"></div>
              <p className="text-sm text-gray-400">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-cyan-400 to-teal-500 rounded-lg shadow-lg shadow-cyan-400/30"></div>
              <p className="text-sm text-gray-400">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg shadow-green-500/30"></div>
              <p className="text-sm text-gray-400">Success</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow-lg shadow-amber-500/30"></div>
              <p className="text-sm text-gray-400">Warning</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-16 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg shadow-lg shadow-red-500/30"></div>
              <p className="text-sm text-gray-400">Error</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Primary</h3>
              <div className="space-y-3">
                <button className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/40">
                  Primary Button
                </button>
                <button className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/40 flex items-center justify-center space-x-2">
                  <Play size={16} />
                  <span>With Icon</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Secondary</h3>
              <div className="space-y-3">
                <button className="w-full py-3 px-6 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-cyan-500/50 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20">
                  Secondary Button
                </button>
                <button className="w-full py-3 px-6 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-cyan-500/50 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center space-x-2">
                  <Download size={16} />
                  <span>With Icon</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Ghost</h3>
              <div className="space-y-3">
                <button className="w-full py-3 px-6 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-all duration-200">
                  Ghost Button
                </button>
                <button className="w-full py-3 px-6 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                  <Settings size={16} />
                  <span>With Icon</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Controls */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Form Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Slider */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Slider</h3>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <p className="text-sm text-gray-400">Value: {sliderValue}</p>
              </div>
            </div>

            {/* Toggle */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Toggle</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setToggleState(!toggleState)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200
                    ${toggleState ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 shadow-lg shadow-cyan-500/30' : 'bg-gray-600'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                      ${toggleState ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
                <p className="text-sm text-gray-400">State: {toggleState ? 'On' : 'Off'}</p>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Input</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter text..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Components */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Navigation</h2>
          <div className="space-y-8">
            {/* Tabs */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">Tabs</h3>
              <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Breadcrumbs */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">Breadcrumbs</h3>
              <nav className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    <a
                      href={item.href}
                      className={`
                        transition-colors duration-200
                        ${item.active 
                          ? 'text-purple-400 font-medium' 
                          : 'text-gray-400 hover:text-white'
                        }
                      `}
                    >
                      {item.label}
                    </a>
                    {index < breadcrumbs.length - 1 && (
                      <span className="text-gray-600">/</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Dropdown */}
            <div>
              <h3 className="text-lg font-medium text-gray-300 mb-4">Dropdown</h3>
              <div className="relative inline-block">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-all duration-200"
                >
                  <span>Select Option</span>
                  <ChevronDown size={16} className={`transform transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10">
                    <div className="py-1">
                      <a href="#" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200">
                        <Home size={16} />
                        <span>Home</span>
                      </a>
                      <a href="#" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200">
                        <Music size={16} />
                        <span>Music</span>
                      </a>
                      <a href="#" className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200">
                        <Headphones size={16} />
                        <span>Preview</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Feedback Components */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Progress */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Progress</h3>
              <div className="space-y-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/30"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400">{progress}% Complete</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors duration-200"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors duration-200"
                  >
                    +10%
                  </button>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-300">Badges</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white text-sm rounded-full shadow-lg shadow-cyan-500/30">
                  Primary
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm rounded-full shadow-lg shadow-green-500/30">
                  Success
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm rounded-full shadow-lg shadow-amber-500/30">
                  Warning
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm rounded-full shadow-lg shadow-red-500/30">
                  Error
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm rounded-full shadow-lg shadow-cyan-400/30 flex items-center space-x-1">
                  <Star size={12} />
                  <span>Featured</span>
                </span>
              </div>
            </div>
          </div>

          {/* Toast */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Toast Notifications</h3>
            <button
              onClick={() => {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/40"
            >
              Show Toast
            </button>
          </div>
        </section>

        {/* Icons */}
        <section className="glass-surface rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Icons</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4">
            {[
              Play, Pause, Volume2, Settings, Download, Share, Heart, Star,
              Check, X, ChevronDown, Home, Music, Headphones, Info, AlertCircle,
              CheckCircle, XCircle
            ].map((Icon, index) => (
              <div key={index} className="flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-800 transition-colors duration-200">
                <Icon size={24} className="text-gray-400 hover:text-white transition-colors duration-200" />
                <span className="text-xs text-gray-500">{Icon.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle size={20} className="text-green-500" />
            <div>
              <p className="text-white font-medium">Success!</p>
              <p className="text-gray-400 text-sm">Toast notification displayed</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #06b6d4, #3B82F6, #8B5CF6);
          cursor: pointer;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.6), 0 0 6px rgba(59, 130, 246, 0.4);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(45deg, #06b6d4, #3B82F6, #8B5CF6);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.6), 0 0 6px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
};

export default UIShowcase;