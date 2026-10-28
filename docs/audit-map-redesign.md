# Typography, SVG and pitched-map audit

29 October 2026. Scope: six-language typography, Canva-derived ornaments, pin addresses, camera pitch, missing map imagery and mobile behavior.

## Implementation

- Replaced Phudu/Be Vietnam Pro/Oswald/PT Sans with self-hosted Noto Serif Variable for English, Vietnamese and Russian. Korean, Simplified Chinese and Japanese use their script-specific Noto Serif families, with the general Noto Serif as fallback. Heavy, slightly condensed headlines and quieter serif text follow the requested newspaper aesthetic. CJK CSS is registered at entry so language names also use custom fonts; unicode ranges limit glyph downloads.
- The requested Canva plugin generated media `MAHZUmAsJs0`. Four native, editable SVGs were manually recreated from its dragon, lantern, river-pavilion and lotus-compass concept. They contain no raster images, scripts or external fonts. This is a Canva concept plus a native SVG implementation, not a claimed Canva SVG export. Source and provenance are in `public/art/README.md`.
- Migrated Leaflet to MapLibre GL JS 6.16.0 with a real 42° camera pitch, adjustable 2D view, north reset and zoom controls. Primary streets are OpenFreeMap Positron vectors, with restrained local background/water colors; HOT raster imagery is the fallback. An initially evaluated raster provider returned API-key placeholder images despite HTTP 200, so it was rejected before release.
- Pin placement uses camera unprojection; marker dragging uses MapLibre coordinates. `maps.reverse` looks up a nearby Photon address, cached by Mongo with existing limits/leases. Exact pinned coordinates remain unchanged. Unique pin IDs ignore stale responses and follow a pending pin across endpoint swaps. Failed/missing addresses show coordinates and an explicit explanation.
- The renderer has resize/visibility refresh, context-loss recovery, delayed loading feedback, a 14-second ongoing tile-stall watchdog, one provider switch, bounded automatic retries and a stable manual retry state. Retry preserves endpoints and routes. Scroll-wheel zoom is disabled; pinch/buttons remain available. Removed the raster pane CSS filter. These changes address missing imagery and accidental zoom; they do not guarantee external provider availability.
- Future custom-model support consists of stable landmark anchors, Mercator placement/scale and a `renderingMode: '3d'` attachment helper. No landmark meshes, surveyed building geometry or terrain are supplied.

## Verification

| Check | Evidence |
| --- | --- |
| Automated regressions | 57 tests in nine files passed, including five address formatting/distance cases and three reverse-RPC validation/provider cases |
| Existing transit behavior | 119/119 graph scenarios passed; routing time objective and service snapshot unchanged |
| Dependency check | `npm audit --audit-level=high`: zero vulnerabilities |
| TypeScript and build | Passed with the self-hosted MapLibre worker and all font/SVG assets |
| Mobile language matrix | Six locales × 320×740, 390×844, 844×390. No horizontal document/search-sheet overflow; older address responses ignored in all 18 cases |
| Font verification | Chrome's actual glyph renderer reports custom Noto Serif for English/Vietnamese/Russian and custom Noto Serif KR/SC/JP for the corresponding native transport labels. Vietnamese headline diacritics and mobile title layout were visually inspected |
| Actual streets/CSP | Real OpenFreeMap vectors rendered under the production CSP. Desktop pin placement, marker dragging, 2D/3D toggles and repeated wheel events passed without page exceptions. Portrait/landscape mobile map screenshots were visually inspected |
| Failure recovery | Forced primary/fallback provider failures show localized failure and retry. Coordinates remain usable when reverse lookup fails. Retry retains the selected pin. Forced WebGL context loss/restoration returns to ready and stays ready beyond the old failure timer |
| README diagrams | Both Mermaid graphs parse/render with Mermaid 11.17.2 and 12.2.0. Maps SVG fallback regenerated for the vector source and reverse-geocoding flow |

The 18-case font/layout matrix and forced-failure tests use controlled network responses. They do not establish map data accuracy. Separate actual-street checks use the real vector provider. Browser mobile emulation uses software WebGL for repeatability; physical phones and every GPU are not covered. WebGL 2 is required and unsupported browsers get a clear message.

Reverse lookup reports a nearby mapped address, not a surveyed building entrance or room-level position. It never substitutes the provider's coordinates for the pin. City-only and >250 m results are rejected. External fonts, tiles, style/sprites/glyphs and model delivery are constrained by CSP to the selected hosts; camera imagery is not sent to map services.

No reference footage, room capabilities, MongoDB access settings or secrets were changed.
