# GG portal design

The approved GG studio design extends from the sign-in screen into the school and student navigation, dashboard, shared cards, forms, tables, resource tabs, and classroom surfaces. The production Google OAuth callback, Supabase readiness gate, school-domain restriction, sessions, roles, and school workflows retain their existing code paths. No database or API changes are included.

`src/portal-theme.css` contains the shared visual layer. The school dashboard uses the same baked finish with a small CSS perspective shift and intermittent glint. The full Three.js scene stays on the sign-in screen. Teacher-selected classroom colors and backgrounds still come from ClassroomThemeLayer. Status colors retain their meaning.

## Rendering

The GG uses actual extruded silhouette geometry with four open counters. Its detailed enamel, metal, and studio lighting are baked into a color texture from the approved design, rather than recalculated with a real-time path tracer. It is intentionally intended for a narrow viewing range, not a 360-degree logo viewer. Separate sidewall material, particle constellation, rotation, and intermittent glint are rendered live in Three.js.

- `public/gg-surface.webp`: isolated approved-style emblem, compressed with alpha retained.
- `public/gg-contours.json`: normalized contours traced from the asset's alpha; the four openings are actual mesh holes.
- `public/gg-studio.jpg`: generated studio background plate, without text or logos.
- `public/gg-emblem.svg`: small header mark.
- `src/components/emblemScene.js`: scene, subtle motion, resources and lifecycle.

The main tilt is approximately 1.4 degrees each way over a 20-second cycle. Pointer motion adds less than a degree and is eased. A brief glint appears about every 10 seconds. The color texture retains its baked highlights as the mesh shifts.

The scene loads independently of the sign-in button. A still version of the detailed emblem remains visible during load and when WebGL fails. Reduced-motion users receive a still scene. Rendering is limited to 30 FPS with a capped pixel ratio and pauses when the page is hidden or the emblem scrolls out of view. GPU allocations and listeners are disposed on unmount.

## Verification

- Production build completed.
- Existing suite: 46 tests passed.
- Changed source files: ESLint clean.
- Desktop and 390-pixel mobile inspected in browser.
- All staff navigation destinations and resource tabs render in an isolated local fixture using the real app components and existing offline seed data. No production records were written.
- Mobile More menu, resource navigation, bell-schedule collapse, and classroom entry verified.
- Existing lint: zero errors, six pre-existing hook warnings.
- Reduced-motion fixture: no animation frames scheduled during settled two-second observation.
- Disabled-WebGL fixture: detailed still visible and sign-in button available.
- Preview callback: loading state disables button; feedback appears and button recovers.

`tmp/preview.html` is an ignored, local-only review page. Its sign-in callback is deliberately a demonstration and never contacts the school's authentication service. It is not included in the production build. Real OAuth was not exercised against school accounts during this design task.
