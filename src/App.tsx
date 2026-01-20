import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGateway from './components/AuthGateway';
import AppShell from './components/AppShell';
import LandingPage from './components/LandingPage';
import UIShowcase from './components/UIShowcase';
import ToneTestPage from './components/ToneTestPage';
import ProjectTone from './pages/ProjectTone';
import './styles/theme.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'showcase' | 'app' | 'tone-test' | 'project-tone'>('landing');
  const [showAuthGateway, setShowAuthGateway] = useState(false);
  
  // Get project ID from URL for project-tone view
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <div className="w-8 h-8 bg-white rounded-sm"></div>
          </div>
          <p className="text-gray-400">Initializing DJ Blender...</p>
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Landing Page View
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gray-900">
        <LandingPage onTryMixer={() => {
          if (isAuthenticated) {
            setCurrentView('app');
          } else {
            setShowAuthGateway(true);
          }
        }} />
        
        {/* Development Navigation */}
        <div className="fixed bottom-4 left-4 z-50 flex space-x-2">
          <button
            onClick={() => setCurrentView('showcase')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            UI Showcase
          </button>
          <button
            onClick={() => setCurrentView('tone-test')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Tone.js Test
          </button>
          <button
            onClick={() => setCurrentView('project-tone')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Project Tone
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setCurrentView('app')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
            >
              App Shell
            </button>
          )}
        </div>

        {/* Auth Gateway */}
        {showAuthGateway && (
          <AuthGateway onClose={() => {
            setShowAuthGateway(false);
            // If user successfully authenticated, redirect to app
            if (isAuthenticated) {
              setCurrentView('app');
            }
          }} />
        )}
      </div>
    );
  }

  // UI Showcase View
  if (currentView === 'showcase') {
    return (
      <div className="min-h-screen bg-gray-900">
        <UIShowcase />
        
        {/* Development Navigation */}
        <div className="fixed bottom-4 left-4 z-50 flex space-x-2">
          <button
            onClick={() => setCurrentView('landing')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Landing
          </button>
          <button
            onClick={() => setCurrentView('tone-test')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Tone.js Test
          </button>
          <button
            onClick={() => setCurrentView('project-tone')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Project Tone
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setCurrentView('app')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
            >
              App Shell
            </button>
          )}
        </div>
      </div>
    );
  }

  // App Shell View - Requires Authentication
  if (currentView === 'app') {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-900">
          <AuthGateway onClose={() => {
            if (isAuthenticated) {
              // User authenticated, stay in app
              return;
            } else {
              // User cancelled, go back to landing
              setCurrentView('landing');
            }
          }} />
        </div>
      );
    }

    return (
      <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
        <AppShell />
        
        {/* Development Navigation */}
        <div className="fixed bottom-4 left-4 z-50 flex space-x-2">
          <button
            onClick={() => setCurrentView('landing')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Landing
          </button>
          <button
            onClick={() => setCurrentView('showcase')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            UI Showcase
          </button>
          <button
            onClick={() => setCurrentView('tone-test')}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Tone.js Test
          </button>
          <button
            onClick={() => setCurrentView('project-tone')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            Project Tone
          </button>
        </div>
      </div>
    );
  }

  // Tone.js Test View
  if (currentView === 'tone-test') {
    return (
      <div className="min-h-screen bg-gray-900">
        <ToneTestPage onBack={() => setCurrentView('landing')} />
      </div>
    );
  }

  // Project Tone Test View
  if (currentView === 'project-tone') {
    return (
      <div className="min-h-screen bg-gray-900">
        <ProjectTone />
      </div>
    );
  }

  return null;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;