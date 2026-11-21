import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error Caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D10] text-text-primary flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full surface-card rounded-2xl p-8 border border-rose-500/20 text-center space-y-5 shadow-elevated">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-text-primary">Something went wrong</h1>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                An unexpected interface error occurred. You can reload the page or return to your dashboard.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-left">
                  <p className="text-[11px] font-mono text-rose-300 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-glow-brand"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-text-primary text-xs font-semibold border border-white/[0.1] transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
