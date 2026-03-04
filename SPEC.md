# Randо — Random Place Discovery

## Concept

An app that introduces randomness into where you go. Set your filters, hit roll, go somewhere you wouldn't have chosen yourself.

---

## Core Flow

1. User opens app → grants geolocation (or enters address manually as fallback)
2. User sees single-screen instrument: purpose statement, filters, Roll button
3. User optionally adjusts filters (radius, mood, stars, price). All filter state is local. No API calls.
4. User taps "Roll"
5. API call fires. Loading state: mystery card appears face-down with shuffle animation.
6. Server fetches Google Places Nearby Search, enriches one random result with Place Details (reviews, editorial summary), applies availability and quality filters, returns the selected place.
7. Mystery card flips to reveal: a teaser blurb built from review snippets and editorial summary. Place name, photo, and exact address are withheld. The card reads like a bookshop mystery cover.
8. User reads the teaser. Two choices:
   a. "Let's Go" → opens native maps app (Apple Maps on iOS, Google Maps elsewhere) with directions to the place. Place identity revealed upon arrival.
   b. "Re-roll" → next random from cached set. New mystery card animates in.
   c. Close (X) → return to filter screen.
9. When result pool is exhausted, prompt to widen filters or Roll again for a fresh fetch.

Zero-config path: user can grant location and tap Roll immediately with defaults. No filter interaction required.

### API Call Timing

The API is called ONLY when the user taps Roll. Never on filter change. Rationale:

- Filters change frequently during adjustment (slider drags, chip toggles). Calling on each change would burn API quota.
- The Roll tap is a deliberate commitment. It's the user saying "I'm ready."
- This also means no live "14 places match" preview count. Instead, the feedback zone shows a contextual readiness message (see Zone 5 below).
- If the Roll returns zero results, show a friendly message suggesting filter adjustments. This is rare given sensible defaults.
- Re-rolls pull from the cached result set (no new API call). A new API call only fires if the cache is empty or filters have changed since the last Roll.

---

## Screen Layout

The entire MVP is a single screen. No pages, no navigation, no scrolling required on standard mobile viewports. Layout reads top-to-bottom as a sentence/instrument:

```
┌──────────────────────────────────────┐
│                        Location  ◯    │
│  ① PURPOSE STATEMENT                 │
│     "I want to go somewhere..."       │
│     Large display type, top-center   │
│                                      │
│  ② RADIUS CONTROL                    │
│     "Up to..."                       │
│     "5 Miles Away"                   │
│     [━━━━━━━━━━●━━━━━] slider        │
│                                      │
│  ③ MOOD SELECTOR                    │
│     "To..."                          │
│       Eat  Drink  Chill  Go Out  Wild Card      │  
│        ◯    ◯      ●     ◯         ◯     │
│         |
│                                      │
│  ④ Price QUALIFIERS (recessed)     │
│     ─────────────────────────────    │
    │     _ any price  
        /
        -- $ budget friendly
        -- $$ 
│     ─────────────────────────────    │
│                  
        Place Randomizer (big text)       
                          BT-01 
                    │
│                                      │
│  ⑥ PRIMARY ACTION (thumb zone)       │
│     ┌────────────────────────┐       │
│     │                        |
      |       Generate         |
  │   |                        |
│     └────────────────────────┘       │
│                                      │
└──────────────────────────────────────┘
```

### Layout Zones (top to bottom)

**Zone 1 — Purpose Statement**
- "I want to go someplace"
- Display typeface, close to the top, but below the location button. Introducing the concept. Justified left,
- Static. Not interactive. Sets context in under 2 seconds.

**Zone 2 — Radius Control**
- Label: "Up to..." with dynamic value "5 Miles Away"
- Horizontal slider, discrete snap points (0.5, 1, 2, 5, 10 mi)
- Braun-style: chunky thumb/knob, raised off the track with soft shadow
- Value label sits left of slider, updates on drag
- Slider thumb shows current value on or above it during drag

**Zone 3 — Mood Selector**
- Label: "To..." (continuing the sentence: "I want to go someplace... to... Chill")
- Row of neumorphic circular knobs with small icons inside
- Text labels above each knob
- Multi-select: user can pick multiple moods
- Do Anything button on the right, with some spacing away from the others. Looks like a button with a dash across it, acts like the other buttons.
- Selected state: knob depresses (inner shadow replaces outer shadow) + accent color fill
- Unselected state: raised, neutral surface color, icon in warm gray

