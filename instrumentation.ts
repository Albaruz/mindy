// instrumentation.ts
// Vercel OpenTelemetry auto-instrumentation for Next.js
// Enables: traces for Next.js server components, API routes, fetch, Supabase, Groq SDK
// View in: Vercel Dashboard → Observability → Traces

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid edge runtime issues
    import('@vercel/otel');
  }
}