"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, animate, useTransform, AnimatePresence } from "framer-motion";

const STEPS = [0.5, 1, 2, 5, 10, 15] as const;
type RadiusMiles = (typeof STEPS)[number];

const THUMB_W = 50;
const THUMB_H = 36;
const TRACK_H = 6;
const HIT_PAD = 20;
const SETTLE_SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

function stepToFraction(step: RadiusMiles): number {
  const idx = STEPS.indexOf(step);
  return idx / (STEPS.length - 1);
}

function fractionToNearestStep(fraction: number): RadiusMiles {
  const idx = Math.round(fraction * (STEPS.length - 1));
  const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
  return STEPS[clamped];
}

function formatLabel(miles: RadiusMiles): string {
  if (miles === 1) return "1 Mile Away";
  return `${miles} Miles Away`;
}

export function RadiusSlider({
  value,
  onChange,
}: {
  value: RadiusMiles;
  onChange: (next: RadiusMiles) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const trackWidthRef = useRef(0);
  const dragging = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [isDragging, setIsDragging] = useState(false);

  const thumbX = useMotionValue(0);

  const fillScaleX = useTransform(thumbX, (x) => {
    const tw = trackWidthRef.current;
    if (tw <= 0) return 0;
    return Math.max(0, Math.min(1, (x + THUMB_W / 2) / tw));
  });

  function getUsableWidth(): number {
    const track = trackRef.current;
    if (!track) return 0;
    const tw = track.clientWidth;
    trackWidthRef.current = tw;
    return tw - THUMB_W;
  }

  function fractionFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const uw = getUsableWidth();
    if (uw <= 0) return 0;
    const x = clientX - rect.left - THUMB_W / 2;
    return Math.max(0, Math.min(1, x / uw));
  }

  /* Position thumb to match value — only when not dragging */
  useEffect(() => {
    if (dragging.current) return;
    const uw = getUsableWidth();
    if (uw <= 0) return;
    thumbX.set(stepToFraction(value) * uw);
  }, [value, thumbX]);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
    setIsDragging(true);

    const uw = getUsableWidth();
    if (uw <= 0) return;
    const frac = fractionFromPointer(e.clientX);
    thumbX.set(frac * uw);
    onChange(fractionToNearestStep(frac));
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const uw = getUsableWidth();
    if (uw <= 0) return;
    const frac = fractionFromPointer(e.clientX);

    thumbX.set(frac * uw);

    const snapped = fractionToNearestStep(frac);
    if (snapped !== valueRef.current) {
      onChange(snapped);
    }
  }

  function handlePointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);

    const uw = getUsableWidth();
    if (uw <= 0) return;
    const currentFrac = thumbX.get() / uw;
    const snapped = fractionToNearestStep(currentFrac);
    animate(thumbX, stepToFraction(snapped) * uw, SETTLE_SPRING);
    onChange(snapped);
  }

  const thumbTop = HIT_PAD + TRACK_H / 2 - THUMB_H / 2;

  return (
    <div>
      <div className="flex items-baseline" style={{ gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          Up to...
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-text-primary)",
          }}
        >
          {formatLabel(value)}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative cursor-pointer select-none touch-none"
        style={{ paddingTop: HIT_PAD, paddingBottom: HIT_PAD }}
      >
        {/* Track groove — 4px tall */}
        <div
          className="w-full rounded-full"
          style={{
            height: TRACK_H,
            backgroundColor: "var(--color-surface)",
            boxShadow:
              "inset 2px 2px 4px var(--color-shadow), inset -1px -1px 2px var(--color-surface-light)",
          }}
        />

        {/* Active fill — thin 2px, secondary color, NOT green */}
        <motion.div
          className="absolute left-0 origin-left rounded-full"
          style={{
            top: HIT_PAD + 1,
            height: 2,
            width: "100%",
            scaleX: fillScaleX,
            backgroundColor: "var(--color-text-secondary)",
          }}
        />

        {/* Snap point dots — 4px, on the track */}
        {STEPS.map((step) => (
          <div
            key={step}
            className="absolute rounded-full"
            style={{
              top: HIT_PAD + (TRACK_H - 4) / 2,
              left: `${stepToFraction(step) * 100}%`,
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              backgroundColor: "var(--color-shadow)",
            }}
          />
        ))}

        {/* Value label above thumb during drag */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                x: thumbX,
                position: "absolute",
                top: thumbTop - 24,
                width: THUMB_W,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <span
                className="font-medium"
                style={{
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumb — slightly smaller shadow */}
        <motion.div
          style={{
            x: thumbX,
            position: "absolute",
            top: thumbTop,
            width: THUMB_W,
            height: THUMB_H,
            backgroundColor: "var(--color-roll-bg)",
            borderRadius: 6,
            boxShadow:
              "2px 2px 6px rgba(0,0,0,0.3), -1px -1px 3px rgba(0,0,0,0.1)",
          }}
          className="flex items-center justify-center"
        >
          <div
            className="rounded-full"
            style={{
              width: 2,
              height: 14,
              backgroundColor: "var(--color-roll-text)",
              opacity: 0.7,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export type { RadiusMiles };
