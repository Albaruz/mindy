import { useState } from "react";
import { useTranslations } from "next-intl";
import { TAG_KEY_MAX_LENGTH, TAG_VALUE_MAX_LENGTH } from "@/constants/validation";
import { Plus, X } from "lucide-react";
import styles from "./ExtraTagsEditor.module.scss";

interface ExtraTagsEditorProps {
  tags: Record<string, string>;
  onChange: (tags: Record<string, string>) => void;
}

// Coerce stored extra_tags into editable strings. Primitives render as-is;
// nested objects survive as JSON (saved back as strings).
export function toEditableTags(
  record: Record<string, unknown>,
): Record<string, string> {
  const editable: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      editable[key] = value;
    } else if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      editable[key] = String(value);
    } else if (value !== null && value !== undefined) {
      editable[key] = JSON.stringify(value);
    }
  }
  return editable;
}

// Chip editor for free-form extra tags (color_base, specificType, ...).
// Existing entries render as removable chips; the key/value row appends
// new ones. Keys are unique: re-adding a key shows a hint instead of
// silently overwriting the value.
export function ExtraTagsEditor({ tags, onChange }: ExtraTagsEditorProps) {
  const t = useTranslations("Closet");
  const ta = useTranslations("Accessibility");
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const entries = Object.entries(tags);

  const handleAdd = () => {
    const key = keyInput.trim();
    const value = valueInput.trim();
    if (key === "" || value === "") {
      setHint(t("form.tagHintEmpty"));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(tags, key)) {
      setHint(t("form.tagHintDuplicate", { key }));
      return;
    }
    setHint(null);
    onChange({ ...tags, [key]: value });
    setKeyInput("");
    setValueInput("");
  };

  const handleRemove = (key: string) => {
    setHint(null);
    const next = { ...tags };
    delete next[key];
    onChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Enter inside the tag inputs adds the tag instead of submitting
    // the surrounding garment form.
    if (event.key === "Enter") {
      event.preventDefault();
      handleAdd();
    }
  };

  return (
    <fieldset className={styles.group}>
      <legend>{t("form.extraTags")}</legend>
      {entries.length > 0 ? (
        <ul aria-label={t("form.extraTags")} className={styles.chips}>
          {entries.map(([key, value]) => (
            <li key={key} className={styles.chip}>
              <span className={styles.chipKey}>{key}</span>
              <span className={styles.chipValue}>{value}</span>
              <button
                type="button"
                aria-label={ta("removeTag", { key })}
                title={ta("removeTag", { key })}
                className={styles.removeButton}
                onClick={() => handleRemove(key)}
              >
                <X aria-hidden="true" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t("form.tagsEmpty")}</p>
      )}
      <div className={styles.addRow}>
        <input
          type="text"
          value={keyInput}
          onChange={(event) => setKeyInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("form.tagKeyPh")}
          aria-label={t("form.tagKeyPh")}
          className={styles.input}
          maxLength={TAG_KEY_MAX_LENGTH}
        />
        <input
          type="text"
          value={valueInput}
          onChange={(event) => setValueInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("form.tagValuePh")}
          aria-label={t("form.tagValuePh")}
          className={styles.input}
          maxLength={TAG_VALUE_MAX_LENGTH}
        />
        <button
          type="button"
          onClick={handleAdd}
          className={styles.addButton}
          aria-label={ta("addTag")}
          title={ta("addTag")}
        >
          <Plus aria-hidden="true" size={18} />
        </button>
      </div>
      {hint !== null ? (
        <p role="status" className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
