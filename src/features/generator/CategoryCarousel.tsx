import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Shuffle,
} from "lucide-react";
import type { Garment } from "@/types/garment";
import { cn } from "@/lib/utils";
import { useGarmentTranslator } from "@/lib/translateGarment";
import { CAROUSEL_LOOP_MIN_SLIDES } from "@/constants/generator";
import { LazyImage } from "@/components/LazyImage/LazyImage";
import { SmartSkeleton } from "@/components/Skeletons/SmartSkeleton";
import type { Category } from "./useGeneratorStore";
import styles from "./CategoryCarousel.module.scss";

interface CategoryCarouselProps {
  category: Category;
  title: string;
  garments: Garment[];
  activeGarmentId: string | null;
  isLocked: boolean;
  isLoading: boolean;
  onSlideChange: (category: Category, index: number) => void;
  onToggleLock: (category: Category) => void;
  onChangeGarment: (category: Category) => void;
  // Lazy image strategy for slide photos. "lazy" (default) defers
  // offscreen slides via IntersectionObserver, "eager" loads all
  // immediately (useful for tiny closets or tests).
  imageLoading?: "lazy" | "eager";
  // Neighbours around the active slide that load eagerly to make
  // prev/next swipes instant. Defaults to 1.
  preloadAdjacent?: number;
  // Slide transition style. "coverflow" angles neighbours into the
  // distance (Swiper EffectCoverflow); "slide" keeps the flat row.
  effect?: "slide" | "coverflow";
}

