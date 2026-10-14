import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle: string;
  /** Rendered above the title (e.g. the logo). */
  header?: ReactNode;
  /** Extra class for the title, for page-specific spacing. */
  titleClassName?: string;
  children: ReactNode;
}

/** Centered card shell shared by the login and password-recovery pages. */
export function AuthCard({
  title,
  subtitle,
  header,
  titleClassName,
  children,
}: AuthCardProps) {
  return (
    <section className="auth-form__page">
      <div className="auth-form__card">
        {header}
        <h1 className={cn("auth-form__title", titleClassName)}>{title}</h1>
        <p className="auth-form__subtitle">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}