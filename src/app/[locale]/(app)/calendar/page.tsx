"use client";

import { useMemo } from "react";
import { QueryState } from "@/components/QueryState/QueryState";
import { useLocale, useTranslations } from "next-intl";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import {
  useHistoryQuery,
  type HistoryEntry,
} from "@/features/history/useHistoryQuery";
import { HistoryCard } from "@/features/history/HistoryCard";
import styles from "./page.module.scss";

interface MonthGroup {
  key: string;
  label: string;
  entries: HistoryEntry[];
}

const MONTH_FORMATS: Record<string, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }),
  es: new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }),
};

function monthLabel(wornDate: Date, locale: string): string {
  return (MONTH_FORMATS[locale] ?? MONTH_FORMATS.en).format(wornDate);
}

function groupByMonth(entries: HistoryEntry[], locale: string): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const wornDate = new Date(entry.history.wornDate);
    const key = `${wornDate.getFullYear()}-${wornDate.getMonth()}`;
    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
    } else {
      groups.set(key, {
        key,
        label: monthLabel(wornDate, locale),
        entries: [entry],
      });
    }
  }
  return [...groups.values()];
}

export default function CalendarPage() {
  const t = useTranslations("Calendar");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { data: entries = [], isPending, isError, refetch } = useHistoryQuery();
  const groups = useMemo(() => groupByMonth(entries, locale), [entries, locale]);

  return (
    <section className={styles.page}>
      <PageHeader title={t("title")} />

      <QueryState
        isPending={isPending}
        isError={isError}
        pending={
          <div className={styles.feed}>
          <SmartSkeleton label={t("title")} />
          <SmartSkeleton label={t("title")} />
          <SmartSkeleton label={t("title")} />
        </div>
        }
        errorMessage={t("loadError")}
        retryLabel={tc("retry")}
        onRetry={() => void refetch()}
      >
      {groups.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className={styles.feed}>
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className={styles.month}>{group.label}</h2>
              <div className={styles.cards}>
                {group.entries.map((entry) => (
                  <HistoryCard
                    key={entry.history.lookId}
                    entry={entry}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      </QueryState>
    </section>
  );
}