**Zone 4 — Price Qualifiers**
- Visually recessed panel: bold dark rules (2-3px, --color-divider) above and below, creating a Braun-style inset panel
- Smaller type than mood chips, secondary text color
- Center is something which Looks like a knob, but with a direction to it, like a teardrop, but where the point of the teardrop selects the price option
- The options are listed Any Price, Free, $ Budget Friendly, $$ Not too Pricey, $$$ Splurge
- the positions of the labels are such that they align with the knob which doesn't turn more than 100 degrees and is on its side. the labels are in a semi circle stacked vertically, where the any price is seperated by a bit. the price selection  illuminates yellow like it's backlit unless it's the Any price, which remains a neural gray like the other inactice selections.
- This should look like a clickly selection like on an old hifi system, there should be a line down the middle of the extended tip of the teardrop shape, which rounds our and doesn't come to a point, like the white line of the slider. 
- 

**Zone 6 — Roll Button**
- Full-width, bottom of screen, in thumb zone. Wide.
- Largest interactive element. The "footswitch."
- Dark background (near-blackish brown), warm white text centered. Heavy, grounded.
- Deepest shadow, most visual weight on screen
- On press: scale to 0.96, shadow reduces. On release: spring back.
- NOT the accent color. Gets its own gravity through darkness and mass.


Other:
Location button on the top right which glows green when a location has been set, otherwise glows red indicating no location is set. Think vintage status light. You can click it when it's red to open the location adjustment. Label "location" on the left, in understated font. 

Title: Place Randomzier. Located below the controls, in Google Font name: Audiowide. Large
Offset below it in smallet BT-01 ostensibly a model number. 
---

## Filters

### Primary (always visible)

| Filter | UI                                | Default  | API Mapping       |
| ------ | --------------------------------- | -------- | ----------------- |
| Radius | Horizontal discrete slider        | 5 mi     | `radius` (meters) |
| Mood   | Neumorphic knob row, multi-select | Anything | `type` param      |

### Quality

Automatically filter out any places with fewer than 3.5 stars, unless it has less than 4 reviews. Looking for well reviewed places.

### Automatic Availability (server-side, not user-facing)

No "Open Now" toggle. App filters for places open at least 1 hour from now:

1. API includes `opennow=true`
2. Check `opening_hours.periods` vs. current time
3. Exclude places closing in < 60 minutes
4. No hours data: include with "Hours not confirmed" on card
5. After 11pm: relax buffer to 30 minutes
6. 24-hour places: always included

### Curated Mood Types

Each mood maps to as many relevant Google Place types as possible to maximize result pool.

| Mood     | Icon | Google Types                                                             |
| -------- | ---- | ------------------------------------------------------------------------ |
| Eat      | 🍽️    | `restaurant`, `bakery`, `cafe`, `meal_delivery`, `meal_takeaway`         |
| Go Out   | 🍸    | `bar`, `night_club`, `cafe`,                                             |
| Chill    | ☕    | `cafe`, `book_store`, `library`, `spa`, `art_gallery`                    |
| Outdoors | 🌳    | `park`, `tourist_attraction`, `campground`, `zoo`, `aquarium`, `stadium` |

---

## Mystery Card

The place card is the emotional center of the app. It should feel like picking up a mystery book in a bookshop: the cover gives you a sense of what's inside, hints at an experience, but doesn't reveal everything. The point is to get people moving, not to give them enough information to talk themselves out of it.

### Loading State: The Shuffle

When Roll is tapped:
1. Roll button depresses, holds briefly
2. A card shape appears in the center of the screen, face-down (warm surface color, subtle pattern or texture)
3. Card does a quick shuffle animation (2-3 rapid rotations or a "dealing" motion, 600-800ms)
4. Card flips to reveal the mystery side

### Mystery Card Content (face-up)

The card deliberately withholds the place name and exact address. It reveals enough to intrigue, not enough to Google.

