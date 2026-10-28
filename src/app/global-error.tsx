"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/i18n/routing";

// Last-resort crash page: replaces the root layout, so no providers,
// styles, or translations are available. Copy is inline and bilingual,
// defaulting to English (the routing defaultLocale).
const COPY = {
  es: {
    title: "Algo salió mal",
    message: "La aplicación no se pudo cargar. Inténtalo de nuevo.",
    retry: "Reintentar",
  },
  en: {
    title: "Something went wrong",
    message: "The app could not be loaded. Please try again.",
    retry: "Retry",
  },
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale] = useState<AppLocale>(() =>
    typeof document === "undefined" ||
    document.documentElement.lang !== "es"
      ? "en"
      : "es",
  );
  useEffect(() => {
    console.error("Global boundary caught render failure", error);
  }, [error]);
  const copy = COPY[locale];
  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f9f6f0",
          color: "#4a3f39",
        }}
      >
        <div role="alert" style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>{copy.title}</h1>
          <p>{copy.message}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "#c87966",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {copy.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
