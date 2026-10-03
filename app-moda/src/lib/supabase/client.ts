import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client for Client Components, hooks, and event
// handlers. Session is stored in cookies so Server Components, Server
// Actions, and the proxy share the same session.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon-placeholder",
  );
}
