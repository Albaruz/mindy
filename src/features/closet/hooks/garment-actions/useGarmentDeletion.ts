"use client";

import { useState } from "react";
import type { Garment } from "@/types/garment";
import { useDeleteGarment } from "./useDeleteGarment";

// Delete flow: ask first through an accessible confirm dialog (WCAG 3.3.1,
// never window.confirm), then delete and clear both states once settled.
export function useGarmentDeletion() {
  const deleteGarment = useDeleteGarment();
  const [pendingDelete, setPendingDelete] = useState<Garment | null>(null);
  const [deletingGarmentId, setDeletingGarmentId] = useState<string | null>(
    null,
  );

  const requestDelete = (garment: Garment) => {
    if (deleteGarment.isPending) {
      return;
    }
    setPendingDelete(garment);
  };

  const confirmDelete = () => {
    if (pendingDelete === null || deleteGarment.isPending) {
      return;
    }
    const target = pendingDelete;
    setDeletingGarmentId(target.garmentId);
    deleteGarment.mutate(
       {
         garmentId: target.garmentId,
         imageUrl: target.imageUrl,
         originalImageUrl: target.originalImageUrl,
       },
      {
        onSettled: () => {
          setDeletingGarmentId(null);
          setPendingDelete(null);
        },
      },
    );
  };

  return {
    pendingDelete,
    deletingGarmentId,
    isDeleting: deleteGarment.isPending,
    requestDelete,
    confirmDelete,
    cancelDelete: () => setPendingDelete(null),
  };
}
