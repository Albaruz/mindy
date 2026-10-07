"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { applyThemeMode, useThemeStore } from "@/features/settings/themeStore";

export const PERSISTED_CACHE_KEY = "mindy-query-cache";
const PERSISTED_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function Providers({ children }: { children: ReactNode }) {
  const themeMode = useThemeStore((state) => state.mode);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
            // Serve persisted cache while offline: a failed background
            // refetch keeps stale data instead of wiping the closet.
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  // IndexedDB persister is created lazily and only touched on the client
  // (restore runs in an effect), so server rendering stays untouched.
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: PERSISTED_CACHE_KEY,
      storage: {
        getItem: (key) => get(key),
        setItem: (key, value) => set(key, value),
        removeItem: (key) => del(key),
      },
    }),
  );

  // Re-apply the stored theme pin after hydration (the inline head
  // script already set it pre-paint to avoid a flash).
  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSISTED_MAX_AGE_MS,
        dehydrateOptions: {
          // Persist successful server state only (closet, history,
          // basket, profile); never errors or mutations.
          shouldDehydrateQuery: (query) =>
            query.state.status === "success",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
