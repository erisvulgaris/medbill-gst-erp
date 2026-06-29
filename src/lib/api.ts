"use client";

import * as React from "react";

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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
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
          // dynamically import store to avoid SSR issues
          const { useAppStore } = await import("@/lib/store");
          useAppStore.getState().setBusiness(data.business);
          useAppStore.getState().setOnboarded(true);
        } else {
          // try seed
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