```
┌──────────────────────────────────────┐
│                              [✕]     │  ← Close, return to filters
│                                      │
│     ☕ Chill spot · 0.8 mi away      │  ← Mood tag + distance only
│     ★★★★½ · $$                       │  ← Rating + price level
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │  "Perfect place to slow down │    │  ← Mystery blurb: review snippets
│  │   with a good book. Regulars │    │    woven into a teaser
│  │   swear by the morning light │    │
│  │   through the windows."      │    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│     Open for 3+ hours                │  ← Time context
│                                      │
│  ┌────────────────────────────────┐  │
│  │          Let's Go →            │  │  ← Primary action: open maps
│  └────────────────────────────────┘  │
│                                      │
│         ↻ Show me another            │  ← Re-roll (text link, not a button)
│                                      │
└──────────────────────────────────────┘
```

### What's Shown vs. What's Hidden

| Shown                                  | Hidden        |
| -------------------------------------- | ------------- |
| Photo (one, from Google Places Photos) | Place name    |
| Mood/type tag (e.g., "Chill spot")     | Exact address |
| Distance from user                     | Street name   |
| Star rating + review count             | Phone number  |
| Price level                            | Website       |
| Mystery blurb from reviews             |               |
| Time context (hours remaining)         |               |

### Building the Mystery Blurb (MVP approach, no AI)

The blurb is constructed server-side from Google Places data:

**Source 1: `editorial_summary`** (Place Details API)
Google provides a short, human-written summary for many places. Example: "Trendy cafe with exposed brick walls and artisan coffee." If available, use as the lead sentence.

**Source 2: `reviews[]` array** (Place Details API, up to 5 reviews)
Extract short, positive fragments:
1. Filter reviews with rating >= 4
2. Split review text into sentences
3. Select sentences under 20 words that contain positive signal words (great, love, perfect, amazing, cozy, beautiful, best, favorite, recommend, etc.)
4. Take up to 2-3 best snippets
5. Attribute loosely: "Visitors say..." or "People love..."

**Source 3: Place type + contextual template**
If reviews are sparse, fall back to mood-appropriate templates:
- Chill: "A quiet spot to slow down and take a breath."
- Eat: "Locals keep coming back for a reason."
- Drink: "The kind of place where the night finds its rhythm."
- Outside: "Fresh air and room to think."

**Assembly:**
```
[editorial_summary or type template]
[review_snippet_1]. [review_snippet_2].
```

Total blurb target: 2-4 sentences, 30-60 words. Enough to evoke a feeling, not enough to identify the place.

**Future Enhancement (post-MVP):**
One Claude API call per roll (~$0.001) could take the full review corpus and generate a mystery-novel-style blurb. Example prompt: "Given these reviews of a place, write a 2-sentence teaser that captures the vibe without naming the place or its address. Write it like the back cover of a mystery novel."

### Deep Linking: "Let's Go" Button

The "Let's Go" button opens the user's native maps app with turn-by-turn directions to the place. This is where the place identity is finally revealed (the maps app shows the name and address).

**Strategy: Use the place name + coordinates for maximum compatibility.**

The most reliable cross-platform approach:

```typescript
function buildMapsUrl(place: Place): string {
  const { lat, lng, name, vicinity } = place;
  const encodedName = encodeURIComponent(name);
  const encodedAddress = encodeURIComponent(vicinity);

  // Google Maps universal URL (works on all platforms)
  // On iOS without Google Maps installed, opens in browser
  // On iOS with Google Maps installed, opens the app
  // On Android, opens Google Maps app
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedName}+${encodedAddress}&destination_place_id=${place.googlePlaceId}&travelmode=driving`;

  // Apple Maps URL (iOS only, opens Apple Maps directly)
  const appleUrl = `https://maps.apple.com/?daddr=${encodedAddress}&q=${encodedName}&ll=${lat},${lng}`;

  return isIOS() ? appleUrl : googleUrl;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
