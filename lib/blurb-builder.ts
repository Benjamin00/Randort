import type { GooglePlaceDetails } from "./google-places";

/* ── Positive signal words for review snippet selection ──────────────────── */

const POSITIVE_WORDS = new Set([
  "great", "love", "loved", "perfect", "amazing", "cozy", "beautiful",
  "best", "favorite", "favourite", "recommend", "wonderful", "fantastic",
  "excellent", "delicious", "awesome", "incredible", "charming", "lovely",
  "relaxing", "friendly", "warm", "inviting", "gem", "hidden",
  "atmosphere", "vibe", "vibes", "unique", "special", "chill",
]);

/* ── Fallback templates keyed by broad place category ────────────────────── */

const FALLBACK_TEMPLATES: Record<string, string> = {
  restaurant: "Locals keep coming back for a reason.",
  cafe: "A spot worth discovering, one sip at a time.",
  bar: "The kind of place where the night finds its rhythm.",
  night_club: "Turn up the volume and see where the night takes you.",
  park: "Fresh air and room to think.",
  library: "A quiet spot to slow down and take a breath.",
  spa: "Leave feeling better than when you arrived.",
  museum: "Something new to see every time you look.",
  default: "Worth the trip. You'll see why when you get there.",
};

/* ── Sentence extraction ─────────────────────────────────────────────────── */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function wordCount(sentence: string): number {
  return sentence.split(/\s+/).length;
}

function hasPositiveSignal(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) return true;
  }
  return false;
}

/* ── Main blurb builder ──────────────────────────────────────────────────── */

/**
 * Builds a 2-4 sentence mystery blurb from Place Details data.
 *
 * Pipeline:
 * 1. Lead with editorial_summary if available
 * 2. Extract short positive sentences from reviews rated >= 4
 * 3. Fallback to type-based template if reviews are sparse
 *
 * Target: 30-60 words total.
 */
export function buildMysteryBlurb(details: GooglePlaceDetails): string {
  const parts: string[] = [];

  /* Source 1: editorial_summary */
  if (details.editorial_summary?.overview) {
    parts.push(details.editorial_summary.overview);
    console.log("[blurb] Using editorial summary as lead");
  }

  /* Source 2: review snippets */
  const snippets = extractReviewSnippets(details.reviews ?? []);
  console.log("[blurb] Extracted", snippets.length, "review snippets");

  if (snippets.length > 0) {
    const prefix = parts.length === 0 ? "Visitors say " : "";
    const joined = snippets.join(" ");
    parts.push(prefix + joined);
  }

  /* Source 3: fallback template if we have nothing */
  if (parts.length === 0) {
    const template = pickFallbackTemplate(details.types ?? []);
    console.log("[blurb] Using fallback template:", template);
    parts.push(template);
  }

  const blurb = parts.join(" ").trim();
  console.log("[blurb] Final blurb:", blurb, `(${wordCount(blurb)} words)`);
  return blurb;
}

/* ── Review snippet extraction ───────────────────────────────────────────── */

function extractReviewSnippets(reviews: NonNullable<GooglePlaceDetails["reviews"]>): string[] {
  /* Only use reviews rated >= 4 */
  const goodReviews = reviews.filter((r) => r.rating >= 4);
  console.log("[blurb] Reviews rated >= 4:", goodReviews.length, "of", reviews.length);

  const candidates: { sentence: string; score: number }[] = [];

  for (const review of goodReviews) {
    const sentences = splitSentences(review.text);
    for (const sentence of sentences) {
      const wc = wordCount(sentence);
      /* Keep sentences under 20 words that have positive signals */
      if (wc <= 20 && hasPositiveSignal(sentence)) {
        /* Score: shorter is better, higher review rating is better */
        const score = review.rating * 10 - wc;
        candidates.push({ sentence, score });
      }
    }
  }

  /* Sort by score descending, take top 2-3 */
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, 3).map((c) => {
    /* Ensure the snippet ends with punctuation */
    let s = c.sentence;
    if (!/[.!?]$/.test(s)) s += ".";
    /* Wrap in quotes for mystery feel */
    return `"${s}"`;
  });

  return selected;
}

/* ── Fallback template picker ────────────────────────────────────────────── */

function pickFallbackTemplate(types: string[]): string {
  for (const type of types) {
    if (type in FALLBACK_TEMPLATES) {
      return FALLBACK_TEMPLATES[type];
    }
  }
  return FALLBACK_TEMPLATES.default;
}
