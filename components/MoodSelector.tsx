"use client";

import { motion } from "framer-motion";

type MoodId = "eat" | "go_out" | "chill" | "outside" | "adventure";

const MOODS: { id: MoodId; label: string; icon: string }[] = [
  { id: "eat", label: "Eat", icon: "🍽️" },
  { id: "go_out", label: "Go Out", icon: "🍸" },
  { id: "chill", label: "Chill", icon: "☕" },
  { id: "outside", label: "Outside", icon: "🌳" },
  { id: "adventure", label: "Adventure", icon: "🎲" }
];

/* Resolved hex so Framer Motion can interpolate between states */
const SHADOW_RAISED = "4px 4px 8px #C5C0B8, -4px -4px 8px #F5F2ED";
const SHADOW_PRESSED = "inset 3px 3px 6px #C5C0B8, inset -3px -3px 6px #F5F2ED";

const KNOB_SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };

export function MoodSelector({
  selected,
  onSelectionChange,
}: {
  selected: Set<MoodId>;
  onSelectionChange: (next: Set<MoodId>) => void;
}) {
  function handleToggle(id: MoodId) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  /* "Anything" is visually active when nothing else is selected */
  const isAnythingActive = selected.size === 0;

  return (
    <div>
      <p
        style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}
      >
        To...
      </p>
      <div className="flex justify-between">
        {MOODS.map((mood) => (
          <MoodKnob
            key={mood.id}
            label={mood.label}
            icon={mood.icon}
            active={selected.has(mood.id)}
            onPress={() => handleToggle(mood.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Mood knob ──────────────────────────────────────────────────────────── */

function MoodKnob({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex cursor-pointer flex-col items-center"
      style={{ gap: 4 }}
    >
      {/* Label above knob */}
      <span
        className="text-center leading-tight"
        style={{ fontSize: 11, color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>

      {/* Knob body: 56x56, surface bg — depth changes on select */}
      <motion.span
        animate={{
          boxShadow: active ? SHADOW_PRESSED : SHADOW_RAISED,
        }}
        transition={KNOB_SPRING}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: "var(--color-surface)",
        }}
      >
        <span
          style={{
            fontSize: 22,
            lineHeight: 1,
            filter: active ? "none" : "grayscale(0.6) opacity(0.5)",
            transition: "filter 0.2s ease",
          }}
        >
          {icon}
        </span>
      </motion.span>

      {/* LED indicator dot below knob */}
      <motion.span
        animate={{
          opacity: active ? 1 : 0,
          scale: active ? 1 : 0.4,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: "#4ADE80",
          boxShadow: active
            ? "0 0 6px rgba(74, 222, 128, 0.6)"
            : "none",
        }}
      />
    </button>
  );
}

export type { MoodId };