```

**Why address-based, not just lat/lng:**
There's a known Apple Maps bug where lat/lng-only directions can route to incorrect locations. Using the address string with lat/lng as a fallback (`&ll=`) is more reliable. Google's universal URL with `destination_place_id` is the most precise option for Google Maps.

**Behavior:**
- iOS: Opens Apple Maps with the place name as destination. Directions start immediately.
- Android: Opens Google Maps with place ID for exact match.
- Desktop: Opens Google Maps in browser.
- The place name and address become visible to the user in the maps app. This is the "reveal" moment. The mystery resolves when they start navigating.

---

## Design System

### Philosophy

Dieter Rams via Braun. The app is an instrument, like a guitar pedal, not a page.

Reference objects: Braun SK 4 record player, T 1000 radio, ET 66 calculator. Shared traits: muted body, surgical accent color, oversized primary controls, recessed secondary controls, clear typographic labels.

### Visual Style: Neo-Skeuomorphic / Tactile Minimalism

Not full skeuomorphism (no leather, no wood grain). Not flat (no zero-depth). Dimensional controls that communicate function through form.

- Soft shadows on interactive elements (raised = tappable, recessed = active)
- One accent color at action points only
- Controls suggest physicality: rounded knobs, weighted thumb, pressable button
- Generous spacing (Braun "breathing room")
- Typography over iconography
- Spring physics motion (elements have mass)

### Neumorphic Control States

Unselected / resting (raised):
```css
background: var(--color-surface);
box-shadow:
  6px 6px 12px var(--color-shadow),
  -6px -6px 12px var(--color-surface-light);
```

Selected / active (pressed in):
```css
background: var(--color-accent);
box-shadow:
  inset 4px 4px 8px rgba(0, 0, 0, 0.15),
  inset -4px -4px 8px rgba(255, 255, 255, 0.1);
