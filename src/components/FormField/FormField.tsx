import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** id of the control inside `children`. */
  htmlFor: string;
  label: string;
  /** rounded is the slightly rounder input of the password-recovery pages. */
  shape?: "default" | "rounded";
  children: ReactNode;
}

/** Label + control wrapper; the control itself is passed as children. */
export function FormField({
  htmlFor,
  label,
  shape = "default",
  children,
}: FormFieldProps) {
  return (
    <div
      className={cn(
        "auth-form__field",
        shape === "rounded" && "auth-form__field--rounded",
      )}
    >
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}