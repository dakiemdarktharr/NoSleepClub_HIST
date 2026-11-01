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
