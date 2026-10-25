import type { HistoryEntry } from "../../hooks/queries/useHistoryQuery";
import { useLocale, useTranslations } from "next-intl";
import { GarmentImage } from "@/components/GarmentImage/GarmentImage";
import { useGarmentTranslator } from "@/lib/translateGarment";
import styles from "./HistoryCard.module.scss";

const DAY_FORMATS: Record<string, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  es: new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

export function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const t = useTranslations("Calendar");
  const locale = useLocale();
  const { translate, translateDetail } = useGarmentTranslator();
  const wornDate = new Date(entry.history.wornDate);
  const dayLabel = (DAY_FORMATS[locale] ?? DAY_FORMATS.en).format(wornDate);

  return (
    <article className={styles["history-card"]}>
      <h3 className={styles["history-card__date"]}>
        {dayLabel}
        {entry.history.isPlanned ? (
          <span className={styles["history-card__planned"]}>
            {t("planned")}
          </span>
        ) : null}
      </h3>
      {entry.garments.length > 0 ? (
        <ul className={styles["history-card__strip"]}>
          {entry.garments.map((garment) => (
            <li key={garment.garmentId} className={styles["history-card__thumb"]}>
              <GarmentImage
                src={garment.imageUrl}
                alt={
                    translate(garment.garmentType, "type") ??
                    translateDetail(
                      typeof garment.extraTags.specificType === "string"
                        ? garment.extraTags.specificType
                        : null,
                    ) ??
                    t("garmentFallback")
                  }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles["history-card__unavailable"]}>
          {t("unavailable")}
        </p>
      )}
    </article>
  );
}
