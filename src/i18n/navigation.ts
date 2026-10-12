import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation primitives for client components.
// Use these instead of next/link and next/navigation so route changes
// keep the locale prefix and update the NEXT_LOCALE cookie.
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
