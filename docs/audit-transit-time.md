# Public transport instructions and estimated-time routing

29 October 2026. Scope: bus numbers/directions, board/alight stops, transfers, metro stations, time objective, street verification and mobile presentation.

## Findings and repairs

The previous planner minimized `ride metres + 4 × walking metres + 1200 × boardings`. It did not minimize time. It also considered only the nearest twelve endpoint stops, discarded walking-resource alternatives with a single cost label, and accepted the first street-feasible route without re-ranking after street detours.

The planner now minimizes estimated seconds: walking, proportional published running time, expected waiting and boarding/station access. EBMS summaries were fetched with a 1.15-second minimum interval. The regular bus/metro snapshot has 5,707 stops and 313 directed variants: 312 have running times and 302 have usable current-summary headways. School-only, sightseeing and waterbus codes are excluded. Missing timing components are explicitly assumed and marked in the itinerary.

Search includes every endpoint stop within 1 km and retains nondominated time/walking labels. Precomputed directed shape costs participate in selection. Each boarding requires actual travel before alighting. Walking checks replace straight-line lower bounds, enforce individual and total walking limits, and trigger another search, including competing routes. Sub-two-metre endpoint offsets count as the same location. Bounds remain three boardings, 240 m transfer proximity, 1,400 m verified endpoint walks, 650 m transfer walks and 2,400 m total walking.

“Fastest estimate within search limits” means the minimum of this fixed model within that constrained graph. It does **not** mean the earliest real arrival. If the 24-check/32-search budget or a provider error interrupts comparison after finding a feasible journey, the weaker “Best of the verified journeys” label is used. An unverified journey is never returned as a verified fallback.

Itineraries open by default and show bus/metro line code, headsign, exact boarding/alighting names, source addresses, stop count, ride/wait estimates and published hours when available. A transfer either says to remain at the same stop or shows the walking leg, next line number and expandable street directions. Road maneuvers use the existing six-language structured translator.

## Verification

| Check | Result and limits |
| --- | --- |
| TypeScript, production build | Passed |
| Vitest | 49 tests passed; 15 new transit cases include an independent exhaustive oracle over 100 deterministic generated directed networks |
| Time regressions | Faster transfer beats slow direct service; infrequent express can lose after waiting; shape detours affect search; verified walk detours can change the winner |
| Constraint regressions | One-way service, repeated-stop loop, no zero-distance boarding/alighting, maximum transfers, previously discarded walking-resource alternative, final walking budget and explicit bounded-result label |
| Public graph matrix | 119/119 paths found: all 90 ordered landmark pairs, 24 directed metro pairs, five feeder/mixed cases. 95 direct, 20 one-transfer, four two-transfer; 29 metro, including five mixed bus/metro |
| Direction integrity | Board/alight indices, positive stop counts, headsign/line names and walking/boarding limits asserted for all 119 paths |
| Local graph performance | Initialization approximately 0.14–0.26 seconds; slowest observed search approximately 2 seconds on this machine. This is not a mobile performance guarantee |
| Live walking-provider samples | Bến Thành market → Thiên Hậu temple: bus 56, approximately 24 minutes in the model, three distinct walking checks. Chợ Lớn → Suối Tiên: bus 56 → Ba Son → walk to Ga Ba Son → Metro 1, approximately 69 minutes, eight distinct walking checks. Both settled after re-ranking |
| Metro endpoint samples | Bến Thành ↔ Bến xe Suối Tiên: both directions remain Metro 1, 29-minute published ride plus 7.5-minute expected wait and three-minute station allowance; approximately 40 minutes, not a live departure prediction |
| Mobile/localization | 18 browser combinations: six locales × 320×740, 390×844 and 844×390. Bus 56, Ba Son transfer, Metro 1 and Suối Tiên alighting present; walking directions expandable; no horizontal document/sheet overflow or page exceptions |

The mobile matrix uses controlled walking RPC responses to isolate layout and translations. It does not validate street geometry. The two live street samples above used the public Valhalla service; attempts to repeat them and the Nguyễn Siêu → Chợ Lớn sample encountered local TLS chain errors (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`). Certificate verification was not disabled. Consequently this audit does not claim that all live-provider samples passed or that all 119 graph paths have verified street connectors.

Reproduce the graph audit with `npm run audit:transit -- --write`; ignored `.tmp/transit-audit.json` contains each itinerary. It also runs in GitHub CI. Algorithm regressions are in `tests/transit-time.test.ts`.

## Remaining accuracy boundaries

Published headways are averages/ranges. Partial rides interpolate full-line duration by shape distance. There are no per-stop departure schedules, arrival predictions, traffic, disruption, last-service or chosen-date calendar checks. Published operating hours do not establish that a service is available now. A shorter trip can be faster on foot; transit mode requires at least one ride. A real-world “fastest route” claim requires authoritative departure/arrival and service-availability data, then validation against those data. The UI and README state this limit.

No room capabilities, footage, recognition behavior, secrets or MongoDB access settings were changed.
