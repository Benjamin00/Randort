import { NextResponse } from "next/server";
import { nearbySearch, filterAndTransform, placeDetails, minutesUntilClose } from "@/lib/google-places";
import { buildMysteryBlurb } from "@/lib/blurb-builder";
import { buildPhotoUrl } from "@/lib/photo";
import { haversineMeters } from "@/lib/geo";
import type { PlacesRequest, RollResponse, EnrichedPlace, PlacesErrorResponse } from "@/lib/types";

/* ── Validation helpers ─────────────────────────────────────────────────── */

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateRequest(body: unknown): PlacesRequest | string {
  if (body === null || typeof body !== "object") return "Invalid JSON body";
  const b = body as Record<string, unknown>;

  if (!isFiniteNumber(b.lat) || b.lat < -90 || b.lat > 90) return "Invalid lat";
  if (!isFiniteNumber(b.lng) || b.lng < -180 || b.lng > 180) return "Invalid lng";
  if (!isFiniteNumber(b.radius) || b.radius <= 0 || b.radius > 50000) return "Invalid radius";

  const types = b.types;
  if (!Array.isArray(types) || !types.every((t) => typeof t === "string")) {
    return "types must be a string array";
  }

  let maxPriceLevel: number | null = null;
  if (b.maxPriceLevel !== null && b.maxPriceLevel !== undefined) {
    if (!isFiniteNumber(b.maxPriceLevel) || b.maxPriceLevel < 0 || b.maxPriceLevel > 3) {
      return "Invalid maxPriceLevel";
    }
    maxPriceLevel = b.maxPriceLevel;
  }

  return {
    lat: b.lat,
    lng: b.lng,
    radius: b.radius,
    types: types as string[],
    maxPriceLevel,
  };
}

/* ── Enrich a single place with Place Details ─────────────────────────── */

async function enrichPlace(
  placeId: string,
  userLat: number,
  userLng: number,
): Promise<EnrichedPlace> {
  console.log("[enrichPlace] Starting enrichment for", placeId);

  const details = await placeDetails(placeId);

  /* Build mystery blurb from editorial summary + reviews */
  const mysteryBlurb = buildMysteryBlurb(details);

  /* Photo URL: use the first (largest/most relevant) photo */
  const photoRef = details.photos?.[0]?.photo_reference ?? null;
  const photoUrl = photoRef ? buildPhotoUrl(photoRef, 800) : null;
  console.log("[enrichPlace] Photo:", photoRef ? "yes" : "none");

  /* Distance from user */
  const placeLat = details.geometry.location.lat;
  const placeLng = details.geometry.location.lng;
  const distanceMeters = Math.round(haversineMeters(userLat, userLng, placeLat, placeLng));
  console.log("[enrichPlace] Distance:", distanceMeters, "m");

  /* Hours from Place Details (more detailed than Nearby Search data) */
  const now = new Date();
  const closing = minutesUntilClose(details.opening_hours?.periods, now);
  console.log("[enrichPlace] Closing:", closing);

  const enriched: EnrichedPlace = {
    id: details.place_id,
    googlePlaceId: details.place_id,
    rating: details.rating ?? 0,
    reviewCount: details.user_ratings_total ?? 0,
    types: details.types ?? [],
    lat: placeLat,
    lng: placeLng,
    photoUrl,
    priceLevel: details.price_level ?? null,
    distanceMeters,
    closesAt: closing.closesAt,
    minutesUntilClose: closing.minutesLeft,
    hoursConfirmed: closing.hoursConfirmed,
    mysteryBlurb,
    name: details.name,
    vicinity: details.vicinity ?? "",
  };

  console.log("[enrichPlace] Final enriched place:", {
    id: enriched.id,
    rating: enriched.rating,
    reviewCount: enriched.reviewCount,
    priceLevel: enriched.priceLevel,
    distanceMeters: enriched.distanceMeters,
    hasPhoto: !!enriched.photoUrl,
    blurbLength: enriched.mysteryBlurb.length,
    closesAt: enriched.closesAt,
    minutesUntilClose: enriched.minutesUntilClose,
  });

  return enriched;
}

/* ── POST /api/places ───────────────────────────────────────────────────── */

export async function POST(request: Request): Promise<NextResponse<RollResponse | PlacesErrorResponse>> {
  console.log("\n[/api/places] ═══════════════════════════════════════════");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateRequest(body);
  if (typeof validated === "string") {
    console.log("[/api/places] Validation failed:", validated);
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  const { lat, lng, radius, types, maxPriceLevel } = validated;
  console.log("[/api/places] Request:", { lat, lng, radius, typeCount: types.length, maxPriceLevel });

  try {
    /* Step 1: Nearby Search */
    const raw = await nearbySearch(lat, lng, radius, types);

    /* Step 2: Filter (quality, price, availability, chains, boring types) */
    const filtered = filterAndTransform(raw, { maxPriceLevel, requestedTypes: types });

    if (filtered.length === 0) {
      console.log("[/api/places] Zero results after filtering");
      return NextResponse.json(
        { error: "No places match your filters. Try widening your search." },
        { status: 404 },
      );
    }

    /* Step 3: Shuffle (Fisher-Yates) */
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    console.log("[/api/places] Shuffled. First pick:", filtered[0].name, `(${filtered[0].id})`);

    /* Step 4: Enrich the first result with Place Details */
    const enriched = await enrichPlace(filtered[0].id, lat, lng);

    /* Step 5: Collect remaining IDs for re-rolls */
    const remainingIds = filtered.slice(1).map((p) => p.id);
    console.log("[/api/places] Remaining IDs for re-roll:", remainingIds.length);

    const response: RollResponse = {
      place: enriched,
      remainingIds,
      totalMatches: filtered.length,
    };

    console.log("[/api/places] ✓ Returning enriched place +", remainingIds.length, "remaining");
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/places] ERROR:", message);

    /* Surface API-specific errors to help with debugging */
    const isApiNotEnabled = message.includes("403") || message.includes("not enabled") || message.includes("PERMISSION_DENIED");
    const userMessage = isApiNotEnabled
      ? "Google Places API (New) may not be enabled. Check your Google Cloud Console."
      : "Failed to fetch places. Please try again.";

    return NextResponse.json(
      { error: userMessage, detail: message },
      { status: 502 },
    );
  }
}
