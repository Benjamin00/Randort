"use client";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type PriceLevel = 0 | 1 | 2 | 3 | null;

/* ─── Price options ──────────────────────────────────────────────────────── */

interface PriceOption {
  value: PriceLevel;
  label: string;
}

const PRICE_OPTIONS: PriceOption[] = [
  { value: null, label: "Any Price" },
  { value: 0, label: "Free" },
  { value: 1, label: "Budget Friendly" },
  { value: 2, label: "Not too Pricey" },
  { value: 3, label: "Splurge" },
];

/* ─── Knob geometry ──────────────────────────────────────────────────────── */

/* Arc: pointer sweeps ~120° (from -60° to +60°, 0° = right).
   "Any Price" at -60°, "Splurge" at +60°. */
const ARC_DEGREES = 120;
const HALF_ARC = ARC_DEGREES / 2;

function getAngleForIndex(index: number): number {
  if (PRICE_OPTIONS.length <= 1) return 0;
  return -HALF_ARC + (index / (PRICE_OPTIONS.length - 1)) * ARC_DEGREES;
}

const OPTION_ANGLES = PRICE_OPTIONS.map((_, i) => getAngleForIndex(i));

const KNOB_R = 28;
const ARM_LENGTH = 10;
const ARM_TIP_R = 4;
const TICK_INNER = KNOB_R + 4;
const TICK_OUTER = KNOB_R + 10;

/* SVG viewport — enough room for knob + arm + tip + shadow */
const SVG_SIZE = (KNOB_R + ARM_LENGTH + ARM_TIP_R + 8) * 2;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

function KnobDial({ angleDeg }: { angleDeg: number }) {
  return (
    <g>
      {/* Tick marks at each option angle */}
      {OPTION_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={CX + Math.cos(rad) * TICK_INNER}
            y1={CY + Math.sin(rad) * TICK_INNER}
            x2={CX + Math.cos(rad) * TICK_OUTER}
            y2={CY + Math.sin(rad) * TICK_OUTER}
            stroke="#C5C0B8"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}

      {/* Stationary knob body */}
      <circle
        cx={CX}
        cy={CY}
        r={KNOB_R}
        fill="var(--color-roll-bg)"
        style={{
          filter:
            "drop-shadow(3px 4px 8px rgba(0,0,0,0.45)) drop-shadow(-2px -2px 4px rgba(0,0,0,0.15))",
        }}
      />

      {/* Inner rim highlight */}
      <circle
        cx={CX}
        cy={CY}
        r={KNOB_R - 2}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={1.5}
      />

      {/* Pointer arm — rotates around (CX, CY) via SVG transform.
          Drawn pointing right; `rotate(angle, CX, CY)` orbits it. */}
      <g
        transform={`rotate(${angleDeg}, ${CX}, ${CY})`}
        style={{ transition: "transform 0.05s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
      >
        {/* Dark pill background */}
        <rect
          x={CX + KNOB_R - 4}
          y={CY - 5}
          width={ARM_LENGTH + 8}
          height={10}
          rx={5}
          fill="var(--color-roll-bg)"
          style={{
            filter: "drop-shadow(1px 1px 3px rgba(0,0,0,0.3))",
          }}
        />

        {/* White center line */}
        <line
          x1={CX + KNOB_R - 2}
          y1={CY}
          x2={CX + KNOB_R + ARM_LENGTH}
          y2={CY}
          stroke="var(--color-roll-text)"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.8}
        />
      </g>
    </g>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export function PriceSelector({
  value,
  onChange,
}: {
  value: PriceLevel;
  onChange: (next: PriceLevel) => void;
}) {
  const currentIndex = PRICE_OPTIONS.findIndex((o) => o.value === value);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentAngle = OPTION_ANGLES[safeIndex];

  function handleKnobClick() {
    const nextIndex = (safeIndex + 1) % PRICE_OPTIONS.length;
    onChange(PRICE_OPTIONS[nextIndex].value);
  }

  return (
    <div className="flex items-center justify-center" style={{ gap: 24 }}>
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="shrink-0 cursor-pointer"
        onClick={handleKnobClick}
        role="button"
        aria-label="Rotate price selector"
        overflow="visible"
      >
        <KnobDial angleDeg={currentAngle} />
      </svg>

      <div
        className="flex flex-col"
        role="radiogroup"
        aria-label="Maximum price level"
      >
        {PRICE_OPTIONS.map((option, index) => {
          const isSelected = safeIndex === index;
          const isAnyPrice = option.value === null;
          const isLit = isSelected && !isAnyPrice;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className="cursor-pointer text-left text-sm font-medium rounded"
              style={{
                padding: "3px 4px",
                color: isLit
                  ? "#D4920F"
                  : isSelected
                    ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                textShadow: isLit
                  ? "0 0 10px rgba(212,146,15,0.5)"
                  : "none",
                marginBottom: index === 0 ? 4 : 0,
                transition: "color 0.2s ease, text-shadow 0.2s ease",
              }}
              role="radio"
              aria-checked={isSelected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
