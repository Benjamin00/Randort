const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo";

/**
 * Builds a Google Places photo URL from a photo_reference.
 * Returns the direct URL that redirects to the image.
 *
 * Note: These URLs contain the API key but are served server-side
 * only — the client receives the final image data, not this URL.
 * For MVP, we return this URL directly. In production, proxy through
 * our own /api/photo endpoint to hide the key.
 */
export function buildPhotoUrl(
  photoReference: string,
  maxWidth: number = 800,
): string {
  if (!API_KEY) {
    console.warn("[photo] GOOGLE_PLACES_API_KEY not set, returning empty URL");
    return "";
  }

  const params = new URLSearchParams({
    maxwidth: String(maxWidth),
    photo_reference: photoReference,
    key: API_KEY,
  });

  return `${PHOTO_URL}?${params.toString()}`;
}
