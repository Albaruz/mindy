"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/Button/Button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog/Dialog";
import { QUERY_KEYS } from "@/constants/query";
import { MAX_UPLOAD_RETRIES, VISION_CONCURRENCY } from "@/constants/upload";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useUploadQueueStore, isUploadActive } from "@/stores/useUploadQueueStore";
import { requireUser } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/client";
import { toDownscaledDataUrl } from "../../../services/images/garmentImage";
import { suggestTags } from "../../../domain/garments/garmentAnalysis";
import { persistGarment } from "../../../services/persistence/garmentPersistence";
import { deleteUploadFile } from "@/lib/uploadQueueStorage";
import { logger } from "@/lib/logger";
import { PhotoQualityDialog } from "../photo-quality-dialog/PhotoQualityDialog";
import type { InferredTags } from "@/types/garment";
import type { UploadQueueItem } from "@/types/upload";
import styles from "./UploadQueueManager.module.scss";

const activeQueueItems = new Set<string>();

function blocksCompletion(status: UploadQueueItem["status"]): boolean {
  return status !== "completed" && status !== "cancelled" && status !== "failed";
}

function advanceItemProgress(
  updateItem: (id: string, patch: Partial<UploadQueueItem>) => void,
  id: string,
  progress: number,
  patch: Partial<UploadQueueItem> = {},
): void {
  const current = useUploadQueueStore
    .getState()
    .items.find((item) => item.id === id);
  updateItem(id, {
    ...patch,
    progress: Math.max(current?.progress ?? 0, progress),
  });
}

function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "default") {
    return;
  }
  if (window.localStorage.getItem("mindy-upload-notification-prompted") === "1") {
    return;
  }
  window.localStorage.setItem("mindy-upload-notification-prompted", "1");
  void Notification.requestPermission();
}

function sendCompletionNotification(title: string, body: string): void {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(title, { body });
  }
}

interface UploadQueuePanelProps {
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onReview: (id: string) => void;
  onCompletedItemExit: (id: string) => void;
}

