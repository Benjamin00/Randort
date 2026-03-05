import type { PlaceResult } from "./types";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";

/* ── New API response shapes (only the fields we request) ──────────────── */

interface NewApiPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

interface NewApiPhoto {
  name: string;
  heightPx: number;
  widthPx: number;
}

interface NewApiReview {
  rating: number;
  text?: { text: string; languageCode: string };
  relativePublishTimeDescription?: string;
}

interface NewApiPlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: NewApiPhoto[];
  formattedAddress?: string;
  shortFormattedAddress?: string;
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: NewApiPeriod[];
  };
  editorialSummary?: { text: string; languageCode: string };
  reviews?: NewApiReview[];
}

interface NewApiNearbyResponse {
  places?: NewApiPlace[];
}

/* ── Price level conversion ─────────────────────────────────────────────── */

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function parsePriceLevel(level: string | undefined): number | null {
  if (!level) return null;
  return PRICE_LEVEL_MAP[level] ?? null;
}

/* ── Nearby Search (New) ───────────────────────────────────────────────── */

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.photos",
  "places.shortFormattedAddress",
  "places.currentOpeningHours",
].join(",");

/** Max types per Nearby Search (New) request */
const MAX_TYPES_PER_REQUEST = 50;

/**
 * Single Nearby Search (New) POST. Accepts up to 50 includedTypes.
 */
async function nearbySearchSingle(
  lat: number,
  lng: number,
  radiusMeters: number,
  types: string[],
): Promise<NewApiPlace[]> {
  const body: Record<string, unknown> = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50000),
      },
    },
    maxResultCount: 20,
    languageCode: "en",
  };

  if (types.length > 0) {
    body.includedTypes = types;
  }

  console.log("[nearbySearch] POST with", types.length, "includedTypes");

  const res = await fetch(NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[nearbySearch] Error response:", res.status, errorBody);
    throw new Error(`Google Nearby Search API ${res.status}: ${errorBody}`);
  }

  const data = (await res.json()) as NewApiNearbyResponse;
  return data.places ?? [];
}

/**
 * Calls Google Places Nearby Search (New). When the type list exceeds
 * 50 (the API maximum), splits into batched parallel requests and
 * de-dupes the combined results by place ID.
 */
export async function nearbySearch(
  lat: number,
  lng: number,
  radiusMeters: number,
  types: string[],
): Promise<NewApiPlace[]> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  console.log("[nearbySearch] Starting (New API)", { lat, lng, radiusMeters, typeCount: types.length });

  /* If types fit in one request, send directly */
  if (types.length <= MAX_TYPES_PER_REQUEST) {
    const places = await nearbySearchSingle(lat, lng, radiusMeters, types);
    console.log("[nearbySearch] Results:", places.length);
    return places;
  }

  /* Split into batches of MAX_TYPES_PER_REQUEST and run in parallel */
  const batches: string[][] = [];
  for (let i = 0; i < types.length; i += MAX_TYPES_PER_REQUEST) {
    batches.push(types.slice(i, i + MAX_TYPES_PER_REQUEST));
  }
  console.log("[nearbySearch] Splitting into", batches.length, "batches");

  const batchResults = await Promise.all(
    batches.map((batch) => nearbySearchSingle(lat, lng, radiusMeters, batch)),
  );

  /* De-dupe by place ID */
  const seen = new Set<string>();
  const deduped: NewApiPlace[] = [];
  for (const places of batchResults) {
    for (const place of places) {
      if (!seen.has(place.id)) {
        seen.add(place.id);
        deduped.push(place);
      }
    }
  }

  console.log("[nearbySearch] Combined results (deduped):", deduped.length);
  return deduped;
}

/* ── Place Details (New) ───────────────────────────────────────────────── */

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "types",
  "primaryType",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos",
  "shortFormattedAddress",
  "formattedAddress",
  "currentOpeningHours",
  "editorialSummary",
  "reviews",
].join(",");

/**
 * Exported type matching the shape blurb-builder.ts and route handlers expect.
 * Normalised from the New API response to keep consumers unchanged.
 */
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
  reviews?: { author_name: string; rating: number; text: string; time: number; relative_time_description: string }[];
  opening_hours?: {
    open_now?: boolean;
    periods?: { open: { day: number; time: string }; close?: { day: number; time: string } }[];
    weekday_text?: string[];
  };
}

/**
 * Calls Google Place Details (New) for a single place ID and normalises
 * the response into the GooglePlaceDetails shape used by downstream code.
 */
