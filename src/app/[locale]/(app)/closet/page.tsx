"use client";

import { useState } from "react";
import { QueryState } from "@/components/QueryState/QueryState";
import { useTranslations } from "next-intl";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { CelebrationBurst } from "@/components/BottomActionBar/BottomActionBar";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { FilterChips } from "@/components/FilterChips/FilterChips";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import type { Garment } from "@/types/garment";
import { useClosetQuery } from "@/features/closet/useClosetQuery";
import { useClosetInventory } from "@/features/closet/useClosetInventory";
import { useLaundryActions } from "@/features/closet/useLaundryActions";
import { useGarmentDeletion } from "@/features/closet/useGarmentDeletion";
import type { GarmentFormInput } from "@/features/closet/useUploadGarment";
import { useUpdateGarment } from "@/features/closet/useUpdateGarment";
import { toEditableTags } from "@/features/closet/ExtraTagsEditor";
import { useGarmentTranslator } from "@/lib/translateGarment";
import { GarmentCard } from "@/features/closet/GarmentCard";
import { GarmentFormModal } from "@/features/closet/GarmentFormModal";
import { GarmentSourcePicker } from "@/features/closet/GarmentSourcePicker";
import { enqueueUploadFiles } from "@/features/closet/UploadQueueManager";
import { UploadBatchPreview } from "@/features/closet/UploadBatchPreview";
import { MAX_UPLOAD_BATCH_SIZE } from "@/constants/upload";
import styles from "./page.module.scss";

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
  const { translate } = useGarmentTranslator();
  const { data: garments = [], isPending, isError, refetch } = useClosetQuery();
  const inventory = useClosetInventory(garments);
  const laundry = useLaundryActions();
  const deletion = useGarmentDeletion();
  const updateGarment = useUpdateGarment();
  const [editingGarment, setEditingGarment] = useState<Garment | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleUpdate = (input: GarmentFormInput) => {
    if (editingGarment !== null) {
      updateGarment.mutate(
        { garmentId: editingGarment.garmentId, input },
        { onSuccess: () => setEditingGarment(null) },
      );
    }
  };

  const washAllButton = (
    <Button
      type="button"
      disabled={laundry.isWashingAll}
      aria-busy={laundry.isWashingAll}
      onClick={laundry.washAll}
    >
      {laundry.isWashingAll ? t("washing") : t("washAll")}
    </Button>
  );
  const deletingName = (garment: Garment) =>
    translate(garment.garmentType, "type") ?? garment.garmentType ?? "—";

  const { emptyMessageKey, shouldShowLaundryState, hasQuery } = inventory;
  const emptyDescription = inventory.isActuallyEmpty
    ? t("closetEmptyDescription")
    : shouldShowLaundryState
      ? t("closetAllDirtyDescription")
      : undefined;

  return (
    <section className={styles.page}>
      <PageHeader title={t("title")} />

      <QueryState
        isPending={isPending}
        isError={isError}
        pending={
          <div className={styles.grid}>
            <SmartSkeleton label={t("title")} />
            <SmartSkeleton label={t("title")} />
            <SmartSkeleton label={t("title")} />
            <SmartSkeleton label={t("title")} />
          </div>
        }
        errorMessage={t("loadError")}
        retryLabel={tc("retry")}
        onRetry={() => void refetch()}
      >
        {inventory.isActuallyEmpty ? (
          <EmptyState
            message={t("closetEmpty")}
            description={t("closetEmptyDescription")}
          >
            <Button type="button" onClick={() => setIsSourceMenuOpen(true)}>
              {t("addFirstGarment")}
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className={styles.search}>
              <SearchBar
                value={inventory.searchQuery}
                onChange={inventory.setSearchQuery}
                placeholder={t("searchPlaceholder")}
              />
            </div>
            <SegmentedControl
              label={t("inventoryLabel")}
              value={inventory.inventoryView}
              onChange={inventory.setInventoryView}
              options={[
                {
                  value: "clean",
                  label: `${t("cleanTab")} · ${inventory.cleanGarments.length}`,
                },
                {
                  value: "dirty",
                  label: `${t("dirtyTab")} · ${inventory.dirtyGarments.length}`,
                },
              ]}
            />
            <FilterChips
              activeCategory={inventory.activeCategory}
              onChange={inventory.setActiveCategory}
            />
            <p className={styles.count}>
              {t("count", {
                shown: inventory.filteredGarments.length,
                total: inventory.total,
              })}
            </p>
            {shouldShowLaundryState &&
            !hasQuery &&
            inventory.filteredGarments.length > 0 ? (
              <EmptyState
                message={t("closetAllDirty")}
                description={t("closetAllDirtyDescription")}
                compact
              >
                {washAllButton}
              </EmptyState>
            ) : null}
            {emptyMessageKey !== null ? (
              <EmptyState
                message={t(emptyMessageKey)}
                description={emptyDescription}
              >
                {!hasQuery && shouldShowLaundryState ? washAllButton : undefined}
              </EmptyState>
            ) : (
              <MotionConfig reducedMotion="user">
                <div className={styles.grid}>
                  <AnimatePresence>
                     {inventory.pagedGarments
                      .filter(
                        (garment) =>
                          !laundry.washingGarmentIds.has(garment.garmentId),
                      )
                      .map((garment) =>
                        inventory.inventoryView === "dirty" ? (
                          <motion.div
                            key={garment.garmentId}
                            layout
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          >
                            <GarmentCard
                              garment={garment}
                              onWash={laundry.wash}
                              isWashing={laundry.isWashing}
                            />
                          </motion.div>
                        ) : (
                          <GarmentCard
                            key={garment.garmentId}
                            garment={garment}
                            onEdit={setEditingGarment}
                            onDelete={deletion.requestDelete}
                            isDeleting={
                              deletion.deletingGarmentId === garment.garmentId
                            }
                          />
                        ),
                      )}
                  </AnimatePresence>
                </div>
              </MotionConfig>
            )}
            {inventory.pageCount > 1 ? (
              <nav className={styles.pagination} aria-label={t("pagination.label")}>
                <Button
                  type="button"
                  disabled={inventory.page === 1}
                  onClick={() => inventory.setPage(inventory.page - 1)}
                >
                  {t("pagination.previous")}
                </Button>
                <span aria-current="page">
                  {t("pagination.page", {
                    current: inventory.page,
                    total: inventory.pageCount,
                  })}
                </span>
                <Button
                  type="button"
                  disabled={inventory.page === inventory.pageCount}
                  onClick={() => inventory.setPage(inventory.page + 1)}
                >
                  {t("pagination.next")}
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </QueryState>

      <GarmentSourcePicker
        isOpen={isSourceMenuOpen}
        onOpenChange={setIsSourceMenuOpen}
        onFile={(file) => void enqueueUploadFiles([file])}
        onFiles={(files) => setPendingFiles(files.slice(0, MAX_UPLOAD_BATCH_SIZE))}
      />

      {pendingFiles.length > 0 ? (
        <UploadBatchPreview
          files={pendingFiles}
          onRemove={(index) =>
            setPendingFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
          }
          onStart={() => {
            void enqueueUploadFiles(pendingFiles);
            setPendingFiles([]);
          }}
          onClose={() => setPendingFiles([])}
        />
      ) : null}

      {inventory.inventoryView === "dirty" &&
      inventory.dirtyGarments.length > 0 ? (
        <div className={styles["wash-all-wrap"]}>
          <Button
            type="button"
            disabled={laundry.isWashingAll}
            onClick={laundry.washAll}
            className={styles["washAll"]}
          >
            {laundry.isWashingAll ? t("washing") : t("washAll")}
          </Button>
        </div>
      ) : null}
      {laundry.laundryBurstKey > 0 ? (
        <CelebrationBurst key={laundry.laundryBurstKey} />
      ) : null}

      {deletion.pendingDelete !== null ? (
        <ConfirmDialog
          title={t("deleteTitle", { name: deletingName(deletion.pendingDelete) })}
          message={t("deleteConfirm", {
            name: deletingName(deletion.pendingDelete),
          })}
          confirmLabel={t("deleteConfirmYes")}
          cancelLabel={tc("cancel")}
          isPending={deletion.isDeleting}
          onConfirm={deletion.confirmDelete}
          onClose={deletion.cancelDelete}
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
