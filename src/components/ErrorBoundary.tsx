import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    if (window.debugMonitor) {
      window.debugMonitor.logError('React Error Boundary', error, {
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                <p className="text-sm text-gray-400">We caught an error to prevent the app from reloading</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm font-mono text-red-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg font-medium transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200"
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  Component Stack
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 rounded p-3 overflow-auto max-h-64 text-gray-400">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
