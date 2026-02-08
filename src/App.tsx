import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGateway from './components/AuthGateway';
import AuthPage from './components/AuthPage';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import ReloadDetector from './components/ReloadDetector';
import './styles/theme.css';
import './lib/debugMonitor';
import './lib/sessionPersistence';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current && !loading && isAuthenticated) {
      setCurrentView('app');
      isInitialMount.current = false;
    } else if (!loading) {
      isInitialMount.current = false;
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto animate-pulse overflow-hidden">
            <img src="https://images.ctfassets.net/ktdj7g8bqfli/5vsEjYHOcHlGsPgxTVzBH7/6520dd25ce317298ba6d146dd368824a/Option_1.jpg" alt="MySounds.AI" className="w-full h-full object-cover" />
          </div>
          <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (currentView === 'landing') {
    return <AuthPage onAuthenticated={() => setCurrentView('app')} />;
  }

  if (currentView === 'app') {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
          <AuthGateway onClose={() => {
            if (!isAuthenticated) {
              setCurrentView('landing');
            }
          }} />
        </div>
      );
    }

    return (
      <>
        <ReloadDetector />
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
          <AppShell />
        </div>
      </>
    );
  }

  return null;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;