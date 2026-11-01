# Nếp Phố interface and interaction audit

Scope: clearer transit changes, per-service track colours, touch navigation, desktop transitions, a tile-pattern background and the new UI brand. Technical repository/deployment IDs and existing room/cache keys remain compatible.

## Transit presentation

`journeyPresentation.ts` maps each ride to a leg number and a service colour; the map, legend, stop markers and textual steps use that same mapping. Three ride legs are supported by the existing planner. A repeated service retains its colour; every boarding still has its own leg number. Meaning is also carried by route codes, stop names, addresses and boarding/alighting labels.

Transfer cards are ordered before timing notices and remain rendered when detailed steps are collapsed. They explicitly name the stop to leave, the walk or same-stop connection, the stop to board and the next service/headsign. Full ride steps give boarding and alighting stops equally prominent blocks. Popup content is built with text nodes; a check caught a popup close control covered by the route panel. Popups now share the panel's overlay plane and have a localized close control.

Six journeys computed from the checked-in transit network were reviewed in all six UI languages (36 combinations): direct bus, bus interchange, return direction, two interchanges including a walk between different stops, direct metro and bus/metro feeder. Track feature colours matched legend colours, transfer stop names matched the actual adjacent ride legs, and collapsed details retained transfer summaries. These are presentation checks on static network journeys, not confirmation of current vehicle arrivals or operation.

## Views and camera

Native touch events distinguish deliberate horizontal swipes from short, vertical or multi-touch gestures. Camera supports a full-surface swipe; Maps uses the separate swipe rail, so a map drag remains a map drag. A touch-browser journey verified both directions, preserved origin input, keyboard tab navigation, camera-track shutdown, no automatic camera restart and no navigation through a modal.

Desktop view changes use an opacity/16 px translation transition over 420 ms. Reduced motion disables that transition. Inactive panels use `inert` and `aria-hidden`; keyboard traversal did not enter them. Maps is lazy on first use and then kept mounted, preserving route/search/camera state across switches. The current model/GPU caches remain bounded as documented in the landmark audit.

Camera permission and playback now finish separately from cold vision-model preparation. An abandoned preparation checks the camera generation before starting recognition, so switching to Maps cannot restart the camera pipeline.

## Visual and compatibility checks

- Proper-name branding appears on language entry, title, workspace header, curtains, browser title and QR filenames. Internal storage keys are retained to avoid losing existing rooms, language preferences or trained classifiers.
- The original static SVG tile repeat uses floral symmetry, corner arcs and the moss/brick/paper palette. Source inspiration/provenance is in [the art notes](../public/art/README.md). It does not overlay video pixels or map content.
- The hand-drawn dragon and the existing Blender landmark assets are retained.
- The 18 role/language/viewport combinations at 320×740, 390×844 and 844×390 passed. Desktop visual checks used 1440×1000.
- The Dev journey passed permission-denial/retry, camera switching, automatic/manual stop, naming, failed-save draft retention/download, retry, saved-video download, retrain, reader-only QR/copy/download, validation/evaluation and deletion of isolated test data. This uses real browser MediaRecorder/canvas capture with simulated vision/storage responses; it is not an accuracy test or a physical-phone camera test.
- 73 unit tests passed, including walking/same-stop/mixed/repeated-service presentation and deliberate-swipe criteria. Production checks are tied to the pushed commit separately.

## Production receipt

The public alias served code commit `972d13fa73af71e271db966336ae4ec922dd7297` from Vercel deployment `dpl_6SMvU6xxREmgp4Hs9emuWmRW33tX` in READY state. [CI run 41328804023](https://github.com/dakiemdarktharr/NoSleepClub_HIST/actions/runs/41328804023) passed for that commit. The browser entry bundle matched the local production build.

The live browser check used the real transit worker, network snapshot, map tiles, route-verification API and MongoDB cache. It observed:

- Independence Palace → Củ Chi: bus **13 → 79**, with alighting and boarding at **Bến xe Củ Chi**. Red and blue appeared in the legend/stop markers and transfer instructions.
- Củ Chi → Nhà Rồng Wharf: bus **79 → 13 → 20**, with three distinct colours. The second change explicitly alighted at **Sân khấu Sen Hồng, 94–96 Lê Lai**, walked **282 m** to **Trường Emst Thalmann, Phạm Ngũ Lão**, and boarded bus 20 toward Bến xe buýt Bình Khánh. This result differed from the unverified graph fixture because real street connectors were checked.
- 29 route-verification API calls returned HTTP 200 across those two searches. Database health reported connected. These are observed route-planning results, not verification of live arrivals or a trip undertaken on the vehicles.
- Real touch swipes opened Maps and returned to Camera; the route and collapsed transfer summary survived a round trip between views. Existing 3D models loaded. A stop popup opened and its close button remained clickable above the route panel.
- The tile SVG returned HTTP 200; the title/header/QR used **Nếp Phố**. The public app QR title was **Mở Nếp Phố**.

No browser page exceptions, console errors, WebGL errors or CSP failures were recorded. The production browser was a touch-capable phone emulation, also resized to desktop; physical phone hardware was not used.
