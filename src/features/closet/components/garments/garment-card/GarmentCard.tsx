"use client";

import { Pencil, Sparkles, Heart, HeartCrack } from "lucide-react";
import { useTranslations } from "next-intl";
import { GarmentCard as GarmentCardBase } from "@/components/GarmentCard/GarmentCard";
import { ButtonIcon } from "@/components/ButtonIcon/ButtonIcon";
import { useGarmentCardContent } from "@/lib/garment/useGarmentCardContent";
import { useToggleFavorite } from "../../../hooks/garment-actions/useToggleFavorite";
import type { Garment } from "@/types/garment";

interface GarmentCardProps {
  garment: Garment;
  onEdit?: (garment: Garment) => void;
  onWash?: (garment: Garment) => void;
  isWashing?: boolean;
}

/**
 * Closet-specific garment card: owns the favorite mutation, notifications and
 * the edit/wash actions, and delegates all presentation to the shared card.
 */
export function GarmentCard({
  garment,
  onEdit,
  onWash,
  isWashing = false,
}: GarmentCardProps) {
  const { title, subtitle, imageAlt } = useGarmentCardContent(garment);
  const ta = useTranslations("Accessibility");
  const favoriteMutation = useToggleFavorite();
  const favorite = garment.isFavorite;
  const hasTrailingActions = onWash !== undefined || onEdit !== undefined;

  return (
    <GarmentCardBase
      image={{ src: garment.imageUrl, alt: imageAlt }}
      title={title}
      subtitle={subtitle}
      leadingAction={
        <ButtonIcon
          label={
            favorite
              ? ta("removeFromFavorites", { name: title })
              : ta("addToFavorites", { name: title })
          }
          icon={favorite ? <HeartCrack /> : <Heart />}
          variant={favorite ? "favorite-active" : "favorite"}
          pressed={favorite}
          disabled={favoriteMutation.isPending}
          onClick={() =>
            favoriteMutation.mutate({ garment, isFavorite: !favorite })
          }
        />
      }
      trailingAction={
        hasTrailingActions ? (
          <>
            {onWash !== undefined && (
              <ButtonIcon
                label={ta("washGarment", { name: title })}
                icon={<Sparkles />}
                disabled={isWashing}
                onClick={() => onWash(garment)}
              />
            )}
            {onEdit !== undefined && (
              <ButtonIcon
                label={ta("editGarment", { name: title })}
                icon={<Pencil />}
                onClick={() => onEdit(garment)}
              />
            )}
          </>
        ) : undefined
      }
    />
  );
}
