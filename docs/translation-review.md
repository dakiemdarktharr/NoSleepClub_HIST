# Dragon placeholder, motion and translation review

28 October 2026. This revision follows the user's hand-drawn reference and request for gentler transitions and a language review.

## Artwork and motion

`CloudDragon` is an editable SVG recreation of the supplied sketch: a long curved body, upright head, heavy brow, small horns, stepped dorsal ridge, loose claws, forked tail and separate orb. Its transparent background and `currentColor` keep it usable on paper and camera placeholders. It is explicitly a temporary placeholder. The source screenshot is not copied into the repository.

The iris uses 0.72 s coverage + 0.48 s reveal (previously 0.42 + 0.24). Return wipes use 0.48 s per phase, with 0.065 / 0.055 s stagger across five strips. Symmetric easing softens acceleration. Hover grows only 1.2%; press shrinks 1.5%, with timed easing instead of a spring. Typewriter text holds for about five seconds and types/deletes more slowly. Reduced motion still bypasses curtains and typewriter animation.

## Language findings and corrections

Reviewed the English base, Korean, Simplified Chinese, Japanese and Russian UI catalogs, progress/error messages, selected place names and structured route maneuvers. This was an editorial review by the assistant, not independent certification by native-speaking translators.

| Area | Problem | Correction |
| --- | --- | --- |
| Title | Russian `Мгновения Хошимин` needed a different grammatical case; Chinese/Japanese prefixes were literal and awkward | `Взгляд на Хошимин`, `走近胡志明市`, `ふと出会うホーチミン市` work with the rotating place names |
| Korean directions | `{place}(으)로` exposed a grammatical alternative instead of choosing a natural construction | Use the neutral label `다음 지점: {place}`, valid with arbitrary source names |
| Korean sharp turns | `크게 우회전/좌회전` could imply a wide turn | Use `급우회전/급좌회전` for sharp turns |
| Japanese continuation | `直進` could overstate that the road must be straight | `道なりに進む` conveys continuing along the road |
| Russian camera | `Прямой эфир` suggested a public broadcast | `В реальном времени` describes the local live feed |
| Russian map labels | `назначение` alone read like “purpose”; merge wording meant changing lanes | Use `пункт назначения`; describe merging into traffic |
| Củ Chi note | Japanese `別の遠足` sounded like another school outing | `市街地とは別行程`; equivalent separate-itinerary labels in Korean and Chinese |
| Bến Dược | Unverified Chinese characters and inconsistent phonetic spellings could identify the wrong proper name | Preserve `Bến Dược` in every locale; retain the original Vietnamese place line |
| QR heading | “Open the same references” did not describe the sharing sheet well | Localize “Share this reference set” consistently |
| Status / errors | Camera-off text said it was waiting for references; route failure sounded like absence from the whole dataset | Separate camera-off status and qualify route failures by the search constraints |
| Narrow Russian layout | Long role names broke inside words | Stack the two role buttons at widths up to 390 px |

Terminology distinguishes recognition references, held-out evaluation clips, camera access, map point selection, boarding/alighting and transfers. Numbers/placeholders remain consistent across all five locales. Source street/stop/headsign names and Dev-authored labels remain unchanged. Proper-name retention is intentional, not a missing translation. Browser/OS permission prompts and map tile text remain outside the app catalog.

## Checks

* TypeScript, production build and the existing 34 tests pass, including catalog completeness, placeholder parity and real runtime progress formats.
* Production-build browser checks cover five locales at 320×740, 390×844 and 844×390: role title, SVG placeholder, ten-place dropdown, Bến Dược name rendering and horizontal overflow.
* Observed role-entry transition: approximately 1.25 s; return: 1.49 s. Reduced-motion role entry: approximately 43 ms. Timing can include extra server work when Dev creates a room.
* No page or console errors in the local browser checks. The native fonts load with the revised text; no font dependencies or CSP permissions were added.

This review improves wording, meaning and layout but is not a guarantee that every stylistic choice is the only acceptable translation. Native-speaker review remains useful before a public release beyond the test app. Recognition thresholds, footage schema, room capabilities, MongoDB settings and routing algorithms were not changed.
