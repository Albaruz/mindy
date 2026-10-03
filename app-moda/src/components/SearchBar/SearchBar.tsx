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
const DEFAULT_PLACEHOLDER = "Search by type, color, style, material…";

// Controlled search input for the closet view. State lives in the parent
// so the same query drives the client-side garment filtering.
export function SearchBar({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  id = DEFAULT_ID,
}: SearchBarProps) {
  const ta = useTranslations("Accessibility");
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
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
