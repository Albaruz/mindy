"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.scss";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  showPasswordLabel: string;
  hidePasswordLabel: string;
};

// Password field with an inlined eye toggle. The parent form keeps styling
// the inner input through its own `.field input` rules; this wrapper only
// positions the toggle. State is local: forms read the value on submit.
export function PasswordInput({
  showPasswordLabel,
  hidePasswordLabel,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={styles.wrapper}>
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-label={visible ? hidePasswordLabel : showPasswordLabel}
        className={styles.toggle}
      >
        {visible ? (
          <EyeOff aria-hidden="true" size={20} strokeWidth={1.75} />
        ) : (
          <Eye aria-hidden="true" size={20} strokeWidth={1.75} />
        )}
      </button>
    </span>
  );
}
