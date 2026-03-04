"use client";

import { useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";

const SHADOW_REST = "0 4px 12px rgba(0,0,0,0.3)";
const SHADOW_PRESSED = "0 2px 6px rgba(0,0,0,0.25)";

const PRESS_DOWN = { duration: 0.08 };
const SPRING_BACK = { type: "spring" as const, stiffness: 300, damping: 25 };

export function RollButton({
  onRoll,
  loading = false,
}: {
  onRoll: () => void;
  loading?: boolean;
}) {
  const scale = useMotionValue(1);
  const [pressed, setPressed] = useState(false);

  function handlePointerDown() {
    if (loading) return;
    setPressed(true);
    animate(scale, 0.96, PRESS_DOWN);
  }

  function handlePointerUp() {
    if (loading) return;
    setPressed(false);
    animate(scale, 1, SPRING_BACK);
  }

  function handleClick() {
    if (loading) return;
    onRoll();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      disabled={loading}
      style={{
        scale,
        backgroundColor: "var(--color-roll-bg)",
        color: "var(--color-roll-text)",
        boxShadow: pressed ? SHADOW_PRESSED : SHADOW_REST,
        minHeight: 120,
        borderRadius: 16,
        opacity: loading ? 0.7 : 1,
      }}
      className="w-full cursor-pointer px-6 py-5 text-2xl font-bold tracking-wide select-none disabled:cursor-not-allowed"    >
      {loading ? "Generating…" : "Generate"}
    </motion.button>
  );
}
