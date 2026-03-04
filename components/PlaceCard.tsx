"use client";

import { motion } from "framer-motion";
import type { EnrichedPlace } from "@/lib/types";
import { metersToDisplayMiles } from "@/lib/moods";

interface PlaceCardProps {
  place: EnrichedPlace | null;
  moodLabel: string;
  remainingCount: number;
  totalMatches: number;
  onClose: () => void;
  onReRoll: () => void;
  loading: boolean;
}

const CARD_ENTER = {
  type: "spring" as const,
  stiffness: 200,
  damping: 20,
};

const CARD_EXIT = {
  duration: 0.25,
  ease: "easeIn" as const,
};

export function PlaceCard({
  place,
  moodLabel,
  remainingCount,
  totalMatches,
  onClose,
  onReRoll,
  loading,
}: PlaceCardProps) {
  const distanceMiles = place ? metersToDisplayMiles(place.distanceMeters) : 0;

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0, transition: CARD_EXIT }}
      transition={CARD_ENTER}
      className="absolute inset-x-0 bottom-0 z-10 overflow-y-auto"
      style={{
        top: 0,
        backgroundColor: "var(--color-background)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
        padding: 24,
        paddingBottom: 40,
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute cursor-pointer"
        style={{
          top: 16,
          right: 16,
          fontSize: 24,
          lineHeight: 1,
          color: "var(--color-text-tertiary)",
          background: "none",
          border: "none",
        }}
      >
        ✕
      </button>

      {loading ? (
        <LoadingShuffle />
      ) : place ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Photo with vignette */}
          {place.photoUrl && (
            <div
              className="relative overflow-hidden"
              style={{ borderRadius: 12, maxHeight: 180 }}
            >
              <img
                src={place.photoUrl}
                alt=""
                className="w-full object-cover"
                style={{ maxHeight: 180 }}
                loading="lazy"
              />
              {/* Bottom vignette gradient */}
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: 60,
                  background:
                    "linear-gradient(transparent, rgba(0,0,0,0.3))",
                }}
              />
            </div>
          )}

          {/* Mood tag: green dot + mood label + distance */}
          <div className="flex items-center" style={{ gap: 8 }}>
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: "#4ADE80",
              }}
            />
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {moodLabel} · {distanceMiles} mi away
            </span>
          </div>

          {/* Blurb with quote styling */}
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: -8,
                fontSize: 48,
                lineHeight: 1,
                color: "var(--color-text-tertiary)",
                fontFamily: "var(--font-display)",
                userSelect: "none",
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                fontSize: 17,
                fontStyle: "italic",
                lineHeight: 1.5,
                color: "var(--color-text-primary)",
              }}
            >
              {place.mysteryBlurb}
            </p>
          </div>

          {/* Rating + details line */}
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
            ★ {place.rating} · {place.reviewCount} reviews
            {place.priceLevel !== null &&
              ` · ${"$".repeat(place.priceLevel + 1)}`}
            {place.hoursConfirmed &&
              place.minutesUntilClose !== null && (
                <> · Open for {Math.floor(place.minutesUntilClose / 60)}+ hours</>
              )}
          </p>

          {/* "Let's Go" button — maps deep link */}
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center font-medium select-none"
            style={{
              backgroundColor: "var(--color-roll-bg)",
              color: "var(--color-roll-text)",
              borderRadius: 16,
              padding: "16px 24px",
              fontSize: 18,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            Let&apos;s Go
          </a>

          {/* "Show me another" text link */}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={onReRoll}
              className="cursor-pointer text-center w-full"
              style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                background: "none",
                border: "none",
                padding: 8,
              }}
            >
              Show me another ({remainingCount} of {totalMatches} left)
            </button>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

/* ─── Loading shuffle animation ──────────────────────────────────────────── */

function LoadingShuffle() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: 200, gap: 16 }}
    >
      <motion.div
        animate={{
          rotate: [0, 3, -3, 2, -2, 0],
        }}
        transition={{
          duration: 0.6,
          times: [0, 0.15, 0.35, 0.55, 0.75, 1],
          ease: "easeInOut",
        }}
        className="rounded-xl"
        style={{
          width: "80%",
          height: 120,
          backgroundColor: "var(--color-surface)",
          boxShadow:
            "4px 4px 12px #C5C0B8, -4px -4px 12px #F5F2ED",
        }}
      />
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
        Finding your spot…
      </p>
    </div>
  );
}
