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
 * "restaurant" covers all cuisine sub-types (italian_restaurant, etc.)
 * so we don't list each one individually. We add specific non-restaurant
 * food types (bakery, cafe, etc.) and notable sub-categories only where
 * Google treats them as distinct primary types.
 *
 * Types sourced from the Google Places API (New) Table A.
 * ─────────────────────────────────────────────────────────────────────── */

const MOOD_TYPES_BASE: Record<string, string[]> = {
  eat: [
    "restaurant",
    "bakery",
    "cafe",
    "cafeteria",
    "coffee_shop",
    "deli",
    "dessert_shop",
    "diner",
    "fast_food_restaurant",
    "fine_dining_restaurant",
    "food_court",
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
  ],

  go_out: [
    "bar",
    "bar_and_grill",
    "beer_garden",
    "brewery",
    "brewpub",
    "cocktail_bar",
    "hookah_bar",
    "irish_pub",
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
    "opera_house",
    "performing_arts_theater",
    "philharmonic_hall",
    "amphitheatre",
    "video_arcade",
    "bowling_alley",
    "casino",
    "amusement_center",
    "amusement_park",
    "event_venue",
    "go_karting_venue",
    "miniature_golf_course",
    "paintball_center",
    "water_park",
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
    "massage",
    "botanical_garden",
    "garden",
    "plaza",
    "fountain",
    "coworking_space",
    "internet_cafe",
    "winery",
    "vineyard",
    "community_center",
    "cultural_center",
    "visitor_center",
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
    "sports_complex",
    "sports_activity_location",
    "wildlife_park",
    "wildlife_refuge",
    "zoo",
    "aquarium",
    "cemetery"
  ],

  anything: [
    "tourist_attraction",
    "art_studio",
    "auditorium",
    "castle",
    "cultural_landmark",
    "historical_place",
    "historical_landmark",
    "monument",
    "sculpture",
    "observation_deck",
    "ferris_wheel",
    "roller_coaster",
    "escape_room",
    "indoor_playground",
    "lodging",
    "hotel",
    "hostel",
    "bed_and_breakfast",
    "shopping_mall",
    "department_store",
    "flea_market",
    "thrift_store",
    "grocery_store",
    "supermarket",
    "farmers_market",
    "clothing_store",
    "electronics_store",
    "furniture_store",
    "book_store",
    "gift_shop",
    "pet_store",
    "sporting_goods_store",
    "church",
    "mosque",
    "synagogue",
    "hindu_temple",
    "cemetery",
    "university",
    "train_station",
    "bus_station",
    "airport",
    "ferry_terminal",
    "ski_resort",
    "stadium",
    "arena",
    "race_course",
  ],
};

export const MOOD_TYPE_MAP: Record<string, string[]> = {
  ...MOOD_TYPES_BASE,
  /* "Anything" includes all types from all other moods, plus its extras */
  anything: Object.values(MOOD_TYPES_BASE).flat()
};
