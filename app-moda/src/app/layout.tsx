import type { ReactNode } from "react";

// Minimal root layout: locale-prefixed pages render their own <html>
// inside [locale]/layout.tsx, so this shell only forwards children.
// API and auth-callback routes also render through here.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
