# CLAUDE.md

## Project: Randо — Random Place Discovery App

## Stack

- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS (utility-first, no component libraries like MUI or Chakra)
- Framer Motion (spring physics for all interactive transitions)
- Deployed on Vercel
- Google Places API (server-side calls only)

## Code Conventions

### General

- TypeScript strict mode. No `any` types.
- Prefer `const` over `let`. Never `var`.
- Use named exports for components, default exports only for pages.
- Descriptive variable names. No abbreviations except common ones (e.g., `lat`, `lng`, `ref`).

### File Structure

```
/app
  /page.tsx                 # Single-screen instrument
  /layout.tsx               # Root layout, fonts, meta
  /api/places/route.ts      # Google Places proxy + availability filter
/components
  /PurposeHeader.tsx        # "I want to go someplace"
  /RadiusSlider.tsx         # Neumorphic horizontal slider
  /MoodSelector.tsx         # Knob row with icons + labels
  /QualityQualifiers.tsx    # Stars + price, recessed section
  /MatchCount.tsx           # "14 places match"
  /RollButton.tsx           # Primary action
  /PlaceCard.tsx            # Result display
  /LocationFallback.tsx     # Manual address input
/lib
  /google-places.ts         # API client
  /geo.ts                   # Geolocation utilities + distance calc
  /random.ts                # Randomization + pool management
  /types.ts                 # Shared TypeScript types
  /filters.ts               # Client-side post-filtering (stars, price, time)
/styles
  /tokens.css               # CSS custom properties (colors, shadows, spacing)
/public
  /icons/                   # PWA icons
  /manifest.json
```

### Components

- Functional components only. No class components.
- Hooks at the top of the component body.
- Props defined as inline types for simple components, extracted interfaces for complex ones.
- Colocate component-specific logic. Only extract to `/lib` when shared.

### Styling

- Tailwind utility classes only. No inline `style` props except for dynamic values (e.g., calculated positions, neumorphic shadows with CSS vars).
- No CSS modules, no styled-components, no CSS-in-JS.
- Design tokens defined as CSS custom properties in `/styles/tokens.css` and referenced via Tailwind's `theme.extend`.
- Mobile-first: write base styles for mobile, use `md:` and `lg:` for larger screens.
- Neumorphic shadows use CSS custom properties, not hardcoded values.
- Accent color (`--color-accent: #E08A1E`) is Braun Amber. Use it ONLY for: Roll button, selected chip fill, filled stars/dollars, match count, active slider thumb. Everything else is neutral.
- Spring animations via Framer Motion. Never use linear or ease-in-out for interactive elements. Elements have mass.

### API Routes

- All Google Places API calls go through `/api/places/route.ts`. Never expose the API key client-side.
- Validate request params with simple runtime checks (not zod for MVP, keep deps minimal).
- Return typed JSON responses. Define response types in `/lib/types.ts`.

### State Management

- React `useState` and `useReducer` only. No external state libraries.
- Filter state lives in URL search params via `useSearchParams` for shareability.
- Result set cached in component state. No global store.

### Error Handling

- Google Places API errors: return user-friendly message, log details server-side.
- Geolocation denial: gracefully fall back to manual address input. No dead ends.
- Empty results: clear message with suggestion to widen filters.

### Performance

- Lazy load the place photo. Show placeholder/skeleton first.
- Debounce filter changes before triggering new API calls (300ms).
- Prefetch nothing. Keep initial bundle small.

### Testing

- Write tests for `/lib` utilities (randomization, geo calculations, type mapping).
- Component tests only for critical interaction flows (roll, re-roll, filter change).
- Use Vitest.

## Design Principles

Follow Dieter Rams via Braun industrial design. Reference: SK 4, T 1000, ET 66. In practice:

- Every element earns its place. If it doesn't help the user decide or act, remove it.
- Visual interest comes from typography, spacing, depth, and motion. Not decoration.
- The interface should feel like a physical instrument: immediate, tactile, obvious.
- Interactions should have weight. Transitions convey momentum, settling, physicality.
- The app does one thing. The UI reflects that singular focus.
- One accent color (bright green #4ADE80) for selection states only. Roll button is dark, not green.
- Controls should suggest their function through form (neo-skeuomorphic affordances).
- Soft shadows for depth on interactive elements. Not flat, not glossy.
- Generous whitespace. Braun's "breathing room" between controls.
- Large, clear type for labels. Minimal iconography. Words over symbols where possible.
- Animations use spring physics (not linear easing). Elements have mass.
- The Roll button is the largest, most prominent element. Everything else is secondary.

## Things to Avoid

- Material UI, Chakra, Ant Design, or any component library.
- Placeholder "lorem ipsum" content. Use realistic data or mock Google Places responses.
- Over-engineering. No abstractions until something is used in 3+ places.
- `console.log` left in committed code. Use a simple logger wrapper if needed.
- Comments that restate what the code does. Comment only on *why*.
