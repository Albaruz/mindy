"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Camera, ImagePlus, Plus } from "lucide-react";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { CelebrationBurst } from "@/components/BottomActionBar/BottomActionBar";
import { ProcessingOverlay } from "@/components/ProcessingOverlay/ProcessingOverlay";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import {
  FilterChips,
  type CategoryFilter,
} from "@/components/FilterChips/FilterChips";
import type { Garment } from "@/types/garment";
import { useClosetQuery } from "@/features/closet/useClosetQuery";
import {
  filterGarmentsByCategory,
  filterGarmentsBySearch,
} from "@/features/closet/searchGarments";
import { useUploadGarment } from "@/features/closet/useUploadGarment";
import { useUpdateGarment } from "@/features/closet/useUpdateGarment";
import { useDeleteGarment } from "@/features/closet/useDeleteGarment";
import { useWashGarment } from "@/features/closet/useWashGarment";
import { useDoLaundry } from "@/features/profile/useDoLaundry";
import { CELEBRATION_BURST_MS } from "@/constants/animations";
import type { GarmentFormInput } from "@/features/closet/useUploadGarment";
import { toEditableTags } from "@/features/closet/ExtraTagsEditor";
import { useGarmentTranslator } from "@/lib/translateGarment";
import { isLaundryExemptGarment } from "@/features/generator/categorizeGarments";
import { GarmentCard } from "@/features/closet/GarmentCard";
import { GarmentFormModal } from "@/features/closet/GarmentFormModal";
import { PhotoQualityDialog } from "@/features/closet/PhotoQualityDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import styles from "./page.module.scss";

type InventoryView = "clean" | "dirty";

function toFormInput(garment: Garment): GarmentFormInput {
  return {
    garmentType: garment.garmentType ?? "",
    season: garment.season ?? "",
    color: garment.color ?? "",
    material: garment.material ?? "",
    style: garment.style ?? "",
    cutLength: garment.cutLength ?? "",
    extraTags: toEditableTags(garment.extraTags),
  };
}

