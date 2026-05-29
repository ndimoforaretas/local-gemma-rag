import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unhandled React render errors and displays a graceful
 * fallback UI instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-full bg-[#f7f9fb] dark:bg-[#10131a] transition-colors">
          <div className="max-w-md w-full mx-4 bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-10 text-center shadow-xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-500" />
            </div>

            <h2 className="text-2xl font-bold mb-3 text-ink-strong">
              Something went wrong
            </h2>

            <p className="text-base text-ink-muted mb-6 leading-relaxed">
              An unexpected error occurred. You can try refreshing the page or
              resetting the application state.
            </p>

            {this.state.error && (
              <pre className="text-left text-xs text-red-400 bg-[#f2f4f6] dark:bg-[#0b0e15] border border-[#c2c6d6] dark:border-[#424754] rounded-xl p-4 mb-6 overflow-x-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium shadow-lg shadow-[#a855f7]/25 transition-all"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-ink font-medium transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
