import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import i18n from '../../utils/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary.
 *
 * Catches render-time exceptions in any child subtree so the whole app does
 * not crash to a blank white screen. The fallback offers a reload and a
 * "back home" action. Non-render errors (async, event handlers) are NOT
 * caught here — those should be handled at the call site.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No external telemetry is configured; keep a console trace for debugging.
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleHome = (): void => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onReload={this.handleReload} onHome={this.handleHome} />;
  }
}

function ErrorFallback({ onReload, onHome }: { onReload: () => void; onHome: () => void }) {
  const goHome = () => {
    onHome();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-[20px] p-8 w-[420px] max-w-[calc(100vw-32px)] text-center shadow-[0_20px_60px_rgba(15,23,42,0.08),0_0_0_1px_rgba(226,232,240,0.6)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400" />
        </div>
        <h2 className="mb-1.5 text-lg font-semibold text-gray-800 dark:text-gray-100">
          {i18n.t('errorBoundary.title', { ns: 'common' })}
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {i18n.t('errorBoundary.description', { ns: 'common' })}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReload}
            className="inline-flex items-center gap-2 rounded-[10px] bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 hover:shadow-md active:scale-[0.98]"
          >
            <RotateCw className="h-4 w-4" />
            {i18n.t('reload', { ns: 'common' })}
          </button>
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 rounded-[10px] bg-slate-100 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-slate-200 active:scale-[0.98] dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Home className="h-4 w-4" />
            {i18n.t('button.backHome', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  );
}
