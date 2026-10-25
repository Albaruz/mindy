"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CLOSET_PAGE_SIZE } from "@/constants/ui-config";
import type { Garment } from "@/types/garment";
import type { CategoryFilter, FavoritesFilter } from "@/types/ui";
import {
  isInLaundryGarment,
  isWashableGarment,
  isWearableGarment,
} from "@/lib/garment/categorizeGarments";
import {
  filterGarmentsByCategory,
  filterGarmentsBySearch,
} from "../../domain/inventory/searchGarments";

export type InventoryView = "clean" | "dirty";

export type EmptyMessageKey =
  | "noResults"
  | "closetEmpty"
  | "basketEmpty"
  | "closetAllDirty"
  | "closetNoCleanItems";

// Unified inventory: clean garments vs the laundry basket (dirty and not
// laundry-exempt, mirroring the basket query). Search, category and favorites
// filters apply on top of the active view: strict category prefilter first,
// then favorites filter, then the strict text search.
export function useClosetInventory(garments: Garment[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [showFavorites, setShowFavorites] = useState<FavoritesFilter>(false);
  const [inventoryView, setInventoryView] = useState<InventoryView>("clean");
  const [page, setPage] = useState(1);
  // Deferred query keeps the input responsive while the grid filters.
  const deferredQuery = useDeferredValue(searchQuery);

  const cleanGarments = useMemo(
    () => garments.filter(isWearableGarment),
    [garments],
  );
  const dirtyGarments = useMemo(
    () => garments.filter(isInLaundryGarment),
    [garments],
  );
  const washableGarments = useMemo(
    () => garments.filter(isWashableGarment),
    [garments],
  );
  const baseGarments = inventoryView === "clean" ? cleanGarments : dirtyGarments;
  const filteredGarments = useMemo(
    () => {
      let result = filterGarmentsByCategory(baseGarments, activeCategory);
      if (showFavorites) {
        result = result.filter((g) => g.isFavorite);
      }
      return filterGarmentsBySearch(result, deferredQuery);
    },
    [baseGarments, activeCategory, showFavorites, deferredQuery],
  );
  const pageCount = Math.max(1, Math.ceil(filteredGarments.length / CLOSET_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedGarments = useMemo(
    () => filteredGarments.slice((currentPage - 1) * CLOSET_PAGE_SIZE, currentPage * CLOSET_PAGE_SIZE),
    [currentPage, filteredGarments],
  );

  const changeSearchQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  const changeActiveCategory = (value: CategoryFilter) => {
    setActiveCategory(value);
    setPage(1);
  };
  const changeShowFavorites = (value: FavoritesFilter) => {
    setShowFavorites(value);
    setPage(1);
  };
  const changeInventoryView = (value: InventoryView) => {
    setInventoryView(value);
    setPage(1);
  };

  // Keep a truly empty wardrobe distinct from a wardrobe whose clothes are
  // all waiting for laundry.
  const hasQuery = deferredQuery.trim() !== "" || activeCategory !== "all" || showFavorites;
  const isActuallyEmpty = garments.length === 0;
  const allWashableGarmentsAreDirty =
    washableGarments.length > 0 &&
    washableGarments.every((garment) => garment.isDirty);
  const shouldShowLaundryState =
    inventoryView === "clean" && allWashableGarmentsAreDirty;

  let emptyMessageKey: EmptyMessageKey | null = null;
  if (filteredGarments.length === 0) {
    if (hasQuery) {
      emptyMessageKey = "noResults";
    } else if (isActuallyEmpty) {
      emptyMessageKey = "closetEmpty";
    } else if (inventoryView === "dirty") {
      emptyMessageKey = "basketEmpty";
    } else if (shouldShowLaundryState) {
      emptyMessageKey = "closetAllDirty";
    } else {
      emptyMessageKey = "closetNoCleanItems";
    }
  }

  return {
    searchQuery,
    setSearchQuery: changeSearchQuery,
    activeCategory,
    setActiveCategory: changeActiveCategory,
    showFavorites,
    setShowFavorites: changeShowFavorites,
    inventoryView,
    setInventoryView: changeInventoryView,
    cleanGarments,
    dirtyGarments,
    filteredGarments,
    pagedGarments,
    page: currentPage,
    pageCount,
    setPage,
    total: baseGarments.length,
    hasQuery,
    isActuallyEmpty,
    shouldShowLaundryState,
    emptyMessageKey,
  };
}
