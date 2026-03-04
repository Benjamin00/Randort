import { NextResponse } from "next/server";
import type { GeocodeResponse, GeocodeErrorResponse } from "@/lib/types";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodeResult {
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface GoogleGeocodeResponse {
  results: GoogleGeocodeResult[];
  status: string;
  error_message?: string;
}

function validateRequest(
  body: unknown,
): { address: string } | string {
  if (body === null || typeof body !== "object") return "Invalid request body";
  const b = body as Record<string, unknown>;

  if (typeof b.address !== "string" || b.address.trim().length === 0) {
    return "address is required";
  }
  if (b.address.trim().length > 200) {
    return "address is too long";
  }

  return { address: b.address.trim() };
}

export async function POST(
  request: Request,
): Promise<NextResponse<GeocodeResponse | GeocodeErrorResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateRequest(body);
  if (typeof validated === "string") {
    return NextResponse.json({ error: validated }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Geocoding service unavailable" },
      { status: 503 },
    );
  }

  try {
    const params = new URLSearchParams({
      address: validated.address,
      key: API_KEY,
    });

    const res = await fetch(`${GEOCODE_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Google Geocoding API returned ${res.status}`);
    }

    const data = (await res.json()) as GoogleGeocodeResponse;

    if (data.status === "ZERO_RESULTS" || data.results.length === 0) {
      return NextResponse.json(
        { error: "Could not find that location. Try a more specific address." },
        { status: 404 },
      );
    }

    if (data.status !== "OK") {
      throw new Error(data.error_message ?? `Google status: ${data.status}`);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return NextResponse.json({ lat, lng });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/geocode] ERROR:", message);
    return NextResponse.json(
      { error: "Failed to geocode address. Please try again." },
      { status: 502 },
    );
  }
}