export function CategoryCarousel({
  category,
  title,
  garments,
  activeGarmentId,
  isLocked,
  isLoading,
  onSlideChange,
  onToggleLock,
  onChangeGarment,
  imageLoading = "lazy",
  preloadAdjacent = 1,
  effect = "coverflow",
}: CategoryCarouselProps) {
  const t = useTranslations("Generator");
  const ta = useTranslations("Accessibility");
  const { translate, translateDetail } = useGarmentTranslator();
  const initialSlide = Math.max(
    garments.findIndex((garment) => garment.garmentId === activeGarmentId),
    0,
  );
  // Infinite loop needs at least 3 slides to duplicate cleanly.
  const looped = garments.length >= CAROUSEL_LOOP_MIN_SLIDES;
  const LockIcon = isLocked ? Lock : LockOpen;
  const swiperRef = useRef<SwiperInstance | null>(null);
  // Active slide drives eager preloading of neighbours so swipes
  // feel instant while distant slides stay deferred.
  const [activeIndex, setActiveIndex] = useState(initialSlide);
  const lazyEnabled = imageLoading === "lazy";
  const isCoverflow = effect === "coverflow";

  // Reflect external picks (e.g. AI suggestions) in the visible slide.
  // The realIndex guard prevents feedback loops with onSlideChange. In loop
  // mode positions must go through slideToLoop (duplicated slides).
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || garments.length === 0) {
      return;
    }
    const targetIndex = Math.max(
      garments.findIndex((garment) => garment.garmentId === activeGarmentId),
      0,
    );
    setActiveIndex(targetIndex);
    if (swiper.realIndex !== targetIndex) {
      if (looped) {
        swiper.slideToLoop(targetIndex);
      } else {
        swiper.slideTo(targetIndex);
      }
    }
  }, [activeGarmentId, garments, looped]);

  const isSlideEager = (index: number) => {
    if (!lazyEnabled) {
      return true;
    }
    if (garments.length === 0) {
      return false;
    }
    if (looped) {
      const forward = (index - activeIndex + garments.length) % garments.length;
      const backward =
        (activeIndex - index + garments.length) % garments.length;
      return Math.min(forward, backward) <= preloadAdjacent;
    }
    return Math.abs(index - activeIndex) <= preloadAdjacent;
  };

  return (
    <section aria-label={ta("carousel", { title })} className={styles["category-carousel"]}>
      <div className={styles["category-carousel__header"]}>
        <h2 className={styles["category-carousel__title"]}>{title}</h2>
        {garments.length > 0 && !isLoading ? (
          <div className={styles["category-carousel__header-actions"]}>
            <button
              type="button"
              aria-pressed={isLocked}
              aria-label={isLocked ? ta("unlockGarment", { title }) : ta("lockGarment", { title })}
              title={isLocked ? ta("unlockGarment", { title }) : ta("lockGarment", { title })}
              className={cn(styles["category-carousel__lock-button"], isLocked && styles["category-carousel__lock-button--locked"])}
              onClick={() => onToggleLock(category)}
            >
              <LockIcon aria-hidden="true" size={20} />
            </button>
            <button
              type="button"
              aria-label={ta("changeGarment", { title })}
              title={
                isLocked ? ta("lockedGarment", { title }) : ta("changeGarment", { title })
              }
              className={styles["category-carousel__change-button"]}
              disabled={isLocked}
              onClick={() => onChangeGarment(category)}
            >
              <Shuffle aria-hidden="true" size={20} />
            </button>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <SmartSkeleton
          variant={category}
          label={ta("carousel", { title })}
          className={styles["category-carousel__slide"]}
        />
      ) : garments.length === 0 ? (
        <p className={styles["category-carousel__empty"]}>
          {t("carouselEmpty", { title: title.toLowerCase() })}
        </p>
      ) : (
      <div className={cn(styles["category-carousel__viewport"], isCoverflow && styles["category-carousel__coverflow"])}>
        <button
          type="button"
          aria-label={ta("previousGarment", { title })}
          title={ta("previousGarment", { title })}
          className={cn(styles["category-carousel__nav-button"], styles["category-carousel__prev-button"])}
          disabled={isLocked}
          onClick={() => swiperRef.current?.slidePrev()}
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <Swiper
          modules={[EffectCoverflow]}
          effect={isCoverflow ? "coverflow" : "slide"}
          coverflowEffect={
            isCoverflow
              ? {
                  rotate: 30,
                  stretch: 0,
                  depth: 120,
                  modifier: 1,
                  slideShadows: true,
                }
              : undefined
          }
          grabCursor={isCoverflow}
          slidesPerView="auto"
          centeredSlides
          spaceBetween={isCoverflow ? 0 : 12}
          loop={looped}
          allowTouchMove={!isLocked}
          initialSlide={initialSlide}
          watchSlidesProgress
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setActiveIndex(swiper.realIndex);
            onSlideChange(category, swiper.realIndex);
          }}
        >
          {garments.map((garment, index) => (
            <SwiperSlide key={garment.garmentId}>
              <div
                className={cn(
                  styles["category-carousel__slide"],
                  isLocked && index === activeIndex && styles["category-carousel__slide-locked"],
                )}
              >
                {isLocked && index === activeIndex ? (
                  <span className={styles["category-carousel__lock-badge"]} aria-hidden="true">
                    <Lock size={14} />
                  </span>
                ) : null}
                {garment.imageUrl !== null ? (
                  <LazyImage
                    src={garment.imageUrl}
                    alt={
                      translate(garment.garmentType, "type") ??
                      translateDetail(
                        typeof garment.extraTags.specificType === "string"
                          ? garment.extraTags.specificType
                          : null,
                      ) ??
                      title
                    }
                    loading={isSlideEager(index) ? "eager" : "lazy"}
                    className={styles["category-carousel__image"]}
                  />
                ) : (
                  <div className={styles["category-carousel__placeholder"]} aria-hidden="true" />
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button
          type="button"
          aria-label={ta("nextGarment", { title })}
          title={ta("nextGarment", { title })}
          className={cn(styles["category-carousel__nav-button"], styles["category-carousel__next-button"])}
          disabled={isLocked}
          onClick={() => swiperRef.current?.slideNext()}
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
      </div>
      )}
    </section>
  );
}
