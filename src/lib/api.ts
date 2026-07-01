"use client";

import * as React from "react";

/**
 * API fetch helper with standardized envelope unwrapping.
 *
 * All API routes return: { success: boolean, data: T, error: null | {...}, meta: {...} }
 * This helper unwraps the `data` field for successful responses
 * and throws an Error with the error message for failures.
 *
 * See: docs/04_API_SPECIFICATION.md
 */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    const message = json?.error?.message || `Request failed: ${res.status}`;
    const error = new Error(message) as Error & { code?: string; details?: unknown; requestId?: string };
    error.code = json?.error?.code;
    error.details = json?.error?.details;
    error.requestId = json?.meta?.requestId;
    throw error;
  }

  return json.data as T;
}

/** Hydrate the active business from the server into the store on first load. */
export function useBootstrapBusiness() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api<{ business: any }>("/api/business");
        if (data.business) {
          const { useAppStore } = await import("@/lib/store");
          useAppStore.getState().setBusiness(data.business);
          useAppStore.getState().setOnboarded(true);
        } else {
          await api("/api/seed", { method: "POST" });
          const again = await api<{ business: any }>("/api/business");
          if (again.business) {
            const { useAppStore } = await import("@/lib/store");
            useAppStore.getState().setBusiness(again.business);
            useAppStore.getState().setOnboarded(true);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load business");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, error };
}
