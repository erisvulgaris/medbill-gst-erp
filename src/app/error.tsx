"use client";

/**
 * Next.js App Router error boundary.
 * Catches errors thrown during render of any route segment.
 * Must be a client component.
 * See: FRONTEND_AUDIT.md §5.2
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="grid place-items-center w-16 h-16 rounded-2xl bg-red-500/12 text-red-600 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Application error</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            A critical error occurred. Please try reloading.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-left text-[11px] bg-muted/60 rounded-lg p-3 overflow-x-auto font-mono text-destructive border border-border/50 max-h-48 overflow-y-auto">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Try again
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/")} className="gap-1.5">
            Reload app
          </Button>
        </div>
      </div>
    </div>
  );
}
