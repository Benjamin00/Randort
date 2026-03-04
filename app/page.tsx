"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RollButton } from "@/components/RollButton";
import { MoodSelector } from "@/components/MoodSelector";
import { RadiusSlider } from "@/components/RadiusSlider";
import { PriceSelector } from "@/components/PriceSelector";
import { PlaceCard } from "@/components/PlaceCard";
import { LocationFallback } from "@/components/LocationFallback";
import { useGeolocation } from "@/lib/useGeolocation";
import { moodsToTypes, deriveMoodLabel, milesToMeters } from "@/lib/moods";
import type { PriceLevel } from "@/components/PriceSelector";
import type { MoodId } from "@/components/MoodSelector";
import type { RadiusMiles } from "@/components/RadiusSlider";
import type { RollResponse, EnrichedPlace } from "@/lib/types";

type AppPhase = "filters" | "loading" | "result" | "error";

export default function Home() {
  const {
    lat, lng,
    error: geoError,
    loading: geoLoading,
    retry,
    setManualLocation,
  } = useGeolocation();
  const hasLocation = lat !== null && lng !== null;

  /* Filter state */
  const [selectedMoods, setSelectedMoods] = useState<Set<MoodId>>(new Set());
  const [radius, setRadius] = useState<RadiusMiles>(5);
  const [maxPrice, setMaxPrice] = useState<PriceLevel>(null);

  /* Roll result state */
  const [phase, setPhase] = useState<AppPhase>("filters");
  const [currentPlace, setCurrentPlace] = useState<EnrichedPlace | null>(null);
  const [remainingIds, setRemainingIds] = useState<string[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const lastRollFiltersRef = useRef<string>("");

  const handleRoll = useCallback(async () => {
    if (lat === null || lng === null) return;

    const filterFingerprint = JSON.stringify({
      lat, lng, radius,
      moods: [...selectedMoods].sort(),
      maxPrice,
    });
    const filtersChanged = filterFingerprint !== lastRollFiltersRef.current;

    /* Re-roll from cached pool when filters haven't changed */
    if (!filtersChanged && remainingIds.length > 0) {
      setPhase("loading");
      try {
        const data = await fetchDetail(remainingIds[0], lat, lng);
        setCurrentPlace(data.place);
        setRemainingIds(remainingIds.slice(1));
        setPhase("result");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
      return;
    }

    /* Fresh roll */
    setPhase("loading");
    lastRollFiltersRef.current = filterFingerprint;

    try {
      const data = await fetchPlaces(
        lat, lng,
        milesToMeters(radius),
        moodsToTypes(selectedMoods),
        maxPrice,
      );
      setCurrentPlace(data.place);
      setRemainingIds(data.remainingIds);
      setTotalMatches(data.totalMatches);
      setPhase("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  }, [selectedMoods, radius, maxPrice, remainingIds, lat, lng]);

  function handleClose() {
    setPhase("filters");
    setCurrentPlace(null);
  }

  const isLoading = phase === "loading";
  const showCard = phase === "loading" || phase === "result";

  return (
    <div
      className="flex min-h-dvh items-start justify-center md:items-center"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div
        className="relative flex w-full flex-col min-h-dvh md:min-h-0 md:w-[640px] md:rounded-2xl md:shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        {/* Top bar — title + indicator */}
        <div
          className="flex items-center justify-between"
          style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 16 }}
        >
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "var(--color-text-tertiary)",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            RANDORT
          </p>

          {/* Status indicator — top right */}
          <div className="flex items-center" style={{ gap: 8 }}>
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  border: "2px solid var(--color-shadow)",
                  borderTopColor: "var(--color-text-primary)",
                }}
              />
            ) : (
              <span
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: hasLocation ? "#4ADE80" : geoLoading ? "var(--color-text-tertiary)" : "var(--color-status-closing)",
                }}
              />
            )}
          </div>
        </div>

        {/* Zone 1 — Purpose statement */}
        <header
          className="text-left"
          style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 8 }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-display)",
            }}
          >
            I want to go someplace
          </h1>
        </header>

        {/* Zones 2–4 — Filter controls */}
        <div
          className="flex flex-1 flex-col"
          style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 24, gap: 24 }}
        >
          <section aria-label="Distance">
            <RadiusSlider value={radius} onChange={setRadius} />
          </section>
          
          <section aria-label="Mood">
            <MoodSelector
              selected={selectedMoods}
              onSelectionChange={setSelectedMoods}
            />
          </section>

          <section aria-label="Price filter">
            <PriceSelector value={maxPrice} onChange={setMaxPrice} />
          </section>

          {phase === "error" && (
            <section
              aria-label="Error"
              className="rounded-lg"
              style={{
                padding: 16,
                backgroundColor: "var(--color-surface)",
                boxShadow: "var(--shadow-pressed)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--color-status-closing)" }}>
                {errorMessage}
              </p>
            </section>
          )}
        </div>

        <div style={{ padding: "16px 24px" }}>
          {geoLoading && (
            <p
              className="text-center"
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                paddingBottom: 16,
              }}
            >
              Finding your location…
            </p>
          )}

          {!geoLoading && !hasLocation && geoError && (
            <div style={{ paddingBottom: 16 }}>
              <LocationFallback
                error={geoError}
                onLocationResolved={setManualLocation}
                onRetryGeolocation={retry}
              />
            </div>
          )}

          <RollButton onRoll={handleRoll} loading={isLoading || !hasLocation} />
        </div>

        {/* Zone 7 — Mystery card overlay */}
        <AnimatePresence>
          {showCard && (
            <PlaceCard
              place={currentPlace}
              moodLabel={deriveMoodLabel(selectedMoods)}
              remainingCount={remainingIds.length}
              totalMatches={totalMatches}
              onClose={handleClose}
              onReRoll={handleRoll}
              loading={isLoading}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── API helpers ──────────────────────────────────────────────────────────── */

async function fetchPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  types: string[],
  maxPriceLevel: number | null,
): Promise<RollResponse> {
  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, radius: radiusMeters, types, maxPriceLevel }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<RollResponse>;
}

async function fetchDetail(
  placeId: string,
  lat: number,
  lng: number,
): Promise<{ place: EnrichedPlace }> {
  const res = await fetch("/api/places/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId, lat, lng }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ place: EnrichedPlace }>;
}
