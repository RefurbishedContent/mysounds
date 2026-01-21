import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGateway from './components/AuthGateway';
import AppShell from './components/AppShell';
import LandingPage from './components/LandingPage';
import './styles/theme.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');
  const [showAuthGateway, setShowAuthGateway] = useState(false);

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