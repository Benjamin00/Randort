import type { MoodId } from "@/components/MoodSelector";
import { MOOD_TYPE_MAP } from "@/lib/types";

const CORE_MOODS: MoodId[] = ["eat", "go_out", "chill", "outside", "adventure"];

const MOOD_LABELS: Record<MoodId, string> = {
  eat: "Eat",
  go_out: "Go Out",
  chill: "Chill",
  outside: "Outside",
  adventure: "Adventure",
};

const MILES_TO_METERS = 1609.34;

/**
 * Convert the selected mood set into the Google Place type strings.
 * Empty set → all moods. Otherwise, map each selected mood to its types.
 */
export function moodsToTypes(selectedMoods: Set<MoodId>): string[] {
  /* If nothing selected, use all moods */
  const moods = selectedMoods.size === 0 ? new Set(CORE_MOODS) : selectedMoods;

  const types = new Set<string>();
  for (const mood of moods) {
    const mapped = MOOD_TYPE_MAP[mood];
    if (mapped) for (const t of mapped) types.add(t);
  }
  return [...types];
}

/**
 * Human-readable label for the current mood selection.
 * Empty set → "Anything". Otherwise, join the selected mood labels.
 */
export function deriveMoodLabel(moods: Set<MoodId>): string {
  if (moods.size === 0) return "Anything";
  return [...moods].map((m) => MOOD_LABELS[m] ?? m).join(" + ");
}

export function milesToMeters(miles: number): number {
  return Math.round(miles * MILES_TO_METERS);
}

export function metersToDisplayMiles(meters: number): number {
  return Math.round((meters / MILES_TO_METERS) * 10) / 10;
}
