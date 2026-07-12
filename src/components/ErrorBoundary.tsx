import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * MEP-light™ — Error Boundary
 * 
 * Catches unhandled React component errors and displays a recovery UI
 * instead of crashing the entire application.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: React.Component<ErrorBoundaryProps, ErrorBoundaryState>["setState"];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleRetry = this.handleRetry.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console (and future telemetry)
    console.error("[MEP-light™ Error Boundary]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-950/50 border border-amber-800/30 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-white mb-2">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>

            {/* Message */}
            <p className="text-sm text-slate-400 mb-2">
              An unexpected error occurred in this component. Your session data
              has been preserved in local storage.
            </p>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <details className="text-left mb-6 mt-4">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition">
                  Technical details
                </summary>
                <pre className="mt-2 text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg p-3 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack?.split("\n").slice(0, 5).join("\n")}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
              {this.props.onReset && (
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-300 text-sm font-medium transition"
                >
                  <Home className="w-4 h-4" />
                  Reset App
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