export async function placeDetails(placeId: string): Promise<GooglePlaceDetails> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  console.log("[placeDetails] Fetching (New API)", placeId);

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("[placeDetails] Error:", res.status, errorBody);
    throw new Error(`Google Details API ${res.status}: ${errorBody}`);
  }

  const raw = (await res.json()) as NewApiPlace;

  /* Normalise New API → legacy-shaped GooglePlaceDetails for consumers */
  const d = normalisePlace(raw);

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

/* ── New → legacy shape normalisation ──────────────────────────────────── */

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
}

function normalisePlace(raw: NewApiPlace): GooglePlaceDetails {
  const periods = raw.currentOpeningHours?.periods?.map((p) => {
    const result: { open: { day: number; time: string }; close?: { day: number; time: string } } = {
      open: { day: p.open.day, time: padTime(p.open.hour, p.open.minute) },
    };
    if (p.close) {
      result.close = { day: p.close.day, time: padTime(p.close.hour, p.close.minute) };
    }
    return result;
  });

  return {
    place_id: raw.id,
    name: raw.displayName?.text ?? "",
    rating: raw.rating,
    user_ratings_total: raw.userRatingCount,
    types: raw.types,
    geometry: {
      location: {
        lat: raw.location?.latitude ?? 0,
        lng: raw.location?.longitude ?? 0,
      },
    },
    photos: raw.photos?.map((p) => ({
      photo_reference: p.name,
      height: p.heightPx,
      width: p.widthPx,
    })),
    price_level: parsePriceLevel(raw.priceLevel) ?? undefined,
    vicinity: raw.shortFormattedAddress ?? raw.formattedAddress ?? "",
    editorial_summary: raw.editorialSummary
      ? { overview: raw.editorialSummary.text, language: raw.editorialSummary.languageCode }
      : undefined,
    reviews: raw.reviews?.map((r) => ({
      author_name: "",
      rating: r.rating,
      text: r.text?.text ?? "",
      time: 0,
      relative_time_description: r.relativePublishTimeDescription ?? "",
    })),
    opening_hours: raw.currentOpeningHours
      ? {
          open_now: raw.currentOpeningHours.openNow,
          periods,
        }
      : undefined,
  };
}

/* ── Availability filter ────────────────────────────────────────────────── */

