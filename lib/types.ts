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
    "restaurant",
    "sandwich_shop",
    "steak_house",
    "sushi_restaurant",
    "tea_house",
    "vegan_restaurant",
    "vegetarian_restaurant",
  ],

  go_out: [
    "amusement_center",
    "amusement_park",
    "bar",
    "bar_and_grill",
    "beer_garden",
    "bowling_alley",
    "brewery",
    "brewpub",
    "casino",
    "cocktail_bar",
    "comedy_club",
    "concert_hall",
    "dance_hall",
    "event_venue",
    "karaoke",
    "live_music_venue",
    "lounge_bar",
    "movie_theater",
    "night_club",
    "opera_house",
    "performing_arts_theater",
    "pub",
    "sports_bar",
    "video_arcade",
    "wine_bar",
  ],

  chill: [
    "art_gallery",
    "art_museum",
    "book_store",
    "botanical_garden",
    "cafe",
    "coffee_shop",
    "cultural_center",
    "dessert_shop",
    "fountain",
    "garden",
    "history_museum",
    "library",
    "massage_spa",
    "museum",
    "planetarium",
    "plaza",
    "public_bath",
    "sauna",
    "spa",
    "tea_house",
    "vineyard",
    "wellness_center",
    "winery",
    "yoga_studio",
  ],

  outside: [
    "aquarium",
    "athletic_field",
    "beach",
    "botanical_garden",
    "campground",
    "city_park",
    "cycling_park",
    "dog_park",
    "garden",
    "golf_course",
    "hiking_area",
    "lake",
    "marina",
    "mountain_peak",
    "national_park",
    "nature_preserve",
    "park",
    "picnic_ground",
    "playground",
    "river",
    "scenic_spot",
    "state_park",
    "swimming_pool",
    "tennis_court",
    "wildlife_park",
    "wildlife_refuge",
    "woods",
    "zoo",
  ],

  adventure: [
    "adventure_sports_center",
    "amusement_center",
    "amusement_park",
    "aquarium",
    "art_gallery",
    "book_store",
    "casino",
    "castle",
    "cultural_landmark",
    "go_karting_venue",
    "miniature_golf_course",
    "museum",
    "observation_deck",
    "off_roading_area",
    "paintball_center",
    "psychic",
    "roller_coaster",
    "skateboard_park",
    "stadium",
    "tourist_attraction",
    "video_arcade",
    "water_park",
    "zoo",
  ],
};
