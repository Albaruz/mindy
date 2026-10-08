import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import styles from "./SearchBar.module.scss";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

const DEFAULT_ID = "garment-search";

// Controlled search input for the closet view. State lives in the parent
// so the same query drives the client-side garment filtering.
// The placeholder defaults to the translated closet hint (no hardcoded copy).
export function SearchBar({
  value,
  onChange,
  placeholder,
  id = DEFAULT_ID,
}: SearchBarProps) {
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  const resolvedPlaceholder = placeholder ?? t("searchPlaceholder");
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.wrapper}>
      <Search aria-hidden="true" size={20} className={styles.icon} />
      <input
        id={id}
        type="search"
        aria-label={ta("searchGarments")}
        autoComplete="off"
        className={styles.input}
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
