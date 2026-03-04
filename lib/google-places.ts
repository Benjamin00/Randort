import type { PlaceResult } from "./types";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

/* ── Raw Google response shapes (only the fields we use) ────────────────── */

interface GooglePeriod {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

interface GooglePlace {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
  price_level?: number;
  vicinity?: string;
  opening_hours?: {
    open_now?: boolean;
    periods?: GooglePeriod[];
  };
}

interface GoogleNearbyResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

/* ── Place Details raw shapes ─────────────────────────────────────────────── */

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry: { location: { lat: number; lng: number } };
  photos?: { photo_reference: string; height: number; width: number }[];
  price_level?: number;
  vicinity?: string;
  editorial_summary?: { overview: string; language: string };
  reviews?: GoogleReview[];
  opening_hours?: {
    open_now?: boolean;
    periods?: GooglePeriod[];
    weekday_text?: string[];
  };
}

interface GoogleDetailsResponse {
  result: GooglePlaceDetails;
  status: string;
  error_message?: string;
}

/* ── Nearby Search ──────────────────────────────────────────────────────── */

/**
 * Calls Google Places Nearby Search. When `types` has entries the API is
 * called once per type (Nearby Search only accepts a single type per call)
 * and results are de-duped by place_id.
 */
export async function nearbySearch(
  lat: number,
  lng: number,
  radiusMeters: number,
  types: string[],
): Promise<GooglePlace[]> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  console.log("[nearbySearch] Starting", { lat, lng, radiusMeters, typeCount: types.length });

  const typesToQuery = types.length > 0 ? types : [undefined];

  const fetches = typesToQuery.map(async (type) => {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(Math.round(radiusMeters)),
      opennow: "true",
      key: API_KEY,
    });
    if (type) params.set("type", type);

    const url = `${NEARBY_URL}?${params.toString()}`;
    console.log("[nearbySearch] Fetching type:", type ?? "(none)", "→", url.replace(API_KEY, "KEY"));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google API ${res.status}`);

    const data = (await res.json()) as GoogleNearbyResponse;
    console.log("[nearbySearch] Type:", type ?? "(none)", "status:", data.status, "results:", data.results?.length ?? 0);

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message ?? `Google status: ${data.status}`);
    }
    return data.results ?? [];
  });

  const allResults = (await Promise.all(fetches)).flat();
  console.log("[nearbySearch] Total raw results (before dedup):", allResults.length);

  /* De-dupe by place_id */
  const seen = new Set<string>();
  const deduped = allResults.filter((p) => {
    if (seen.has(p.place_id)) return false;
    seen.add(p.place_id);
    return true;
  });

  console.log("[nearbySearch] After dedup:", deduped.length);
  return deduped;
}

/* ── Place Details ─────────────────────────────────────────────────────── */

const DETAILS_FIELDS = [
  "place_id",
  "name",
  "rating",
  "user_ratings_total",
  "types",
  "geometry",
  "photos",
  "price_level",
  "vicinity",
  "editorial_summary",
  "reviews",
  "opening_hours",
].join(",");

/**
 * Calls Google Place Details (Legacy) for a single place_id.
 * Requests the Atmosphere fields (reviews, editorial_summary) plus
 * Basic fields (name, geometry, photos, etc.).
 */
export async function placeDetails(placeId: string): Promise<GooglePlaceDetails> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const params = new URLSearchParams({
    place_id: placeId,
    fields: DETAILS_FIELDS,
    key: API_KEY,
  });

  const url = `${DETAILS_URL}?${params.toString()}`;
  console.log("[placeDetails] Fetching", placeId, "→", url.replace(API_KEY, "KEY"));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Details API ${res.status}`);

  const data = (await res.json()) as GoogleDetailsResponse;
  console.log("[placeDetails] Status:", data.status);

  if (data.status !== "OK") {
    throw new Error(data.error_message ?? `Google Details status: ${data.status}`);
  }

  const d = data.result;
  console.log("[placeDetails] Result:", {
    name: d.name,
    rating: d.rating,
    reviewCount: d.user_ratings_total,
    photoCount: d.photos?.length ?? 0,
    hasEditorialSummary: !!d.editorial_summary,
    reviewsReturned: d.reviews?.length ?? 0,
    priceLevel: d.price_level,
    hasHours: !!d.opening_hours,
  });

  if (d.editorial_summary) {
    console.log("[placeDetails] Editorial summary:", d.editorial_summary.overview);
  }
  if (d.reviews && d.reviews.length > 0) {
    console.log("[placeDetails] Reviews sample:", d.reviews.map(r => ({
      rating: r.rating,
      textLen: r.text.length,
      preview: r.text.slice(0, 80),
    })));
  }

  return d;
}

