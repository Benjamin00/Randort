import type { MoodId } from "@/components/MoodSelector";
import { MOOD_TYPE_MAP } from "@/lib/types";

/* The four specific moods — used as fallback when nothing is selected */
const CORE_MOODS: MoodId[] = ["eat", "go_out", "chill", "outside"];

const MOOD_LABELS: Record<MoodId, string> = {
  eat: "Eat",
  go_out: "Go Out",
  chill: "Chill",
  outside: "Outside",
  anything: "Anything",
};

const MILES_TO_METERS = 1609.34;

/**
 * Convert the selected mood set into the Google Place type strings
 * needed by the API. Empty set → all four core moods. "anything" →
 * every type across all moods.
 */
export function moodsToTypes(selectedMoods: Set<MoodId>): string[] {
  if (selectedMoods.size === 0) {
    const types = new Set<string>();
    for (const mood of CORE_MOODS) {
      const mapped = MOOD_TYPE_MAP[mood];
      if (mapped) for (const t of mapped) types.add(t);
    }
    return [...types];
  }

  if (selectedMoods.has("anything")) {
    const allTypes = new Set<string>();
    for (const types of Object.values(MOOD_TYPE_MAP)) {
      for (const t of types) allTypes.add(t);
    }
    return [...allTypes];
  }

  const types = new Set<string>();
  for (const mood of selectedMoods) {
    const mapped = MOOD_TYPE_MAP[mood];
    if (mapped) for (const t of mapped) types.add(t);
  }
  return [...types];
}

/**
 * Human-readable label for the current mood selection,
 * shown on the mystery card.
 */
export function deriveMoodLabel(moods: Set<MoodId>): string {
  if (moods.size === 0) return "Anything";
  return [...moods].map((m) => MOOD_LABELS[m] ?? m).join(" + ");
}

/** Miles → meters, used when building the API request. */
export function milesToMeters(miles: number): number {
  return Math.round(miles * MILES_TO_METERS);
}

/** Meters → display miles, rounded to 1 decimal. */
export function metersToDisplayMiles(meters: number): number {
  return Math.round((meters / MILES_TO_METERS) * 10) / 10;
}
