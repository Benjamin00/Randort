"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GeolocationError, GeocodeResponse } from "@/lib/types";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };

function errorMessage(error: GeolocationError): string {
  switch (error) {
    case "PERMISSION_DENIED":
      return "Location access was denied.";
    case "POSITION_UNAVAILABLE":
      return "Your location could not be determined.";
    case "TIMEOUT":
      return "Location request timed out.";
    case "NOT_SUPPORTED":
      return "Your browser does not support geolocation.";
  }
}

export function LocationFallback({
  error,
  onLocationResolved,
  onRetryGeolocation,
}: {
  error: GeolocationError;
  onLocationResolved: (lat: number, lng: number) => void;
  onRetryGeolocation: () => void;
}) {
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = address.trim();
    if (trimmed.length === 0 || submitting) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as GeocodeResponse;
      onLocationResolved(data.lat, data.lng);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [address, submitting, onLocationResolved]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      aria-label="Location input"
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-surface)",
        boxShadow: "var(--shadow-pressed)",
      }}
    >
      <p
        className="mb-1 text-sm font-medium"
        style={{ color: "var(--color-text-primary)" }}
      >
        {errorMessage(error)}
      </p>
      <p
        className="mb-4 text-xs"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Enter an address or zip code to search nearby.
      </p>

      <div className="mb-3">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Address, city, or zip code"
          className="w-full rounded-lg px-4 py-3 text-sm outline-none"
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-text-primary)",
            boxShadow: "var(--shadow-pressed)",
          }}
        />
      </div>

      <AnimatePresence>
        {apiError && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="mb-3 text-xs"
            style={{ color: "var(--color-status-closing)" }}
          >
            {apiError}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={address.trim().length === 0 || submitting}
          whileTap={{ scale: 0.97 }}
          className="flex-1 cursor-pointer rounded-lg px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-roll-bg)",
            color: "var(--color-roll-text)",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {submitting ? "Finding..." : "Use This Location"}
        </motion.button>

        {error !== "NOT_SUPPORTED" && (
          <motion.button
            type="button"
            onClick={onRetryGeolocation}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--color-surface-light)",
              color: "var(--color-text-secondary)",
              boxShadow: "var(--shadow-raised)",
            }}
          >
            Try Again
          </motion.button>
        )}
      </div>
    </motion.section>
  );
}