```

Depth inversion (outer → inner shadow) is the primary selection signal. Accent color fill is the secondary signal. Two signals = unambiguous active state.

### Color Palette

Derived from Braun product hex codes. Accents brightened for clear on-screen selection signaling.

#### Light Mode

```css
:root {
  /* Surfaces — Braun warm neutrals */
  --color-background:      #EDEAE5;   /* Warm white, page body */
  --color-surface:         #DDD9D3;   /* Cream, resting controls */
  --color-surface-light:   #F5F2ED;   /* Neumorphic highlight edge */
  --color-shadow:          #C5C0B8;   /* Neumorphic shadow edge */

  /* Text */
  --color-text-primary:    #2A2118;   /* Near-black, headlines/labels */
  --color-text-secondary:  #8A8480;   /* Warm gray, sublabels */
  --color-text-tertiary:   #BCB5AD;   /* Light gray, placeholders */

  /* Accent — Bright green for selection/active states */
  --color-accent:          #4ADE80;   /* Selected chips, filled stars, filled dollars */
  --color-accent-strong:   #22C55E;   /* Roll button (slightly deeper for large surface) */
  --color-accent-glow:     rgba(74, 222, 128, 0.25); /* Subtle halo behind selected items */

  /* Functional status (place card only) */
  --color-status-open:     #4ADE80;   /* Reuse accent green for "Open 3+ hours" */
  --color-status-closing:  #EF6B4A;   /* Warm red, "Closes soon" */

  /* Structural */
  --color-divider:         #2A2118;   /* Bold dark rules around qualifier section (matches mockup) */
  --color-roll-bg:         #1A1714;   /* Roll button: dark, weighty, Braun black */
  --color-roll-text:       #F5F2ED;   /* Roll button text: warm white */
}
```


**Why dark Roll button:** In the mockup, Roll is black. This is correct — it's the heaviest element on screen, anchored at the bottom. Like the base of a Braun device. The accent green should NOT be on the Roll button; instead Roll gets its own gravity through dark weight. This separates "selection state" (green) from "primary action" (dark, weighty).

#### Dark Mode (future)

```css
:root[data-theme="dark"] {
  --color-background:      #1C1814;
  --color-surface:         #2A2520;
  --color-surface-light:   #3A342E;
  --color-shadow:          #0E0C0A;
  --color-text-primary:    #EDEAE5;
  --color-text-secondary:  #8A8480;
  --color-accent:          #4ADE80;
  --color-accent-strong:   #22C55E;
  --color-roll-bg:         #F5F2ED;
  --color-roll-text:       #1C1814;
}
```

#### Color Rules

- **Green accent** appears ONLY on: selected chip fills, filled stars, filled dollars, match count text, active slider thumb fill
- **Dark Roll button** is its own element: black bg, warm white text, largest shadow
- Everything else is warm neutrals (grays, creams, off-whites)
- Never two saturated colors on screen at once
- Status red (closing soon) appears only on the place card, never in the filter UI

### Typography

| Role       | Usage                                | Weight          | Size    |
| ---------- | ------------------------------------ | --------------- | ------- |
| Display    | "I want to go someplace", place name | Bold            | 28-36px |
| Functional | Labels, values, button text          | Regular/Medium  | 12-18px |
| Numeric    | Distances, ratings, prices           | Tabular figures | 14-18px |

Two font families max. Display: warm, confident (serif or distinctive sans). Functional: precise, legible (geometric sans). Final font selections TBD during implementation.

### Motion & Interaction

All transitions use spring physics:

| Interaction            | Motion                                       | Timing                     | Haptic (native)         |
| ---------------------- | -------------------------------------------- | -------------------------- | ----------------------- |
| Roll button press      | Scale 0.96, shadow reduces, holds            | 80ms down, hold 200ms      | Medium impact           |
| Card shuffle (loading) | Face-down card appears, rapid tilt 2-3x      | 600-800ms                  | Selection ticks (rapid) |
| Card flip (reveal)     | 3D Y-axis rotation, face-down to face-up     | 400ms spring               | Success notification    |
| Mood chip toggle       | Depth inversion + accent fill                | 200ms spring               | Selection tick          |
| Slider drag            | Thumb follows, snaps at points               | Continuous + 100ms snap    | Selection tick at snap  |
| Star/dollar tap        | Fill left-to-right                           | 150ms                      | Light impact            |
| Re-roll                | Current card exits right, new shuffle + flip | 300ms exit + 600ms shuffle | Light impact + success  |
| Card close (X)         | Card scales down + fades                     | 250ms ease-out             | None                    |
| "Let's Go" tap         | Card pulses, maps app opens                  | 200ms                      | Heavy impact            |

Spring defaults (Framer Motion):
- Buttons: `{ stiffness: 300, damping: 25 }`
- Cards: `{ stiffness: 200, damping: 20 }`
- Snaps: `{ stiffness: 400, damping: 30 }`
- Flip: `{ stiffness: 250, damping: 22 }` (slightly bouncy for drama)

### Haptic Strategy

Design all interactions to work visually without haptics (PWA has no iOS haptic support). Haptic layer is additive for native port:

| Moment      | Visual (PWA)                       | Haptic (native)                     |
| ----------- | ---------------------------------- | ----------------------------------- |
| Roll        | Button depresses + holds + springs | `UIImpactFeedback(.medium)`         |
| Shuffle     | Card tilt animation                | `UISelectionFeedback` (rapid ticks) |
| Reveal      | 3D card flip                       | `UINotificationFeedback(.success)`  |
| Re-roll     | Card exits + new shuffle           | `UIImpactFeedback(.light)`          |
| Chip toggle | Depth inversion + color            | `UISelectionFeedback`               |
| Slider snap | Thumb settles                      | `UISelectionFeedback`               |
| Let's Go    | Card pulse                         | `UIImpactFeedback(.heavy)`          |
| No results  | Subtle shake                       | `UINotificationFeedback(.error)`    |

---

## Technical Architecture

### Stack

- Framework: Next.js 14+ (App Router), TypeScript
- Styling: Tailwind CSS + CSS custom properties for design tokens
- Hosting: Vercel (free tier)
- APIs: Google Places (Nearby Search, Place Details, Photos)
- PWA: next-pwa
- Animation: Framer Motion
- Map: None. Deep link to native maps.

### File Structure

```
/app
  /page.tsx                 # Single-screen instrument
  /layout.tsx               # Root layout, fonts, meta
  /api/places/route.ts      # Google Places Nearby Search + filter + enrich first result
  /api/places/detail/route.ts  # Place Details for re-rolls
/components
  /PurposeHeader.tsx
  /RadiusSlider.tsx
  /MoodSelector.tsx
  /QualityQualifiers.tsx
  /ReadinessIndicator.tsx
  /RollButton.tsx
  /MysteryCard.tsx          # The reveal card (photo, blurb, actions)
  /CardShuffle.tsx          # Loading animation (face-down shuffle)
  /LocationFallback.tsx