function UploadQueuePanel({
  onRetry,
  onCancel,
  onReview,
  onCompletedItemExit,
}: UploadQueuePanelProps) {
  const t = useTranslations("UploadQueue");
  const items = useUploadQueueStore((state) => state.items);
  const progress = useUploadQueueStore((state) => state.progressCeiling);
  const isDetailsOpen = useUploadQueueStore((state) => state.isDetailsOpen);
  const setDetailsOpen = useUploadQueueStore((state) => state.setDetailsOpen);
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const knownStatuses = useRef(new Map<string, UploadQueueItem["status"]>());
  const hasMounted = useRef(false);
  const completionTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const completedNow = hasMounted.current
      ? items.filter(
          (item) =>
            item.status === "completed" &&
            knownStatuses.current.get(item.id) !== "completed",
        )
      : [];
    if (completedNow.length > 0) {
      setExitingIds((ids) => [...new Set([...ids, ...completedNow.map((item) => item.id)])]);
      completedNow.forEach((item) => {
        if (completionTimers.current.has(item.id)) {
          return;
        }
        const timer = window.setTimeout(() => {
          completionTimers.current.delete(item.id);
          setExitingIds((ids) => ids.filter((id) => id !== item.id));
          onCompletedItemExit(item.id);
        }, 650);
        completionTimers.current.set(item.id, timer);
      });
    }
    knownStatuses.current = new Map(items.map((item) => [item.id, item.status]));
    hasMounted.current = true;
  }, [items, onCompletedItemExit]);

  useEffect(
    () => () => {
      completionTimers.current.forEach((timer) => window.clearTimeout(timer));
      completionTimers.current.clear();
    },
    [],
  );

  const displayItems = items.filter(
    (item) => isUploadActive(item.status) || exitingIds.includes(item.id),
  );

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles["upload-queue-manager__indicator"]}
        aria-label={t("openPanel", { progress })}
        aria-expanded={isDetailsOpen}
        onClick={() => setDetailsOpen(true)}
      >
        <span className={styles["upload-queue-manager__indicator-icon"]} aria-hidden="true">
          <ImageIcon size={18} />
        </span>
        <span className={styles["upload-queue-manager__indicator-progress"]}>{progress}%</span>
        <span className={styles["upload-queue-manager__indicator-bar"]} aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      </button>

      {isDetailsOpen ? (
        <Dialog
          labelledBy="upload-queue-title"
          onClose={() => setDetailsOpen(false)}
          overlayClassName={styles["upload-queue-manager__overlay"]}
          className={styles["upload-queue-manager__dialog"]}
        >
          <DialogHeader className={styles["upload-queue-manager__header"]}>
            <DialogTitle id="upload-queue-title">{t("title")}</DialogTitle>
            <DialogClose
              label={t("close")}
              onClick={() => setDetailsOpen(false)}
            />
          </DialogHeader>
          <DialogBody className={styles["upload-queue-manager__body"]}>
            <p className={styles["upload-queue-manager__summary"]} role="status" aria-live="polite">
              {t("summary", { progress })}
            </p>
            <ul className={styles["upload-queue-manager__list"]}>
              {displayItems.map((item) => (
                <li
                  className={`${styles["upload-queue-manager__item"]} ${item.status === "completed" ? styles["upload-queue-manager__item--completed"] : ""}`}
                  key={item.id}
                >
                  {item.previewUrl ? (
                    // Object URLs are local previews and cannot be optimized by next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      aria-hidden="true"
                      className={styles["upload-queue-manager__thumbnail"]}
                    />
                  ) : (
                    <span className={styles["upload-queue-manager__thumbnail-placeholder"]} aria-hidden="true">
                      <ImageIcon size={18} />
                    </span>
                  )}
                  <div className={styles["upload-queue-manager__item-progress"]}>
                    <span
                      className={styles["upload-queue-manager__progress-track"]}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress}
                      aria-label={t("itemProgress", {
                        name: item.fileName,
                        progress: item.progress,
                      })}
                    >
                      <span
                        className={styles["upload-queue-manager__progress-fill"]}
                        style={{ width: `${item.progress}%` }}
                      />
                    </span>
                    <span aria-hidden="true">{item.progress}%</span>
                  </div>
                  <div className={styles["upload-queue-manager__actions"]}>
                    {item.status === "failed" ? (
                      <button
                        type="button"
                        className={styles["upload-queue-manager__action"]}
                        aria-label={t("retryItem", { name: item.fileName })}
                        onClick={() => onRetry(item.id)}
                      >
                        <RotateCcw size={18} aria-hidden="true" />
                      </button>
                    ) : null}
                    {item.status === "awaiting_review" ? (
                      <Button type="button" variant="secondary" onClick={() => onReview(item.id)}>
                        {t("review")}
                      </Button>
                    ) : null}
                    {item.status !== "completed" ? (
                      <button
                        type="button"
                        className={styles["upload-queue-manager__action"]}
                        aria-label={t("cancelItem", { name: item.fileName })}
                        onClick={() => onCancel(item.id)}
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <DialogActions>
              <Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>
                {t("close")}
              </Button>
            </DialogActions>
          </DialogFooter>
        </Dialog>
      ) : null}
    </>
  );
}

export function UploadQueueManager() {
  const locale = useLocale();
  const t = useTranslations("Notifications");
  const tq = useTranslations("UploadQueue");
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const items = useUploadQueueStore((state) => state.items);
  const hydrated = useUploadQueueStore((state) => state.hydrated);
  const processingVersion = useUploadQueueStore((state) => state.processingVersion);
  const hydrate = useUploadQueueStore((state) => state.hydrate);
  const updateItem = useUploadQueueStore((state) => state.updateItem);
  const getFile = useUploadQueueStore((state) => state.getFile);
  const removeItem = useUploadQueueStore((state) => state.removeItem);
  const setReviewItem = useUploadQueueStore((state) => state.setReviewItem);
  const bumpProcessingVersion = useUploadQueueStore(
    (state) => state.bumpProcessingVersion,
  );
  const reviewItemId = useUploadQueueStore((state) => state.reviewItemId);
  const reviewItem = items.find((item) => item.id === reviewItemId) ?? null;
  const [lastCompletionCount, setLastCompletionCount] = useState(0);
  const previousActiveCount = useRef(0);
  const promptedReviewId = useRef<string | null>(null);
  const previousStatuses = useRef(new Map<string, UploadQueueItem["status"]>());

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const save = useCallback(
    async (source: Blob, tags: InferredTags, id: string) => {
      const supabase = createClient();
      const user = await requireUser(supabase, "You must be signed in to add garments.");
      await persistGarment(source, tags, {
        client: supabase,
        userId: user.id,
        invalidateGarments: () =>
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.garments }),
        onProgress: () => undefined,
        progressResizing: t("uploadResizing"),
        progressUploading: t("uploadUploading"),
        isCancelled: () =>
          !useUploadQueueStore
            .getState()
            .items.some((item) => item.id === id && item.status === "saving"),
      });
      updateItem(id, { status: "completed", stage: "done", progress: 100 });
      // The garment row is committed. IDB cleanup is best-effort so a storage
      // failure cannot requeue the item and insert a duplicate garment.
      try {
        await deleteUploadFile(id);
      } catch (error) {
        // The completed queue entry will be cleaned up by the normal exit flow.
        logger.warn("Completed upload file cleanup failed", { uploadId: id, error });
      }
    },
    [queryClient, t, updateItem],
  );

  const finishWithTags = useCallback(
    async (item: UploadQueueItem, file: File, tags: InferredTags) => {
      advanceItemProgress(updateItem, item.id, 80, {
        status: "saving",
        stage: "saving",
        error: null,
        cutoutFailed: false,
      });
      const currentItem = useUploadQueueStore
        .getState()
        .items.find((candidate) => candidate.id === item.id);
      if (currentItem === undefined || currentItem.status === "cancelled") {
        return;
      }
      await save(file, tags, item.id);
    },
    [save, updateItem],
  );

  const processItem = useCallback(
    async (item: UploadQueueItem) => {
      const file = await getFile(item.id);
      if (file === undefined) {
        advanceItemProgress(updateItem, item.id, 0, {
          status: "failed",
          stage: "done",
          error: tq("missingFile"),
        });
        return;
      }
      try {
        advanceItemProgress(updateItem, item.id, 5, {
          status: "validating",
          stage: "validation",
          error: null,
        });
        const imageData = await toDownscaledDataUrl(file);
        advanceItemProgress(updateItem, item.id, 25, {
          status: "analyzing",
          stage: "analysis",
        });
        const tags = await suggestTags(
          imageData,
          locale === "es" ? "es" : "en",
          { throwOnError: true },
        );
        advanceItemProgress(updateItem, item.id, 50, { tags });
        if (tags.cutoutDifficulty === "hard") {
          advanceItemProgress(updateItem, item.id, 50, {
            status: "awaiting_review",
            stage: "review",
            qualityNote: tags.qualityNote || null,
          });
          return;
        }
        // Keep the original by default. Background removal is only started
        // after an explicit choice in the quality review.
        await finishWithTags(item, file, tags);
      } catch (error) {
        const attempts = item.attempts + 1;
        if (attempts <= MAX_UPLOAD_RETRIES) {
          advanceItemProgress(updateItem, item.id, 0, {
            status: "queued",
            stage: "validation",
            attempts,
            error: null,
          });
        } else {
          advanceItemProgress(updateItem, item.id, 0, {
            status: "failed",
            stage: "done",
            attempts,
            error: error instanceof Error ? error.message : tq("failed"),
          });
        }
      }
    },
    [finishWithTags, getFile, locale, tq, updateItem],
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const next = items
      .filter(
        (item) =>
          item.status === "queued" && !activeQueueItems.has(item.id),
      )
      .slice(0, VISION_CONCURRENCY);
    if (next.length === 0) {
      const waiting = items.find((item) => item.status === "awaiting_review");
      if (
        waiting !== undefined &&
        reviewItemId === null &&
        promptedReviewId.current !== waiting.id
      ) {
        promptedReviewId.current = waiting.id;
        setReviewItem(waiting.id);
      }
      return;
    }
    next.forEach((item) => activeQueueItems.add(item.id));
    void Promise.all(next.map((item) => processItem(item))).finally(() => {
      next.forEach((item) => activeQueueItems.delete(item.id));
      bumpProcessingVersion();
    });
  }, [
    bumpProcessingVersion,
    hydrated,
    items,
    processItem,
    processingVersion,
    reviewItemId,
    setReviewItem,
  ]);

  useEffect(() => {
    const failedNow = items.filter(
      (item) =>
        item.status === "failed" &&
        previousStatuses.current.get(item.id) !== "failed",
    );
    if (failedNow.length > 0) {
      addNotification(
        "error",
        failedNow.length === 1
          ? tq("failedToast")
          : tq("failedToastCount", { count: failedNow.length }),
      );
    }

    const activeCount = items.filter((item) => blocksCompletion(item.status)).length;
    if (activeCount > 0 && previousActiveCount.current === 0) {
      requestNotificationPermission();
    }
    if (activeCount === 0 && previousActiveCount.current > 0) {
      const completedCount = items.filter((item) => item.status === "completed").length;
      if (completedCount > lastCompletionCount) {
        const failedCount = items.filter((item) => item.status === "failed").length;
        sendCompletionNotification(
          tq("notificationTitle"),
          failedCount > 0 ? tq("notificationBodyWithFailures", { count: failedCount }) : tq("notificationBody"),
        );
        if (failedCount === 0) {
          addNotification("success", tq("completedToast"));
        }
      }
      setLastCompletionCount(completedCount);
    }
    previousStatuses.current = new Map(
      items.map((item) => [item.id, item.status]),
    );
    previousActiveCount.current = activeCount;
  }, [addNotification, items, lastCompletionCount, tq]);

  const retry = useCallback(
    (id: string) => updateItem(id, { status: "queued", stage: "validation", attempts: 0, error: null }),
    [updateItem],
  );

  const review = useCallback((id: string) => setReviewItem(id), [setReviewItem]);

  const resolveReview = useCallback(
    async () => {
      if (reviewItem === null || reviewItem.tags === null) {
        return;
      }
      const file = await getFile(reviewItem.id);
      if (file === undefined) {
        updateItem(reviewItem.id, { status: "failed", stage: "done", progress: 100, error: tq("missingFile") });
        setReviewItem(null);
        return;
      }
      setReviewItem(null);
      try {
        await finishWithTags(reviewItem, file, reviewItem.tags);
      } catch (error) {
        updateItem(reviewItem.id, {
          status: "awaiting_review",
          stage: "review",
          error: error instanceof Error ? error.message : tq("failed"),
          cutoutFailed: false,
        });
        setReviewItem(reviewItem.id);
      }
    },
    [finishWithTags, getFile, reviewItem, setReviewItem, tq, updateItem],
  );

  const cancel = useCallback((id: string) => void removeItem(id), [removeItem]);

  const activeItems = useMemo(
    () => items.filter((item) => isUploadActive(item.status)),
    [items],
  );

  return (
    <>
      <UploadQueuePanel
        onRetry={retry}
        onCancel={cancel}
        onReview={review}
        onCompletedItemExit={removeItem}
      />
      {reviewItem !== null && reviewItem.tags !== null ? (
        <PhotoQualityDialog
          qualityNote={reviewItem.qualityNote}
           isWorking={reviewItem.status === "saving"}
           progressNote={null}
           onUseOriginal={() => void resolveReview()}
          onChangePhoto={() => void removeItem(reviewItem.id)}
          onClose={() => setReviewItem(null)}
        />
      ) : null}
      {activeItems.length > 0 ? <span className={styles["upload-queue-manager__live-region"]} role="status" aria-live="polite" /> : null}
    </>
  );
}

export function enqueueUploadFiles(files: File[]): Promise<string[]> {
  return useUploadQueueStore.getState().enqueue(files);
}
