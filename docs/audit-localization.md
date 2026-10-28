# Localization, pin placement and mobile audit

Date: 28 October 2026. Scope: the editable dragon ornament, landing masthead, first-entry language selection, five-language interface/fonts, destination combobox, map pins, responsive layout and technical README. The recognition algorithm, capability format and footage feature versions remain unchanged.

## Changes reviewed

* Replaced the original dragon paths with a continuous tapered body, coherent muzzle/eye/horns, articulated legs and architectural/cloud framing. It remains an editable original SVG; private reference screenshots are not repository assets.
* Removed the landing's center HIST mark and localized Ho Chi Minh City's name. After language selection, landing still exposes exactly User and Dev.
* Added English, Korean, Simplified Chinese, Japanese and Russian catalogs, a mandatory entry gateway, persistent preference and a Library language switch. Known legacy status/error strings are translated at the display boundary. Unexpected exceptions are replaced by a localized retry message.
* Self-hosted Phudu/Be Vietnam Pro, Noto Serif KR/SC/JP and Oswald/PT Sans. CJK/Cyrillic CSS is lazy loaded; `font-src 'self'` is preserved. Proper names and Dev-authored footage labels are not machine translated.
* Added A/B drag handles, tap-to-place/cancel, draggable markers and a custom keyboard/touch destination combobox with ten curated places. Source OSM records were resolved through Photon on the audit date; duplicate-name results for the memorial and Tuệ Thành temple were disambiguated.
* Road responses now include structured maneuver types/street names/roundabout exits, with a new cache version. English uses upstream instructions; the other four languages use deterministic maneuver localization.
* Rewrote README with data flow, modules, model math/thresholds, RPC actions, storage/auth invariants, limits, routing costs, deployment and operational limitations.

## Verification receipts

* TypeScript, production build and **34 Vitest tests** pass. Seven new tests cover catalog completeness/placeholder parity, real progress templates, safe error fallback, ten unique bounded OSM places, excursion/exterior notes and structured turn localization.
* `npm audit --audit-level=high`: zero reported vulnerabilities at audit time. `git diff --check`: clean apart from informational CRLF normalization notices.
* Browser matrix: all five locales at **320×740, 390×844, 768×1024, 1440×900 and 844×390**. No horizontal document overflow; each dropdown exposes ten options; ArrowUp from no active option selects the final item. Mobile input computed size is 16 px. Correct body/display font families were observed for all five locales.
* User viewfinder occupies approximately 73–89% of viewport height in that matrix. A landscape document-height overflow caused by an old 400 px minimum was removed; independent touch-browser verification reports exactly 844×390 document/viewport dimensions.
* Mouse drag and tap-to-place create two markers and clean up the drag ghost. A separate Chromium mobile/touch context exercised actual CDP touch events. It found that compatibility clicks could be suppressed after pointer capture; handlers now complete pointer gestures on `pointerup` and keep keyboard/assistive click activation. Recheck: origin/destination populated, two markers, zero drag ghosts and no page errors.
* Actual local API road queries: Ben Thanh coordinates → Independence Palace, walking **890 m**; motorbike **1.5 km**. Russian turn instructions render with source street names. Switching English → Japanese preserves the route and localizes the selected landmark name.
* Actual transit query: Ben Thanh coordinates → Thao Dien coordinates, **6.2 km**, one Metro 1 boarding: Ga Bến Thành towards Ga Bến xe Suối Tiên, alight at Ga Thảo Điền; verified access/egress approximately 308 m / 301 m. This is a snapshot-routing check, not evidence of current train operation.
* Synthetic camera UI test in a new, separate empty test room: recording auto-stopped at **00:05**, collected **26 clear frames**, showed the English naming/save modal, requested `audio:false`, and produced no horizontal overflow. The draft was discarded without uploading footage. Drawer focus stayed inside the dialog, Korean selection worked and the room QR rendered. No page errors were observed. No user footage was edited or deleted for these checks.

## Practical limits

Viewport emulation and generated camera frames do not validate physical iPhone/Android camera hardware, Safari-specific permission prompts, or recognition accuracy in the user's room. Five-second capture does not eliminate backbone startup time or guarantee identification from a non-overlapping view. Native browser chrome, map tile labels, street/stop names and vehicle headsigns can retain their source language. No human translator has independently proofread all five catalogs.

The transit snapshot has no timetable, waiting/last-service or live disruption data. Selected feature coordinates do not guarantee a currently open entrance. Củ Chi remains a separate excursion, and the cathedral is an exterior viewpoint. Community map services remain appropriate only for the free, low-traffic demo described in README.

After push, release completion also requires passing GitHub CI, a READY production deployment for the pushed SHA, and an HTTPS smoke check of the public alias. These deployment receipts are reported in the delivery; this document records the reproducible pre-release checks without embedding credentials or room capabilities.