/* ── Availability filter ────────────────────────────────────────────────── */

/**
 * Spec rules:
 *  1. opennow=true already sent to Google
 *  2. Check opening_hours.periods vs current time
 *  3. Exclude closing in < 60 min
 *  4. No hours data → include, hoursConfirmed = false
 *  5. After 11 PM → relax buffer to 30 min
 *  6. 24-hour → always include
 */
export function minutesUntilClose(
  periods: GooglePeriod[] | undefined,
  now: Date,
): { minutesLeft: number | null; closesAt: string | null; hoursConfirmed: boolean } {
  if (!periods || periods.length === 0) {
    return { minutesLeft: null, closesAt: null, hoursConfirmed: false };
  }

  /* A single period with open but no close means 24 hours */
  if (periods.length === 1 && !periods[0].close) {
    return { minutesLeft: null, closesAt: null, hoursConfirmed: true };
  }

  const nowDay = now.getDay(); // 0=Sun
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  /* Find the period that covers "now" */
  for (const period of periods) {
    if (period.open.day !== nowDay) continue;
    if (!period.close) {
      return { minutesLeft: null, closesAt: null, hoursConfirmed: true };
    }

    const openMin = parseInt(period.open.time.slice(0, 2)) * 60 + parseInt(period.open.time.slice(2));
    let closeMin = parseInt(period.close.time.slice(0, 2)) * 60 + parseInt(period.close.time.slice(2));

    /* Handle overnight closing (close day differs from open day) */
    if (period.close.day !== period.open.day) {
      closeMin += 24 * 60;
    }

    if (nowMinutes >= openMin && nowMinutes < closeMin) {
      const left = closeMin - nowMinutes;
      const closeHH = period.close.time.slice(0, 2);
      const closeMM = period.close.time.slice(2);
      return {
        minutesLeft: left,
        closesAt: `${closeHH}:${closeMM}`,
        hoursConfirmed: true,
      };
    }
  }

  /* No matching period found — include but flag as unconfirmed */
  return { minutesLeft: null, closesAt: null, hoursConfirmed: false };
}

/* ── Transform + filter pipeline ────────────────────────────────────────── */

export function filterAndTransform(
  raw: GooglePlace[],
  options: {
    maxPriceLevel: number | null;
    now?: Date;
  },
): PlaceResult[] {
  const now = options.now ?? new Date();
  const hour = now.getHours();
  const lateNight = hour >= 23 || hour < 4;
  const minBuffer = lateNight ? 30 : 60;

  console.log("[filterAndTransform] Input:", raw.length, "places. maxPrice:", options.maxPriceLevel, "lateNight:", lateNight);

  const results: PlaceResult[] = [];
  let skippedRating = 0;
  let skippedPrice = 0;
  let skippedClosing = 0;

  for (const place of raw) {
    /* Automatic quality filter: exclude places rated below 3.5 stars,
       unless they have fewer than 4 reviews (not enough data to judge) */
    const reviewCount = place.user_ratings_total ?? 0;
    if (reviewCount >= 4 && (place.rating === undefined || place.rating < 3.5)) {
      skippedRating++;
      continue;
    }

    /* Price filter */
    if (options.maxPriceLevel !== null) {
      if (place.price_level !== undefined && place.price_level > options.maxPriceLevel) {
        skippedPrice++;
        continue;
      }
    }

    /* Availability filter */
    const closing = minutesUntilClose(
      place.opening_hours?.periods,
      now,
    );

    if (closing.hoursConfirmed && closing.minutesLeft !== null && closing.minutesLeft < minBuffer) {
      skippedClosing++;
      continue;
    }

    results.push({
      id: place.place_id,
      name: place.name,
      rating: place.rating ?? 0,
      reviewCount: place.user_ratings_total ?? 0,
      types: place.types ?? [],
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      photoRef: place.photos?.[0]?.photo_reference ?? null,
      priceLevel: place.price_level ?? null,
      vicinity: place.vicinity ?? "",
      closesAt: closing.closesAt,
      minutesUntilClose: closing.minutesLeft,
      hoursConfirmed: closing.hoursConfirmed,
    });
  }

  console.log("[filterAndTransform] Skipped:", { rating: skippedRating, price: skippedPrice, closing: skippedClosing });
  console.log("[filterAndTransform] Passed:", results.length);

  return results;
}
