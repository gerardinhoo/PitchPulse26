import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Link } from "react-router-dom";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("frontend.error_boundary.caught", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center py-10 animate-fade-in">
          <div className="card w-full max-w-lg p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/85">
              Something went wrong
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">We hit an unexpected app error.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Try loading this screen again, or head back home and continue from there.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Try again
              </button>
              <Link
                to="/"
                className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
