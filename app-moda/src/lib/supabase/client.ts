import { createBrowserClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_FALLBACK,
  SUPABASE_URL_FALLBACK,
} from "@/constants/storage";

// Client-side Supabase client for Client Components, hooks, and event
// handlers. Session is stored in cookies so Server Components, Server
// Actions, and the proxy share the same session.
//
// Env names stay literal: Next.js only inlines statically analyzable
// process.env.X access (see constants/storage.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_FALLBACK,
  );
}
