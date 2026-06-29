"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Error boundary for view-level crashes.
 * Catches render errors in children and shows a recovery UI
 * instead of whitescreening the entire app.
 *
 * Usage: wrap each lazy-loaded view in <ErrorBoundary>.
 * See: FRONTEND_AUDIT.md §5.2
 */
interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console (replace with structured logger in production)
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="grid place-items-center w-16 h-16 rounded-2xl bg-red-500/12 text-red-600 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            An unexpected error occurred while rendering this view.
          </p>
        </div>
        {isDev && (
          <pre className="text-left text-[11px] bg-muted/60 rounded-lg p-3 overflow-x-auto font-mono text-destructive border border-border/50">
            {error.message}
            {error.stack && "\n\n" + error.stack.slice(0, 500)}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
          <Button
            size="sm"
            onClick={() => {
              reset();
              window.location.href = "/";
            }}
            className="gap-1.5"
          >
            <Home className="w-4 h-4" /> Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
