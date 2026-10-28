# Vietnamese restoration and README verification

28 October 2026. Scope: restore Vietnamese as an interface choice and review README diagrams, explanations and consistency with the implementation.

## Vietnamese

* Vietnamese is the second entry-screen choice, after English. The app now offers six languages. English remains the default; existing saved preferences and room access are preserved.
* Added Vietnamese for all 135 static UI messages, ten curated destinations, structured route instructions and runtime status/error messages. Existing Phudu and Be Vietnam Pro Vietnamese subsets are reused.
* Runtime localization only displays registered messages or matching progress templates. It does not blindly return arbitrary Vietnamese server exceptions; unknown errors still use a safe fallback. User-authored labels remain unchanged.
* Updated locale contract checks to use the available locale count, and expanded the existing error/turn checks to include Vietnamese.

## README findings

The original Mermaid block parsed successfully on Mermaid 11.17.2 and 12.2.0; a syntax error was not reproduced with those renderers. The review did find misleading data flow and explanations that needed clarification:

* The original drawing connected the vision worker directly to the room API. The implementation routes upload/download operations through React and the RPC client. The new architecture diagram reflects that boundary.
* The old combined diagram mixed recognition and map dependencies. These are now separate diagrams with quoted labels and shorter connectors. Rendered layouts were visually inspected for overlapping labels or connectors running through unrelated nodes.
* Both Mermaid blocks have SVG alternatives. The SVGs use native text, a white background, no script elements, no foreignObject labels and no external image/font references, so they can be viewed independently.
* The README now distinguishes capture duration, backbone initialization, classifier fitting, artifact loading and prediction latency. A glossary defines embedding, prototype, support frame, inlier and held-out clip.
* `threshold` is fitted and stored but is not an acceptance gate in the current v3 predictor. The README explicitly separates it from the 0.60 candidate floor, fast threshold and mandatory geometric evidence.
* Transit scoring is explained in metre-equivalent preference units, with a numeric example. The text distinguishes the initial straight-line walking budget from later street-route verification and the displayed distance.
* Expanded the upload lifecycle, cache fallback behavior, local preview/API requirements and troubleshooting. Source-module and document links point to existing repository paths.

## Checks

* TypeScript, production build and 34 Vitest tests pass. The tests exercise all six locales, interpolation parameters, progress templates, safe error fallbacks, landmark names and structured turns.
* Dependency audit reports zero vulnerabilities in the app dependencies. Mermaid renderer packages were installed only under ignored temporary tooling; they are not app dependencies.
* Both diagrams parsed and rendered successfully on Mermaid 11.17.2 and 12.2.0. Each SVG was rendered for visual inspection; native text nodes are present and scripts/foreignObject elements are absent.
* Browser matrix: six locales at 320×740, 390×844 and 844×390. No horizontal document overflow; the destination dropdown has ten options in every case.
* Vietnamese entry, camera placeholder, map labels, diacritics and fonts were inspected. Switching Japanese → Vietnamese preserved both markers and the selected destination. Reloading restored the Vietnamese preference while still showing the entry gateway.
* Relative README links resolve to existing files/directories. `git diff --check` is clean apart from informational line-ending normalization notices.

No recognition thresholds, room permissions, database configuration or user footage were changed. These UI tests use browser emulation and do not measure physical phone cameras or room-recognition accuracy.
