"use client";

import { motion } from "framer-motion";

type MoodId = "eat" | "go_out" | "chill" | "outside" | "anything";

const CORE_MOODS: { id: Exclude<MoodId, "anything">; label: string; icon: string }[] = [
  { id: "eat", label: "Eat", icon: "🍽️" },
  { id: "go_out", label: "Go Out", icon: "🍸" },
  { id: "chill", label: "Chill", icon: "☕" },
  { id: "outside", label: "Outside", icon: "🌳" },
];

const ANYTHING_MOOD = { id: "anything" as const, label: "Anything", icon: "🎲" };

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
    if (id === "anything") {
      /* Tapping "Anything" clears all selections — back to default */
      onSelectionChange(new Set());
      return;
    }

    const next = new Set(selected);
    /* Selecting a specific mood clears "anything" if it was set */
    next.delete("anything");

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
        className="text-text-secondary"
        style={{ fontSize: 14, marginBottom: 8 }}
      >
        To...
      </p>

      <div className="flex justify-center" style={{ gap: 16 }}>
        {/* Core 4 mood knobs */}
        {CORE_MOODS.map((mood) => (
          <MoodKnob
            key={mood.id}
            label={mood.label}
            icon={mood.icon}
            active={selected.has(mood.id)}
            onPress={() => handleToggle(mood.id)}
          />
        ))}

        {/* Spacer pushes Anything to the right */}
        <div style={{ flex: "0 0 40px" }} />

        {/* Anything knob — spaced apart */}
        <MoodKnob
          label={ANYTHING_MOOD.label}
          icon={ANYTHING_MOOD.icon}
          active={isAnythingActive}
          onPress={() => handleToggle("anything")}
        />
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
      style={{ gap: 6 }}
    >
      {/* Label above knob */}
      <span
        className="text-center text-text-secondary leading-tight"
        style={{ fontSize: 12 }}
      >
        {label}
      </span>

      {/* Knob body: 56x56, always surface bg — depth changes on select */}
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
            fontSize: 24,
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
          width: 8,
          height: 8,
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
