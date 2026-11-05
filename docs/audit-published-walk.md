# Published central walk — implementation and verification

Reviewed 5 November 2026 (Asia/Saigon). The feature is a three-stop exterior guide: Central Post Office → Notre Dame Cathedral → Independence Palace. It adds no fictional storyline and makes no claim of a museum partnership or guaranteed interior access.

## Shared identity and content

`src/tour/content.ts` owns stable stop IDs, exterior routing waypoints, English/Vietnamese editorial content, observation/access notes, primary-source links and photograph credits. The six-language interface is separate from the explicitly labelled two-language guide. Source citations appear beside factual paragraphs, with full links and review date in each stop. The historical photos are references rather than current access evidence.

Post-office construction/design is supported by Vietnam Post's [site introduction](https://vnpost.vn/vi/hoat-dong-nganh/buu-dien-trung-tam-thanh-pho-ho-chi-minh-mot-diem-den-hap-dan) and [architecture/maps article](https://vnpost.vn/vi/guong-dien-hinh-hoc-va-lam-theo-bac/buu-dien-tp-ho-chi-minh-lot-top-buu-dien-dep-nhat-the-gioi). Cathedral history and restoration use the Archdiocese's [history](https://tgpsaigon.net/bai-viet/ngay-09-12-cung-hien-nha-tho-duc-ba-sai-gon-50510) and [2026 restoration report](https://tgpsaigon.net/bai-viet/lap-dat-8-hang-trang-tri-dinh-mai-cua-so-tren-hai-thap-kem-nha-tho-duc-ba-sai-gon-89336). Palace dates/design and historical context use the site's [architecture](https://dinhdoclap.gov.vn/kien-truc-dinh-doc-lap/) and [history](https://dinhdoclap.gov.vn/lich-su-dinh-doc-lap/) pages. Text is an original concise paraphrase. Observation prompts and the 45–60 minute allowance are editorial guidance, not source quotations, a timed field trial or a surveyed route.

## Visitor flow

The public deep link opens the guide after language selection, without a room API call or device permission request. The ordinary entry retains Explore and Dev choices. Guide progress is independent of room credentials. Visitors can select any stop manually, mark it complete, pause/resume, finish early, review incomplete stops and confirm a reset. Audio playback, content selection, GPS and camera matches do not create completion or a physical-visit claim. The reduced-motion preference and existing view transitions remain supported.

Audio is device speech synthesis, explicitly started by a tap. A matching-language voice is selected; short queued utterances avoid long-utterance stalls. Changing stop, guide language, tab, role or page visibility cancels playback. Unsupported/missing voices and speech errors retain the full readable guide. Available voices and actual pronunciation are browser/OS dependent; the browser acceptance fixture verifies lifecycle events, not narration quality on a physical phone.

## Camera and private compatibility

The public artifact contains three classes and nine supports, extracted by the real DINOv2/ORB worker from three licensed 2019 photographs with three crops each. The frozen backbone is not fine-tuned. [Build receipt](public-recognition-build.json) and [photo licences/provenance](../public/guide/README.md) distinguish self-source regression from independent accuracy. Geometry and temporal rejection remain enabled; no threshold was relaxed for this feature.

Real-worker browser integration on a 390×844 viewport used synthetic camera streams from each published photo. All three matched and opened the correct source-backed article; switching to the guide ended the camera tracks and left completion empty. A blank scene stayed `...` without a story shortcut. These tests prove pipeline wiring with familiar reference imagery. They do not establish outdoor recognition accuracy, scaffold coverage, performance on physical iPhones/Android devices or instant cold startup. Manual stop selection remains available.

Private clips optionally bind to a known `siteId`. The server validates/stores/returns that optional field; existing clips remain compatible. Only an unambiguous binding across matching ready reference labels opens content. Validation, background, pending and conflicting/unbound clips cannot infer a stop. Public and room models are selected independently. Background room preparation fits/caches an artifact but does not restore over an active public camera classifier; recognition/evaluation explicitly restores its selected model.

A public walk QR contains only `?tour=central-architecture-v1`. Room QR capability behavior remains read-only. The QR image is cleared when changing targets and obsolete generation promises cannot display a previous target's image. Existing private footage was not published or modified for the public dataset.

## Map integration

The guide supplies endpoint objects through a versioned request. Stop 1 leaves origin empty; later stops explicitly use the previous exterior stop as a planned origin. A visible note distinguishes that plan from the visitor's live position. No automatic GPS access occurs. Existing pin editing, road/transit modes and Blender layers remain available. New requests invalidate stale requests; asynchronous finalizers only clear their own request's busy state.

The real production road API was queried for both exterior legs: Post Office → Cathedral returned HTTP 200, 99 m, 78 s and seven instructions; Cathedral → Palace returned HTTP 200, 581 m, 511 s and thirteen instructions, using Valhalla/OSM. The overview rounds the 680 m total to approximately 0.7 km. Provider results validate route availability at the time of the check, not present-day pavement access, crossings, construction barriers or wheelchair accessibility; visitors must follow on-site restrictions.

## Offline and modal repairs

The generated production service worker pre-caches the public shell, base serif subsets, guide photographs and ornaments. It never caches API/room responses, external map tiles, route results or vision weights. Runtime public script/style/font caching is bounded separately. New guide entry requires an initial online installation; local progress and saved text/photos can then survive an offline reload. Routing and first-time vision setup still require network availability.

Offline checks exposed a static-cache `Vary: Origin` mismatch in preview. Ignoring Vary is confined to this allowlist of same-origin public static assets. Optional native-language font loading now fails gracefully offline. The reload test passed with photos, sourced text and current-stop progress; attempting to load a new map offline retained the guide with an explanatory message. Cache inspection found no private/API entries. The missing-voice branch retained readable text, and public QR generation worked offline.

A new confirmation dialog initially inherited the app shell's `inert` state. All modals now portal to `document.body`, preserving the existing background lock and focus trap while keeping nested confirmations clickable. The full Dev regression passed with this repair.

## Local verification

- 87 unit tests in 13 files passed, including explicit completion/early finish/resume, corrupt storage, ambiguous room bindings, public artifact compatibility and server binding validation.
- Frontend build and NodeNext server typecheck passed.
- 24 viewport/language combinations passed: English, Vietnamese, Korean, Chinese, Japanese and Russian at 320×740, 390×844, 844×390 and 1440×1000. No horizontal overflow or page exceptions were recorded.
- The browser tour journey passed first/later-stop map endpoints, source links, speech cancellation, denied camera/GPS, reload/resume, all-stop completion, early finish and restart confirmation. Road and voice/permission responses were fixtures in this acceptance script; it is not evidence of provider availability or actual voice quality.
- Blocked storage retained usable session-only progress and pause/resume.
- Dev regression passed five-second capture, camera denial/retry/switching, draft preservation/download after failed save, retry/train, saved-video download, site binding in the saved payload, retrain, read-only room QR, validation/evaluation, deletion of isolated mock data and map/camera destination selection.
- Production-build offline and real-worker synthetic-camera checks passed as described above. Physical on-site testing remains a separate task.

Reproducible acceptance scripts and environment overrides are documented in the README. Production deployment verification is recorded separately after the exact main commit is live.
