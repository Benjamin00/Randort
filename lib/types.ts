/* ── Geolocation ────────────────────────────────────────────────────────── */

export type GeolocationError =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "NOT_SUPPORTED";

export interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: GeolocationError | null;
  loading: boolean;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
}

export interface GeocodeErrorResponse {
  error: string;
}

/* ── Client → Server request ─────────────────────────────────────────────── */

export interface PlacesRequest {
  lat: number;
  lng: number;
  /** Radius in meters */
  radius: number;
  /** Google Place type strings derived from mood selection */
  types: string[];
  /** Maximum Google price level (0=free, 1=$, 2=$$, 3=$$$). null = no limit */
  maxPriceLevel: number | null;
}

export interface DetailRequest {
  placeId: string;
  /** User lat/lng for distance calculation */
  lat: number;
  lng: number;
}

/* ── Internal: Nearby Search result (before enrichment) ────────────────── */

export interface PlaceResult {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  types: string[];
  lat: number;
  lng: number;
  photoRef: string | null;
  priceLevel: number | null;
  vicinity: string;
  closesAt: string | null;
  minutesUntilClose: number | null;
  hoursConfirmed: boolean;
}

/* ── Enriched place for mystery card (after Place Details call) ─────────── */

export interface EnrichedPlace {
  id: string;
  googlePlaceId: string;
  rating: number;
  reviewCount: number;
  types: string[];
  lat: number;
  lng: number;
  /** Full-size photo URL served through our proxy */
  photoUrl: string | null;
  priceLevel: number | null;
  distanceMeters: number;
  closesAt: string | null;
  minutesUntilClose: number | null;
  hoursConfirmed: boolean;
  /** Server-built teaser from editorial_summary + review snippets */
  mysteryBlurb: string;
  /** Hidden from card UI — used only for maps deep link */
  name: string;
  /** Hidden from card UI — used only for maps deep link */
  vicinity: string;
}

/* ── Server → Client responses ──────────────────────────────────────────── */

export interface RollResponse {
  place: EnrichedPlace;
  remainingIds: string[];
  totalMatches: number;
}

export interface PlacesErrorResponse {
  error: string;
}

/* ── Mood → Google type mapping ─────────────────────────────────────────── *
 *
 * We use the Places API (New) Nearby Search which supports all Table A
 * types and accepts up to 50 includedTypes in a single POST request.
 *
 * Types sourced from Google Places API (New) Table A:
 * https://developers.google.com/maps/documentation/places/web-service/place-types
 * ─────────────────────────────────────────────────────────────────────── */

export const MOOD_TYPE_MAP: Record<string, string[]> = {
  eat: [
    "restaurant",
    "bakery",
    "cafe",
    "coffee_shop",
    "deli",
    "dessert_shop",
    "diner",
    "fine_dining_restaurant",
    "gastropub",
    "ice_cream_shop",
    "juice_shop",
    "meal_takeaway",
    "pastry_shop",
    "pizza_restaurant",
    "sandwich_shop",
    "steak_house",
    "sushi_restaurant",
    "vegan_restaurant",
    "vegetarian_restaurant",
    "tea_house",
  ],

  go_out: [
    "bar",
    "bar_and_grill",
    "beer_garden",
    "brewery",
    "brewpub",
    "cocktail_bar",
    "lounge_bar",
    "night_club",
    "pub",
    "sports_bar",
    "wine_bar",
    "comedy_club",
    "concert_hall",
    "dance_hall",
    "karaoke",
    "live_music_venue",
    "movie_theater",
    "performing_arts_theater",
    "video_arcade",
    "bowling_alley",
    "casino",
    "amusement_park",
    "amusement_center",
    "event_venue",
    "opera_house",
  ],

  chill: [
    "cafe",
    "coffee_shop",
    "tea_house",
    "book_store",
    "library",
    "art_gallery",
    "art_museum",
    "museum",
    "history_museum",
    "planetarium",
    "spa",
    "sauna",
    "wellness_center",
    "yoga_studio",
    "botanical_garden",
    "garden",
    "plaza",
    "fountain",
    "dessert_shop",
    "winery",
    "vineyard",
    "cultural_center",
    "public_bath",
    "massage_spa"
  ],

  outside: [
    "park",
    "city_park",
    "state_park",
    "national_park",
    "dog_park",
    "garden",
    "botanical_garden",
    "hiking_area",
    "beach",
    "lake",
    "river",
    "woods",
    "nature_preserve",
    "scenic_spot",
    "mountain_peak",
    "marina",
    "playground",
    "campground",
    "picnic_ground",
    "cycling_park",
    "skateboard_park",
    "athletic_field",
    "golf_course",
    "swimming_pool",
    "tennis_court",
    "wildlife_park",
    "wildlife_refuge",
    "zoo",
    "aquarium",
  ],

  adventure: [
    "tourist_attraction",
    "art_gallery",
    "museum",
    "amusement_park",
    "aquarium",
    "zoo",
    "book_store",
    "stadium",
    "castle",
    "cultural_landmark",
    "miniature_golf_course",
    "adventure_sports_center",
    "amusement_center",
    "roller_coaster",
    "psychic"
  ],
};
