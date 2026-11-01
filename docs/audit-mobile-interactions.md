# Mobile role and interaction repair

1 November 2026. Scope: restore the user's hand-drawn dragon, investigate Dev entry on phones, and check the main interaction workflows.

## Reproduced failures

1. **Dev entry depended on storage.** At 390×844 with normal touch animations and a deliberately stalled `workspace.create`, the previous UI stayed at the title, the iris remained visible, and role buttons remained disabled. The role transition awaited room creation. Room refresh also blocked entry for existing users.
2. **Server import failed outside the frontend bundler.** The new `server/maps.ts` dependency `src/maps/address.ts` imported `./geo` without a file extension. The current production API returned a non-JSON server error during the live probe. Compiling the server as Node ESM and importing its emitted entry reproduced `ERR_MODULE_NOT_FOUND` for that exact path. The ordinary bundler-mode TypeScript check had passed. Both server-used imports now use `.js`, and `typecheck:server`/`tsconfig.server.json` enforce NodeNext resolution in CI. The emitted API imports successfully in Node 24.22.1 without tsx.

## Changes

- Role entry updates the workspace immediately. Room refresh runs in the background; Dev room creation happens only on save/train or explicit QR sharing. Camera opening and recording no longer require a successful storage request. Server failure preserves the draft for retry/download.
- RPC requests abort after 25 seconds, clear their timers, and map non-JSON hosting errors to a known connection error. Blocked localStorage writes do not break the active session; persistence across reload is unavailable in that case.
- Curtain cleanup always hides the overlay and unlocks navigation. If its opening animation fails before the role change, navigation still executes once.
- Library/QR errors are visible inside the active dialog. QR sharing shows a selectable read-only link, disables automatic copy where the Clipboard API is absent, and confirms successful copy. Only the read capability is shared.
- The user's original dragon paths and viewBox from commit `a4ba34b` are restored in `public/art/dragon.svg`, used by the title, camera placeholders and curtains. The other ornaments keep their current artwork; provenance text is corrected.

## Evidence before deployment

| Check | Observed result |
| --- | --- |
| Stalled-server replay | Dev workspace opens; iris is hidden and camera button enabled |
| Role matrix | 18 combinations: six languages × 320×740, 390×844 and 844×390. Both roles open and return, drawer focus is contained, and role entry makes no storage call |
| Full touch journey | Permission denial/retry, camera switching, five-second automatic stop, manual stop, naming/options, failed save with retained/downloadable draft, successful retry, library, saved-video download, retrain, QR/copy/download, validation/evaluation, deletion, return to roles, User map/camera tabs and ten destinations passed |
| Unit checks | 62 tests passed, including RPC timeout/cleanup, non-JSON server errors and blocked persistent storage |
| Server loading | NodeNext check and native Node import of emitted API passed; the same native import failed before the extension fix |
| Build | Production frontend build passed |

The touch journey uses an actual browser canvas stream and MediaRecorder, but simulated vision messages and isolated storage responses. It checks UI and retry sequencing; it does not establish physical-camera quality, ML accuracy or cloud availability. The full vision/database flow is checked separately after deployment with a synthetic scene and an isolated test room. Only footage created by that audit may be deleted. Existing user rooms and footage are not touched.

Headless Chromium phone emulation does not cover every physical iPhone/Android device. A ready Vercel deployment or HTTP 200 for the HTML shell alone is not treated as proof that save/train works. Production verification must include the database-backed API and classifier persistence.

## Production verification

The public alias `https://nosleepclub-hist-connected.vercel.app/` served commit `6470181fa4168f418c55703af12a26764ba77473` from Vercel deployment `dpl_6uQddvq8aHJoTtvSPuksZfoEho33` in READY state. [GitHub Actions run 41313905897](https://github.com/dakiemdarktharr/NoSleepClub_HIST/actions/runs/41313905897) passed for that same commit.

Two live browser journeys used the actual API, MongoDB, vision worker, model weights and map providers. Only camera input was synthetic. The second journey reused the first journey's isolated test room, then opened the read-only QR link in a new browser context with no writer storage or in-memory classifier.

| Production operation | Observed result |
| --- | --- |
| Dev entry and five-second recording | Role opened and capture produced a nameable draft |
| First save/train | `workspace.create`, `footage.create`, `footage.chunk`, `footage.frames`, `footage.complete`, `workspace.get`, `frames.get` and `model.save` all returned HTTP 200 |
| Saved-video download | Browser download completed after HTTP 200 from `media.get` |
| Retrain saved references | Reference loading and a second `model.save` returned HTTP 200 |
| QR sharing | Link contained the reader capability and excluded the writer capability |
| Fresh reader session | `workspace.get` and `model.get` returned HTTP 200; the real vision pipeline recognized its synthetic reference |
| Read-only mutation | Attempt to delete the audit's own clip with the reader key returned the expected HTTP 403 |
| Walking route | `maps.route` returned HTTP 200 and rendered a route |
| Six production languages | Both roles, return navigation, camera-start availability, library open/close and the restored dragon passed at 390×844 for English, Vietnamese, Korean, Chinese, Japanese and Russian |
| Pin and address search | A map pick resolved to Công trường Quách Thị Trang in the origin input; `maps.reverse` and `maps.search` returned HTTP 200 |
| Map tilt and wheel | Toggling perspective and scrolling retained a ready map with visible basemap tiles |
| Motorbike route | Ben Thanh Market to Independence Palace rendered a 1.5 km route (estimated six minutes) |
| Metro route | Ben Thanh Market to Ga Bến xe Suối Tiên rendered Metro 1, boarding at Ga Bến Thành and alighting at Ga Bến xe Suối Tiên, with access walking and estimated waiting |
| Bus route | Ben Thanh Market to Thien Hau Temple rendered Bus 56, boarding at the Hàm Nghi interchange and alighting at Hùng Vương Plaza, with walking legs and stop addresses |
| Cleanup | Each audit clip was deleted with its own writer capability (HTTP 200); no existing user footage or rooms were modified |

The live journeys and map/role checks emitted no browser page exceptions. These results verify persistence and the production workflow for the tested input. Recognizing the training scene is not an independent accuracy evaluation, and no claim is made that every physical-phone camera or every possible interaction has been tested. Transit routes use the existing search limits, static service snapshot and estimated waits; this audit does not establish the fastest journey under current traffic or actual arrivals.