interface LegacyPeriod {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

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
  periods: LegacyPeriod[] | undefined,
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

/* ── Chain / big-box store filter ───────────────────────────────────────── *
 *
 * Normalized name substrings that indicate a chain or big-box store.
 * Matched case-insensitively against the place name. These are the kinds
 * of places that are never an interesting "discovery" for the user.
 * ─────────────────────────────────────────────────────────────────────── */

const CHAIN_BLOCKLIST: string[] = [
  // Big-box / home improvement / department
  "lowe's", "lowes", "home depot", "menards",
  "walmart", "target", "costco", "sam's club", "sams club",
  "kmart", "big lots", "dollar general", "dollar tree", "family dollar",
  "five below", "ross dress", "marshalls", "tj maxx", "tjmaxx",
  "burlington coat", "nordstrom rack",
  // Electronics / office
  "best buy", "staples", "office depot", "officemax",
  // Grocery chains (boring discovery)
  "kroger", "safeway", "albertsons", "publix", "aldi", "lidl",
  "food lion", "piggly wiggly", "winn-dixie", "winn dixie",
  "giant eagle", "meijer", "hy-vee", "hyvee",
  // Pharmacies / convenience
  "walgreens", "cvs pharmacy", "rite aid",
  "7-eleven", "7 eleven", "circle k", "wawa", "sheetz", "quiktrip",
  "speedway", "casey's", "caseys",
  // Auto / gas
  "autozone", "o'reilly auto", "advance auto", "napa auto",
  // Fast-food chains (discovery-hostile)
  "mcdonald's", "mcdonalds", "burger king", "wendy's", "wendys",
  "taco bell", "chick-fil-a", "chickfila", "chick fil a",
  "subway", "arby's", "arbys", "popeyes",
  "jack in the box", "sonic drive", "panda express",
  "chipotle", "five guys", "jimmy john",
  "domino's", "dominos", "papa john", "little caesars", "little caesar",
  "pizza hut", "kfc", "church's chicken",
  "dunkin", "starbucks",
  // Casual-dining chains
  "applebee's", "applebees", "chili's", "chilis",
  "olive garden", "red lobster", "outback steakhouse",
  "cracker barrel", "denny's", "dennys", "ihop",
  "waffle house", "bob evans", "golden corral",
  "buffalo wild wings", "hooters", "texas roadhouse",
  "longhorn steakhouse", "cheesecake factory",
  "red robin", "tgi friday", "t.g.i. friday",
  "panera", "noodles & company", "noodles and company",
];

/**
 * Google Place types that are never interesting as a discovery result,
 * regardless of mood. If a place's *primary* type is one of these, it
 * gets filtered out.
 */
const BORING_PRIMARY_TYPES: Set<string> = new Set([
  // Retail / shopping (unless the mood specifically includes them)
  "home_improvement_store",
  "hardware_store",
  "department_store",
  "discount_store",
  "warehouse_store",
  "wholesaler",
  "supermarket",
  "grocery_store",
  "convenience_store",
  "auto_parts_store",
  "cell_phone_store",
  "gas_station",
  "car_wash",
  "car_repair",
  "car_dealer",
  "tire_shop",
  // Services / errands
  "locksmith",
  "plumber",
  "electrician",
  "roofing_contractor",
  "moving_company",
  "insurance_agency",
  "real_estate_agency",
  "lawyer",
  "accounting",
  "bank",
  "atm",
  "post_office",
  "laundry",
  "dry_cleaning",
  "storage",
  // Medical
  "dentist",
  "dental_clinic",
  "doctor",
  "hospital",
  "medical_clinic",
  "pharmacy",
  "drugstore",
  "veterinary_care",
  // Transit (unless specifically asked for)
  "parking",
  "parking_lot",
  "parking_garage",
]);

function isChainStore(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_BLOCKLIST.some((chain) => lower.includes(chain));
}

function hasBoringPrimaryType(primaryType: string | undefined, requestedTypes: Set<string>): boolean {
  if (!primaryType) return false;
  return BORING_PRIMARY_TYPES.has(primaryType) && !requestedTypes.has(primaryType);
}

/* ── Transform + filter pipeline ────────────────────────────────────────── */

export function filterAndTransform(
  raw: NewApiPlace[],
  options: {
    maxPriceLevel: number | null;
    requestedTypes: string[];
    now?: Date;
  },
): PlaceResult[] {
  const now = options.now ?? new Date();
  const hour = now.getHours();
  const lateNight = hour >= 23 || hour < 4;
  const minBuffer = lateNight ? 30 : 60;
  const requestedTypeSet = new Set(options.requestedTypes);

  console.log("[filterAndTransform] Input:", raw.length, "places. maxPrice:", options.maxPriceLevel, "lateNight:", lateNight);

  const results: PlaceResult[] = [];
  let skippedRating = 0;
  let skippedPrice = 0;
  let skippedClosing = 0;
  let skippedChain = 0;
  let skippedBoringType = 0;

  for (const place of raw) {
    const placeName = place.displayName?.text ?? "";

    /* Chain / big-box filter */
    if (isChainStore(placeName)) {
      skippedChain++;
      continue;
    }

    /* Boring primary-type filter (New API has an explicit primaryType field) */
    if (hasBoringPrimaryType(place.primaryType, requestedTypeSet)) {
      skippedBoringType++;
      continue;
    }

    /* Automatic quality filter: exclude places rated below 3.5 stars,
       unless they have fewer than 4 reviews (not enough data to judge) */
    const reviewCount = place.userRatingCount ?? 0;
    if (reviewCount >= 4 && (place.rating === undefined || place.rating < 3.5)) {
      skippedRating++;
      continue;
    }

    /* Price filter */
    const numericPrice = parsePriceLevel(place.priceLevel);
    if (options.maxPriceLevel !== null) {
      if (numericPrice !== null && numericPrice > options.maxPriceLevel) {
        skippedPrice++;
        continue;
      }
    }

    /* Availability filter */
    const normalised = normalisePlace(place);
    const closing = minutesUntilClose(
      normalised.opening_hours?.periods,
      now,
    );

    if (closing.hoursConfirmed && closing.minutesLeft !== null && closing.minutesLeft < minBuffer) {
      skippedClosing++;
      continue;
    }

    results.push({
      id: place.id,
      name: placeName,
      rating: place.rating ?? 0,
      reviewCount,
      types: place.types ?? [],
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      photoRef: place.photos?.[0]?.name ?? null,
      priceLevel: numericPrice,
      vicinity: place.shortFormattedAddress ?? "",
      closesAt: closing.closesAt,
      minutesUntilClose: closing.minutesLeft,
      hoursConfirmed: closing.hoursConfirmed,
    });
  }

  console.log("[filterAndTransform] Skipped:", { chain: skippedChain, boringType: skippedBoringType, rating: skippedRating, price: skippedPrice, closing: skippedClosing });
  console.log("[filterAndTransform] Passed:", results.length);

  return results;
}