export default function ClosetPage() {
  const t = useTranslations("Closet");
  const tc = useTranslations("Common");
  const ta = useTranslations("Accessibility");
  const { translate } = useGarmentTranslator();
  const { data: garments = [], isPending, isError, refetch } = useClosetQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [inventoryView, setInventoryView] = useState<InventoryView>("clean");
  // Deferred query keeps the input responsive while the grid filters.
  const deferredQuery = useDeferredValue(searchQuery);
  // Unified inventory: clean garments vs the laundry basket (dirty and
  // not laundry-exempt, mirroring the basket query). Search and category
  // filters apply on top of the active view.
  const cleanGarments = useMemo(
    () =>
      garments.filter(
        (garment) => !garment.isDirty || isLaundryExemptGarment(garment),
      ),
    [garments],
  );
  const dirtyGarments = useMemo(
    () =>
      garments.filter(
        (garment) => garment.isDirty && !isLaundryExemptGarment(garment),
      ),
    [garments],
  );
  const washableGarments = useMemo(
    () => garments.filter((garment) => !isLaundryExemptGarment(garment)),
    [garments],
  );
  const allWashableGarmentsAreDirty =
    washableGarments.length > 0 &&
    washableGarments.every((garment) => garment.isDirty);
  const baseGarments = inventoryView === "clean" ? cleanGarments : dirtyGarments;
  // Strict category prefilter first, then the strict text search on top.
  const filteredGarments = useMemo(
    () =>
      filterGarmentsBySearch(
        filterGarmentsByCategory(baseGarments, activeCategory),
        deferredQuery,
      ),
    [baseGarments, activeCategory, deferredQuery],
  );
  const total = baseGarments.length;
  const upload = useUploadGarment();
  const updateGarment = useUpdateGarment();
  const deleteGarment = useDeleteGarment();
  const washGarment = useWashGarment();
  const doLaundry = useDoLaundry();
  const [deletingGarmentId, setDeletingGarmentId] = useState<string | null>(
    null,
  );
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Garment | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const sourceMenuRef = useRef<HTMLDivElement | null>(null);
  // Optimistic wash: cards shrink away instantly while the mutation
  // lands; a failure puts the card back.
  const [washingGarmentIds, setWashingGarmentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [laundryBurstKey, setLaundryBurstKey] = useState(0);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Keep keyboard focus inside the modal source sheet until it closes.
  useEffect(() => {
    if (!isSourceMenuOpen) {
      return;
    }
    const dialog = sourceMenuRef.current;
    const getFocusableButtons = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ??
          [],
      );
    getFocusableButtons()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSourceMenuOpen(false);
        fabRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableButtons();
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        return;
      }

      const activeElement = document.activeElement;
      if (!dialog?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSourceMenuOpen]);

  // Clear the celebration burst timer on unmount.
  useEffect(
    () => () => {
      if (burstTimerRef.current !== null) {
        clearTimeout(burstTimerRef.current);
      }
    },
    [],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file !== undefined) {
      void upload.processPhoto(file);
    }
  };

  const handleUpdate = (input: GarmentFormInput) => {
    if (editingGarment !== null) {
      updateGarment.mutate(
        { garmentId: editingGarment.garmentId, input },
        { onSuccess: () => setEditingGarment(null) },
      );
    }
  };

  const handleWash = (garment: Garment) => {
    if (washingGarmentIds.has(garment.garmentId)) {
      return;
    }
    setWashingGarmentIds((current) => {
      const next = new Set(current);
      next.add(garment.garmentId);
      return next;
    });
    washGarment.mutate(garment.garmentId, {
      onError: () => {
        setWashingGarmentIds((current) => {
          const next = new Set(current);
          next.delete(garment.garmentId);
          return next;
        });
      },
    });
  };

  const handleWashAll = () => {
    if (doLaundry.isPending) {
      return;
    }
    doLaundry.mutate(undefined, {
      onSuccess: () => {
        setLaundryBurstKey((key) => key + 1);
        if (burstTimerRef.current !== null) {
          clearTimeout(burstTimerRef.current);
        }
        burstTimerRef.current = setTimeout(() => setLaundryBurstKey(0), CELEBRATION_BURST_MS);
      },
    });
  };

  const handleDelete = (garment: Garment) => {
    if (deleteGarment.isPending) {
      return;
    }
    // Accessible confirm dialog instead of window.confirm (WCAG 3.3.1).
    setPendingDelete(garment);
  };

  const handleConfirmDelete = () => {
    if (pendingDelete === null || deleteGarment.isPending) {
      return;
    }
    const target = pendingDelete;
    setDeletingGarmentId(target.garmentId);
    deleteGarment.mutate(
      { garmentId: target.garmentId, imageUrl: target.imageUrl },
      {
        onSettled: () => {
          setDeletingGarmentId(null);
          setPendingDelete(null);
        },
      },
    );
  };

  // Keep a truly empty wardrobe distinct from a wardrobe whose clothes
  // are all waiting for laundry.
  const hasQuery =
    deferredQuery.trim() !== "" || activeCategory !== "all";
  const isActuallyEmpty = garments.length === 0;
  const shouldShowLaundryState =
    inventoryView === "clean" && allWashableGarmentsAreDirty;
  const emptyMessage =
    filteredGarments.length > 0
      ? null
      : hasQuery
        ? t("noResults")
        : isActuallyEmpty
          ? t("closetEmpty")
          : inventoryView === "dirty"
            ? t("basketEmpty")
            : shouldShowLaundryState
              ? t("closetAllDirty")
              : t("closetNoCleanItems");
  const emptyDescription = isActuallyEmpty
    ? t("closetEmptyDescription")
    : shouldShowLaundryState
      ? t("closetAllDirtyDescription")
      : undefined;

  return (
    <section className={styles.page}>
      <PageHeader title={t("title")} />

      {isPending ? (
        <div className={styles.grid}>
          <SmartSkeleton label={t("title")} />
          <SmartSkeleton label={t("title")} />
          <SmartSkeleton label={t("title")} />
          <SmartSkeleton label={t("title")} />
        </div>
      ) : isError ? (
        <EmptyState message={t("loadError")}>
          <Button onClick={() => void refetch()}>{tc("retry")}</Button>
        </EmptyState>
      ) : isActuallyEmpty ? (
        <EmptyState message={t("closetEmpty")} description={t("closetEmptyDescription")}>
          <Button type="button" onClick={() => setIsSourceMenuOpen(true)}>
            {t("addFirstGarment")}
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className={styles.search}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <SegmentedControl
            label={t("inventoryLabel")}
            value={inventoryView}
            onChange={setInventoryView}
            options={[
              {
                value: "clean",
                label: `${t("cleanTab")} · ${cleanGarments.length}`,
              },
              {
                value: "dirty",
                label: `${t("dirtyTab")} · ${dirtyGarments.length}`,
              },
            ]}
          />
          <FilterChips
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
          <p className={styles.count}>
            {t("count", { shown: filteredGarments.length, total })}
          </p>
          {shouldShowLaundryState && !hasQuery && filteredGarments.length > 0 ? (
            <EmptyState
              message={t("closetAllDirty")}
              description={t("closetAllDirtyDescription")}
              compact
            >
              <Button
                type="button"
                disabled={doLaundry.isPending}
                aria-busy={doLaundry.isPending}
                onClick={handleWashAll}
              >
                {doLaundry.isPending ? t("washing") : t("washAll")}
              </Button>
            </EmptyState>
          ) : null}
          {emptyMessage !== null ? (
            <EmptyState message={emptyMessage} description={emptyDescription}>
              {!hasQuery && shouldShowLaundryState ? (
                <Button
                  type="button"
                  disabled={doLaundry.isPending}
                  aria-busy={doLaundry.isPending}
                  onClick={handleWashAll}
                >
                  {doLaundry.isPending ? t("washing") : t("washAll")}
                </Button>
              ) : undefined}
            </EmptyState>
          ) : (
            <MotionConfig reducedMotion="user">
              <div className={styles.grid}>
                <AnimatePresence>
                  {filteredGarments
                    .filter(
                      (garment) => !washingGarmentIds.has(garment.garmentId),
                    )
                    .map((garment) =>
                      inventoryView === "dirty" ? (
                        <motion.div
                          key={garment.garmentId}
                          layout
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                          <GarmentCard
                            garment={garment}
                            onWash={handleWash}
                            isWashing={washGarment.isPending}
                          />
                        </motion.div>
                      ) : (
                        <GarmentCard
                          key={garment.garmentId}
                          garment={garment}
                          onEdit={setEditingGarment}
                          onDelete={handleDelete}
                          isDeleting={deletingGarmentId === garment.garmentId}
                        />
                      ),
                    )}
                </AnimatePresence>
              </div>
            </MotionConfig>
          )}
        </>
      )}

      {upload.phase === "processing" && upload.qualityGate === null ? (
        <ProcessingOverlay message={upload.progressNote} />
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-hidden="true"
        tabIndex={-1}
        className={styles.fileInput}
        onChange={handleFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        className={styles.fileInput}
        onChange={handleFileChange}
      />
      <button
        ref={fabRef}
        type="button"
        aria-label={ta("addGarment")}
        aria-expanded={isSourceMenuOpen}
        aria-haspopup="dialog"
        aria-controls="add-garment-sheet"
        className={styles.fab}
        onClick={() => setIsSourceMenuOpen((open) => !open)}
      >
        <Plus aria-hidden="true" size={28} />
      </button>

      {inventoryView === "dirty" && dirtyGarments.length > 0 ? (
        <div className={styles.washAllWrap}>
          <Button
            type="button"
            disabled={doLaundry.isPending}
            onClick={handleWashAll}
            className={styles.washAll}
          >
            {doLaundry.isPending ? t("washing") : t("washAll")}
          </Button>
        </div>
      ) : null}
      {laundryBurstKey > 0 ? (
        <CelebrationBurst key={laundryBurstKey} />
      ) : null}

      {isSourceMenuOpen ? (
        <div
          className={styles.sheetBackdrop}
          onClick={() => {
            setIsSourceMenuOpen(false);
            fabRef.current?.focus();
          }}
        >
          <div
            id="add-garment-sheet"
            ref={sourceMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label={ta("addGarmentFrom")}
            className={styles.sheet}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.sheetOption}
              onClick={() => {
                setIsSourceMenuOpen(false);
                cameraInputRef.current?.click();
              }}
            >
              <Camera aria-hidden="true" size={22} />
              {t("takePhoto")}
            </button>
            <button
              type="button"
              className={styles.sheetOption}
              onClick={() => {
                setIsSourceMenuOpen(false);
                uploadInputRef.current?.click();
              }}
            >
              <ImagePlus aria-hidden="true" size={22} />
              {t("uploadImage")}
            </button>
          </div>
        </div>
      ) : null}

      {pendingDelete !== null ? (
        <ConfirmDialog
          title={t("deleteTitle", { name: translate(pendingDelete.garmentType, "type") ?? pendingDelete.garmentType ?? "—" })}
          message={t("deleteConfirm", {
            name:
              translate(pendingDelete.garmentType, "type") ??
              pendingDelete.garmentType ??
              "—",
          })}
          confirmLabel={t("deleteConfirmYes")}
          cancelLabel={tc("cancel")}
          isPending={deleteGarment.isPending}
          onConfirm={handleConfirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {upload.qualityGate !== null ? (
        <PhotoQualityDialog
          qualityNote={upload.qualityGate.tags.qualityNote || null}
          cutoutFailed={upload.cutoutFailed}
          isWorking={upload.phase === "processing"}
          progressNote={upload.progressNote}
          onRemoveBackground={() => void upload.removeBackground()}
          onUseOriginal={() => void upload.useOriginalPhoto()}
          onChangePhoto={() => {
            upload.dismissQualityGate();
            setIsSourceMenuOpen(true);
          }}
          onClose={upload.dismissQualityGate}
        />
      ) : null}

      {editingGarment !== null ? (
        <GarmentFormModal
          title={t("editTitle")}
          submitLabel={t("saveChanges")}
          savingLabel={t("saving")}
          cancelLabel={tc("cancel")}
          initialValues={toFormInput(editingGarment)}
          previewUrl={editingGarment.imageUrl}
          previewAlt={
            translate(editingGarment.garmentType, "type") ?? t("garmentFallback")
          }
          isSaving={updateGarment.isPending}
          submitError={updateGarment.isError ? t("saveError") : null}
          onClose={() => setEditingGarment(null)}
          onSubmit={handleUpdate}
        />
      ) : null}
    </section>
  );
}
