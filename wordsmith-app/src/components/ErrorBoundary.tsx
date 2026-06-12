import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Last-resort catch so a crashing component shows a recovery screen, not a blank page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <div>
            <h1 className="font-display font-bold text-2xl text-parchment-900 m-0 mb-2">
              Something went wrong
            </h1>
            <p className="font-body text-sm text-parchment-600 m-0 mb-6">
              An unexpected error occurred. Reloading the page usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary bg-gold text-white border-none rounded-lg px-7 py-3 text-sm font-semibold cursor-pointer font-body"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
