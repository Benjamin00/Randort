const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

/**
 * Builds a Google Places (New) photo URL from a photo resource name.
 *
 * The New API returns photo names like "places/PLACE_ID/photos/PHOTO_REF".
 * The media endpoint is: https://places.googleapis.com/v1/{name}/media
 *
 * Note: These URLs contain the API key but are served server-side
 * only — the client receives the final image data, not this URL.
 */
export function buildPhotoUrl(
  photoName: string,
  maxWidth: number = 800,
): string {
  if (!API_KEY) {
    console.warn("[photo] GOOGLE_PLACES_API_KEY not set, returning empty URL");
    return "";
  }

  const params = new URLSearchParams({
    maxWidthPx: String(maxWidth),
    key: API_KEY,
  });

  return `https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`;
}
