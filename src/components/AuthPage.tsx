import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  onAuthenticated: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { signIn, signUp, resetPassword, updatePassword, passwordRecovery, clearPasswordRecovery } = useAuth();

  useEffect(() => {
    if (passwordRecovery) {
      setView('reset');
      setError('');
    }
  }, [passwordRecovery]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000);
    });

    try {
      await Promise.race([signIn(email, password), timeoutPromise]);
      onAuthenticated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. If you don\'t have an account, click "Sign up" below.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000);
    });

    try {
      await Promise.race([signUp(email, password, name), timeoutPromise]);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setResetSuccess(true);
      setTimeout(() => {
        onAuthenticated();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError('');
    setResetEmailSent(false);
    setResetSuccess(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const renderHeader = () => {
    let title = '';
    let subtitle = '';

    switch (view) {
      case 'login':
        title = 'MySounds.AI';
        subtitle = 'Sign in to continue';
        break;
      case 'signup':
        title = 'MySounds.AI';
        subtitle = 'Create your account';
        break;
      case 'forgot':
        title = 'Reset Password';
        subtitle = 'Enter your email to receive a reset link';
        break;
      case 'reset':
        title = 'New Password';
        subtitle = 'Enter your new password below';
        break;
    }

    return (
      <div className="text-center mb-8">
        {(view === 'login' || view === 'signup') && (
          <div className="w-20 h-20 rounded-xl flex items-center justify-center mx-auto shadow-lg overflow-hidden" style={{ boxShadow: '0 0 30px rgba(6,182,212,0.3)' }}>
            <img src="https://images.ctfassets.net/ktdj7g8bqfli/5vsEjYHOcHlGsPgxTVzBH7/01fa743c4568d87307c57ec1127492d1/ChatGPT_Image_Feb_7__2026__08_34_18_PM.png" alt="MySounds.AI" className="w-full h-full object-cover" />
          </div>
        )}
        {view === 'forgot' && (
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-1" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Mail size={28} className="text-cyan-400" />
          </div>
        )}
        {view === 'reset' && (
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-1" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <KeyRound size={28} className="text-cyan-400" />
          </div>
        )}
        <h1 className="text-xl font-bold text-white mt-5">{title}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg text-sm text-red-300 bg-red-900/30 border border-red-800/50">
        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  };

  const renderSubmitButton = (label: string) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
      style={{ boxShadow: loading ? 'none' : '0 0 20px rgba(6,182,212,0.25)' }}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span>{label}</span>
          <ArrowRight size={16} />
        </>
      )}
    </button>
  );

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
          placeholder="Email address"
          disabled={loading}
        />
      </div>

      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
          placeholder="Password"
          disabled={loading}
          minLength={6}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          disabled={loading}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => switchView('forgot')}
          className="text-xs transition-colors hover:text-cyan-400"
          style={{ color: 'var(--text-tertiary)' }}
          disabled={loading}
        >
          Forgot password?
        </button>
      </div>

      {renderError()}
      {renderSubmitButton('Sign In')}
    </form>
  );

  const renderSignUpForm = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="relative">
        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
          placeholder="Full name"
          disabled={loading}
        />
      </div>

      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
          placeholder="Email address"
          disabled={loading}
        />
      </div>

      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
          placeholder="Password"
          disabled={loading}
          minLength={6}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          disabled={loading}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {renderError()}
      {renderSubmitButton('Create Account')}
    </form>
  );

  const renderForgotForm = () => {
    if (resetEmailSent) {
      return (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-green-900/20 border border-green-800/40">
            <CheckCircle size={32} className="text-green-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-green-300">Reset link sent!</p>
              <p className="text-xs text-gray-400 mt-1">
                Check your inbox at <span className="text-white font-medium">{email}</span> for a password reset link.
              </p>
            </div>
          </div>
          <div className="space-y-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <p className="font-medium text-gray-400">If you don't see the email:</p>
            <ul className="space-y-1.5 pl-4 list-disc">
              <li>Check your spam/junk folder</li>
              <li>Look for an email from <span className="text-gray-300">noreply@mail.app.supabase.io</span></li>
              <li>Wait a few minutes -- delivery can take up to 5 minutes</li>
              <li>Supabase limits reset emails to 3 per hour</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setResetEmailSent(false)}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:bg-white/5"
            style={{ border: '1px solid var(--border-secondary)' }}
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
            placeholder="Email address"
            disabled={loading}
          />
        </div>

        {renderError()}
        {renderSubmitButton('Send Reset Link')}
      </form>
    );
  };

  const renderResetForm = () => {
    if (resetSuccess) {
      return (
        <div className="flex flex-col items-center gap-3 p-5 rounded-lg bg-green-900/20 border border-green-800/40">
          <CheckCircle size={36} className="text-green-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-green-300">Password updated!</p>
            <p className="text-xs text-gray-400 mt-1">Signing you in...</p>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
            placeholder="New password"
            disabled={loading}
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-secondary)' }}
            placeholder="Confirm new password"
            disabled={loading}
            minLength={6}
          />
        </div>

        {renderError()}
        {renderSubmitButton('Update Password')}
      </form>
    );
  };

  const renderFooter = () => {
    if (view === 'reset') return null;

    if (view === 'forgot') {
      return (
        <div className="mt-6 text-center">
          <button
            onClick={() => switchView('login')}
            className="text-sm transition-colors inline-flex items-center gap-1.5"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            disabled={loading}
          >
            <ArrowLeft size={14} />
            Back to sign in
          </button>
        </div>
      );
    }

    return (
      <div className="mt-6 text-center">
        <button
          onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          disabled={loading}
        >
          {view === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="absolute w-[480px] h-[480px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, #3b82f6 60%, transparent 100%)' }}
      />

      <div className="glass-surface rounded-2xl max-w-sm w-full p-8 animate-fade-in relative z-10">
        {renderHeader()}
        {view === 'login' && renderLoginForm()}
        {view === 'signup' && renderSignUpForm()}
        {view === 'forgot' && renderForgotForm()}
        {view === 'reset' && renderResetForm()}
        {renderFooter()}
      </div>
    </div>
  );
};

export default AuthPage;