/lib
  /google-places.ts         # Nearby Search + Place Details client
  /blurb-builder.ts         # Extract review snippets, build mystery text
  /maps-link.ts             # Cross-platform deep link builder (Apple/Google)
  /geo.ts
  /random.ts
  /types.ts
  /filters.ts
/styles
  /tokens.css               # CSS custom properties
/public
  /icons/
  /manifest.json
```

### API Route: `/api/places`

Called ONLY on Roll tap (never on filter change).

**Flow:**
1. Receive filter params from client
2. Call Google Places Nearby Search with radius, types, opennow
3. Receive up to 20 results
4. Apply server-side filters: availability (1-hour buffer), min rating, max price
5. Shuffle the filtered results
6. For the first result, call Google Place Details to get: reviews, editorial_summary, photos, opening_hours periods
7. Build the mystery blurb server-side from editorial_summary + review snippets
8. Return the enriched first result + the remaining filtered result IDs (for re-rolls)

**Request:**
```json
{
  "lat": 37.7749,
  "lng": -122.4194,
  "radius": 1609,
  "types": ["cafe", "restaurant"],
  "minRating": 3.5,
  "maxPriceLevel": 3
}
```

**Response (first roll):**
```json
{
  "place": {
    "id": "ChIJ...",
    "googlePlaceId": "ChIJ...",
    "rating": 4.5,
    "reviewCount": 312,
    "types": ["cafe"],
    "moodTag": "Chill spot",
    "lat": 37.7751,
    "lng": -122.4183,
    "photoUrl": "https://maps.googleapis.com/...",
    "priceLevel": 2,
    "distanceMeters": 1280,
    "closesAt": "21:00",
    "minutesUntilClose": 240,
    "hoursConfirmed": true,
    "mysteryBlurb": "A neighborhood favorite where the baristas know your order. Visitors love the natural light and the quiet corner tables. Perfect for losing track of time.",
    "name": "Blue Bottle Coffee",
    "vicinity": "66 Mint St, San Francisco"
  },
  "remainingIds": ["ChIJ_2...", "ChIJ_3...", "ChIJ_4..."],
  "totalMatches": 14
}
```

**Note on `name` and `vicinity`:** These are included in the response for the deep link but are NOT displayed on the mystery card. The client uses them only to build the maps URL when "Let's Go" is tapped. They are hidden from the UI until the user commits to going.

**Re-roll route: `/api/places/detail`**

When the user re-rolls, the client sends the next ID from `remainingIds`:

```json
{ "placeId": "ChIJ_2..." }
```

Server calls Place Details for this single place, builds the mystery blurb, returns the same enriched structure. This costs one Place Details call per re-roll (~$0.017).

**Cost model:**
- First Roll: 1 Nearby Search ($0.032) + 1 Place Details ($0.017) = ~$0.05
- Each Re-roll: 1 Place Details ($0.017)
- Typical session (1 roll + 2 re-rolls): ~$0.08
- Google's $200/month free credit covers ~2,500 sessions

### Caching

- After first Roll, `remainingIds` are cached client-side
- Re-rolls consume from this cache (only the Detail call is new)
- Cache invalidates when any filter changes (next Roll fetches fresh)
- Cache expires after 10 minutes (availability data degrades)
- No cache persistence across sessions (no database needed)

### Geolocation Fallback

1. Text input for address or zip
2. Geocode via Google Geocoding API
3. Use coordinates as center
4. Never a dead end

### PWA

- manifest.json, icons, theme color
- Service worker: offline shell, API needs network
- Add to Home Screen prompt after second visit
- 48px minimum tap targets, bottom-anchored controls

---

## Platform Strategy

PWA first. Validate concept, ship in weeks, zero distribution cost.

If traction warrants native:
- React Native + expo-haptics
- Visual design transfers directly, add haptic layer
- App Store presence, push notifications
- Consider Swift/SwiftUI for deeper Taptic Engine control

---

## Non-Goals (MVP)

- User accounts / auth
- Saving favorites
- Social / sharing
- Map view
- AI vibe tags
- Database
- Analytics (v1.1)

## Future (Post-MVP)

- Vibe tags from reviews via LLM
- "Adventure mode" (no filters, pure random)
- Visit history
- Shareable roll results
- Collaborative rolls
- ADA accessibility filter
- Dark mode
- Native iOS with haptics