"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { applyThemeMode, useThemeStore } from "@/features/settings/state/theme-store/themeStore";
import { PERSISTED_CACHE_KEY } from "@/constants/storage";
import {
  QUERY_NETWORK_MODE,
  QUERY_PERSIST_MAX_AGE_MS,
  QUERY_REFETCH_ON_FOCUS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
} from "@/constants/query";

// IndexedDB key for the persisted TanStack Query cache. Re-exported from
// centralized constants for backward compatibility (sign-out cleanup).
export { PERSISTED_CACHE_KEY };

export function Providers({ children }: { children: ReactNode }) {
  const themeMode = useThemeStore((state) => state.mode);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: QUERY_STALE_TIME_MS,
            retry: QUERY_RETRY_COUNT,
            refetchOnWindowFocus: QUERY_REFETCH_ON_FOCUS,
            // Serve persisted cache while offline: a failed background
            // refetch keeps stale data instead of wiping the closet.
            networkMode: QUERY_NETWORK_MODE,
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

  // Hydrate theme store from localStorage on app initialization.
  // This ensures the store reflects the user's saved preference from
  // the start, not just when visiting the Settings page.
  useEffect(() => {
    useThemeStore.getState().hydrate();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: QUERY_PERSIST_MAX_AGE_MS,
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
