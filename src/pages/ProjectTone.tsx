import React, { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, Music, AlertCircle, Database, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Lazy load ToneEngine for SSR safety
const ToneEngine = React.lazy(() => import('../components/audio/ToneEngine'));

const ProjectTone: React.FC = () => {
  const { user } = useAuth();
  // Get projectId from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId') || 'demo'; // Default to demo project
  const [cursorSec, setCursorSec] = useState(0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
          <p className="text-gray-400">Please sign in to access project audio engine</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database size={48} className="text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Project ID Required</h2>
          <p className="text-gray-400">Please specify a projectId in the URL query parameters</p>
          <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300">
            Example: ?projectId=demo (for testing) or ?projectId=your-project-id
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-400/60 hover:scale-105"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Project Audio Engine</h1>
              <p className="text-gray-400">Testing Tone.js integration with project data</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock size={16} />
              <span>Cursor: {cursorSec.toFixed(1)}s</span>
            </div>
            <div className="text-sm text-gray-400">
              Project: {projectId === 'demo' ? 'Demo Mode' : projectId.slice(0, 8) + '...'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Suspense 
          fallback={
            <div className="glass-surface rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-lg shadow-cyan-500/50"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Loading Audio Engine</h3>
              <p className="text-gray-400">Initializing Tone.js components...</p>
            </div>
          }
        >
          <ToneEngine 
            projectId={projectId}
            cursorSec={cursorSec}
          />
        </Suspense>

        {/* Usage Guide */}
        <div className="mt-8 glass-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Project Integration Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="text-white font-medium">Project Data Loading</h3>
                  <p className="text-gray-400 text-sm">Fetches project, tracks, clips, and transitions from Supabase</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="text-white font-medium">Audio Engine Setup</h3>
                  <p className="text-gray-400 text-sm">Creates Tone.js players and schedules timeline events</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="text-white font-medium">Template Automation</h3>
                  <p className="text-gray-400 text-sm">Applies template transitions and parameter automation</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="text-white font-medium">Real-time Control</h3>
                  <p className="text-gray-400 text-sm">Responds to cursor position and timeline playback</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="text-white font-medium">Export Ready</h3>
                  <p className="text-gray-400 text-sm">Records mixed output for download and export</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTone;