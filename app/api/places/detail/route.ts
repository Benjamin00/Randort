import { NextResponse } from "next/server";
import { placeDetails, minutesUntilClose } from "@/lib/google-places";
import { buildMysteryBlurb } from "@/lib/blurb-builder";
import { buildPhotoUrl } from "@/lib/photo";
import { haversineMeters } from "@/lib/geo";
import type { DetailRequest, EnrichedPlace, PlacesErrorResponse } from "@/lib/types";

/* ── Validation ──────────────────────────────────────────────────────────── */

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateRequest(body: unknown): DetailRequest | string {
  if (body === null || typeof body !== "object") return "Invalid JSON body";
  const b = body as Record<string, unknown>;

  if (typeof b.placeId !== "string" || b.placeId.length === 0) return "Invalid placeId";
  if (!isFiniteNumber(b.lat) || b.lat < -90 || b.lat > 90) return "Invalid lat";
  if (!isFiniteNumber(b.lng) || b.lng < -180 || b.lng > 180) return "Invalid lng";

  return {
    placeId: b.placeId,
    lat: b.lat,
    lng: b.lng,
  };
}

/* ── POST /api/places/detail ──────────────────────────────────────────── */

interface DetailResponse {
  place: EnrichedPlace;
}

export async function POST(
  request: Request,
): Promise<NextResponse<DetailResponse | PlacesErrorResponse>> {
  console.log("\n[/api/places/detail] ═══════════════════════════════════");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateRequest(body);
  if (typeof validated === "string") {
    console.log("[/api/places/detail] Validation failed:", validated);
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  const { placeId, lat, lng } = validated;
  console.log("[/api/places/detail] Request:", { placeId, lat, lng });

  try {
    const details = await placeDetails(placeId);

    /* Build mystery blurb */
    const mysteryBlurb = buildMysteryBlurb(details);

    /* Photo URL */
    const photoRef = details.photos?.[0]?.photo_reference ?? null;
    const photoUrl = photoRef ? buildPhotoUrl(photoRef, 800) : null;

    /* Distance */
    const placeLat = details.geometry.location.lat;
    const placeLng = details.geometry.location.lng;
    const distanceMeters = Math.round(haversineMeters(lat, lng, placeLat, placeLng));

    /* Hours */
    const now = new Date();
    const closing = minutesUntilClose(details.opening_hours?.periods, now);

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

    console.log("[/api/places/detail] ✓ Enriched:", {
      id: enriched.id,
      rating: enriched.rating,
      distanceMeters: enriched.distanceMeters,
      blurbLength: enriched.mysteryBlurb.length,
    });

    return NextResponse.json({ place: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/places/detail] ERROR:", message);
    return NextResponse.json(
      { error: "Failed to fetch place details. Please try again." },
      { status: 502 },
    );
  }
}
