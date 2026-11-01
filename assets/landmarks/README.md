# Historical site models

Ten original, editable Blender scenes for the existing HIST destinations. These are recognizable architectural massing models rather than scans or construction drawings. No downloaded mesh or photograph is embedded. All geometry uses one neutral material; differences in brightness come from lighting and surface normals.

## Files and reproduction

- `hist-landmarks.blend`: one scene per destination, named by slug. Each contains near/far meshes and a review camera/light. The far mesh is hidden in the authoring view.
- `sites.json`: placement, dimensions, facade bearing, source footprint and reference URLs. This is the editable source of geographic metadata.
- `../../scripts/build-landmarks.py`: procedural Blender authoring and export script.
- `../../src/maps/siteModelCatalog.json`: generated runtime catalogue with content-hashed URLs, byte sizes and triangle counts.
- `../../public/models/sites/*.glb`: generated single-mesh GLB assets. The app loads only the LODs needed for the current viewport.

From the repository root, with Blender 5.2 installed:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python scripts/build-landmarks.py
```

Append `-- --no-render` to skip preview renders. The script saves the Blender source, updates both GLB LODs and the runtime catalogue, and removes only stale generated GLBs in `public/models/sites`. It does not run during the web build; CI validates the checked-in outputs. Reference photographs remain outside the shipped assets.

## Coordinate contract

Blender uses metres, +Z up, +Y toward the main facade and +X to its right. The standard glTF export is Y-up, so the facade becomes -Z. `frontBearing` is the geographic direction the facade faces, clockwise from true north. The runtime converts these axes to Mercator east/south/up, using the latitude-specific metre scale, then combines camera and model matrices in double precision before uploading a float matrix.

Ground-relative altitude is 0.12 m to avoid depth fighting with the basemap. It is not a measured height above sea level. Physical model dimensions stay constant when zoom changes; there is no icon-style enlargement.

| Site / scene | Envelope W × D × H (m) | Facade bearing | Recognizable features |
| --- | --- | --- | --- |
| Independence Palace / `palace` | 86.1 × 76.8 × 26 | 43° | T plan, horizontal slabs, bamboo screen, roof pavilion |
| Củ Chi–Bến Dược / `cu-chi` | 1.4 × 2.2 × 1.2 | Not surveyed; schematic hatch | Raised ground hatch and rim; not a building or underground network |
| Thích Quảng Đức Memorial / `memorial` | 13 × 9 × 6.8 | Approx. 43° | Seated figure, flame surround, low relief wall |
| Nhà Rồng Wharf / `wharf` | 34.6 × 27.8 × 15 | 334.7° | Wraparound arcade, broad hipped roof, paired ridge ornaments |
| War Remnants Museum / `war-museum` | 42 × 58.4 × 19 | 133° | Projecting upper gallery, pilotis and stair tower facing Võ Văn Tần |
| Ho Chi Minh City Museum / `city-museum` | 68.5 × 36.9 × 21 | 131.5° | Classical colonnade, pediment and projecting wings |
| Thiên Hậu Temple / `temple` | 27.5 × 60.5 × 11.5 | Approx. 183.3° | Three roofed halls, open courtyards, side galleries and ridges |
| Notre Dame Cathedral / `cathedral` | 34 × 89.2 × 60.5 | 135° | Twin spires, nave, aisles and apse |
| Central Post Office / `post-office` | 70 × 61 × 19 | 222.3° | Long arched facade, clock pavilion and central hall |
| Ben Thanh Market / `market` | 99.2 × 138.6 × 27 | 149.4° | Clock tower, parallel roof sheds and central raised aisle |

## References and accuracy

Architectural photographs and institutional pages are linked per site in `sites.json`. They guide silhouette and relative proportions, not a claim of measured accuracy for every detail. The palace's [published 26 m height](https://dinhdoclap.gov.vn/en/exhibition/intriguing-inner-court-secrets-of-the-independence-palace/) is used; other heights are reference-proportion estimates. The cathedral represents the recognizable permanent structure, without temporary restoration scaffolding or a claim about current visitor access.

Seven building outlines come from [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://openmaptiles.org/) and OpenStreetMap contributors, inspected 1 November 2026. Tile seams were merged before deriving oriented envelopes. The OSM-derived coordinates retain [ODbL attribution](https://www.openstreetmap.org/copyright). Generalized tile geometry can differ from surveyed roof edges. The temple shares walls with adjacent buildings and uses an isolated roof-strip estimate instead of the merged city-block outline. Monument extents and the Củ Chi hatch are schematic POI interpretations; their small dimensions and bearings are not survey measurements.

Routing coordinates remain in `src/maps/landmarks.ts`. In particular, the cathedral viewpoint is about 63 m from the building centre. Moving a model to its footprint centre must not silently change the routing endpoint.

## Runtime limits

One indexed primitive and one draw call per visible landmark; no textures, animation, skinning, morph targets or external dependencies. Each GLB is below 250 kB and the complete near/far set is below 1 MB. Mesh parsing validates the restricted contract. A failed optional asset leaves the basemap and routing available. Context restoration recreates GPU buffers from the CPU cache; unmount/style changes release GPU resources and cancel pending fetches.
