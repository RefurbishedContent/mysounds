import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Music, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthGatewayProps {
  onClose?: () => void;
}

const AuthGateway: React.FC<AuthGatewayProps> = ({ onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const { signIn, signUp } = useAuth();

  const addDebugInfo = (message: string) => {
    console.log('Auth Debug:', message);
    setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset state
    setError('');
    setDebugInfo([]);
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    addDebugInfo(`Starting ${isSignUp ? 'sign up' : 'sign in'} for ${email}`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Authentication request timed out after 10 seconds'));
      }, 10000);
    });

    try {
      // Race between auth operation and timeout
      if (isSignUp) {
        addDebugInfo('Calling signUp function...');
        await Promise.race([
          signUp(email, password, name),
          timeoutPromise
        ]);
        addDebugInfo('Sign up completed successfully');
      } else {
        addDebugInfo('Calling signIn function...');
        await Promise.race([
          signIn(email, password),
          timeoutPromise
        ]);
        addDebugInfo('Sign in completed successfully');
      }
      
      addDebugInfo('Authentication successful, closing dialog');
      onClose?.();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      addDebugInfo(`Authentication failed: ${errorMessage}`);
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-surface rounded-2xl max-w-md w-full p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/40">
            <Music size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Join MySounds.ai' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400">
              {isSignUp
                ? 'Create your account to start fusing songs' 
                : 'Sign in to access your projects'
              }
            </p>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo.length > 0 && (
          <div className="mb-4 p-3 bg-gray-900/50 border border-gray-600 rounded-lg">
            <div className="text-xs text-gray-400 space-y-1">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {isSignUp && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                  placeholder="Enter your name"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent focus:shadow-lg focus:shadow-cyan-500/20 transition-all duration-200"
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors duration-200"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm flex items-start space-x-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-xl hover:shadow-cyan-500/40 disabled:shadow-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setDebugInfo([]);
            }}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            disabled={loading}
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
            disabled={loading}
          >
            ×
          </button>
        )}

        {/* Connection Test */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={async () => {
              addDebugInfo('Testing Supabase connection...');
              try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                  addDebugInfo(`Connection test failed: ${error.message}`);
                } else {
                  addDebugInfo('Connection test successful');
                }
              } catch (err) {
                addDebugInfo(`Connection test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
              }
            }}
            className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors duration-200"
            disabled={loading}
          >
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthGateway;