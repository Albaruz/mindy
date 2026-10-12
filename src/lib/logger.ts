// src/lib/logger.ts
// Structured JSON logger for Vercel (stdout -> Vercel Logs)
// Zero dependencies, works in Edge and Node.js runtimes

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  route?: string;
  userId?: string;
  requestId?: string;
  durationMs?: number;
  statusCode?: number;
  error?: Error | unknown;
  [key: string]: unknown;
}

function formatMessage(level: LogLevel, message: string, context: LogContext = {}): string {
  const timestamp = new Date().toISOString();
  const base = {
    timestamp,
    level,
    message,
    ...context,
  };

  // Serialize error properly
  if (context.error instanceof Error) {
    base.error = {
      name: context.error.name,
      message: context.error.message,
      stack: context.error.stack,
    };
  } else if (context.error) {
    base.error = String(context.error);
  }

  return JSON.stringify(base);
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info: (message: string, context?: LogContext) => {
    console.log(formatMessage('info', message, context));
  },

  warn: (message: string, context?: LogContext) => {
    console.warn(formatMessage('warn', message, context));
  },

  error: (message: string, context?: LogContext) => {
    console.error(formatMessage('error', message, context));
  },

  // Helper for API route start
  requestStart: (route: string, requestId: string, userId?: string) => {
    return logger.info(`${route} request started`, { route, requestId, userId });
  },

  // Helper for API route completion
  requestComplete: (route: string, requestId: string, statusCode: number, durationMs: number, extra?: LogContext) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${route} request completed`, { route, requestId, statusCode, durationMs, ...extra });
  },

  // Helper for external API calls (Groq, OpenWeather, Supabase)
  externalCall: (service: string, operation: string, durationMs: number, success: boolean, extra?: LogContext) => {
    logger.info(`External call: ${service}.${operation}`, {
      service,
      operation,
      durationMs,
      success,
      ...extra,
    });
  },
};

// Generate simple request ID for tracing
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}