# Landmark model audit

1 November 2026. Scope: ten reference-based monochrome Blender models, geographic placement in MapLibre, initial Independence Palace view and map performance/recovery.

## Authoring and source review

The editable source is [hist-landmarks.blend](../assets/landmarks/hist-landmarks.blend). [Authoring notes](../assets/landmarks/README.md) list the scenes, coordinate contract, dimensions and reference limits. [sites.json](../assets/landmarks/sites.json) retains reference links and OSM-derived outline coordinates. Source photographs were visually reviewed as a contact sheet and were not redistributed in the app. The meshes are original procedural Blender geometry, not downloaded Sketchfab models.

[Open the Blender preview gallery](landmark-models-preview.png). Preview lighting is for reviewing shape; the map uses the lightweight normal-lighting shader described below.

The models retain the principal visual cues: palace screen and T plan; small tunnel hatch; seated memorial figure/flame; Nhà Rồng arcade and roof; projecting war-museum galleries; city-museum colonnade/pediment; Thiên Hậu halls/courtyards; cathedral twin spires; post-office clock pavilion/arched facade; market clock tower/parallel roof sheds.

Seven isolated building footprints were measured from the same OSM-derived OpenFreeMap tiles used by the map. Multipolygon parts and tile seams were merged before measuring. A per-feature-ID shortcut was rejected because the tiles merge many unrelated same-height buildings into shared multipolygon features. The temple's roof strips were isolated from adjoining row houses instead of scaling the model to the merged city block.

North-up footprint views and facade photographs were checked independently of the rendered model. This caught and corrected the War Remnants Museum's facade orientation to **133° toward Võ Văn Tần**, with width/depth 42 × 58.4 m. The cathedral model uses the actual building centre, approximately 63 m from its routing viewpoint. The Củ Chi tunnel POI is not the Bến Dược memorial temple; it uses a small hatch schematic rather than moving that separate building to the wrong coordinates.

## Geometry checks

- All ten destination IDs have near and far GLBs and editable Blender scenes.
- All twenty exports contain one static mesh/primitive, one neutral material, positions/normals/indices and no textures, images, animation, skinning or external buffers.
- Actual exported bounds match the metre-scale width/depth/height catalogue; lowest Y is zero in glTF's Y-up frame.
- Placement tests check axis lengths, facade bearings, footprint envelopes, separate routing/model anchors and double-precision matrix composition before Float32 conversion.
- Each mesh has fewer than 3,000 triangles; all twenty files total **814,104 bytes**. Total near-LOD geometry is **12,980 triangles**; these are asset totals, not an assertion that all sites draw in one frame.
- The loader rejects malformed/truncated GLBs and unsupported scene transforms. An initial export containing Blender's startup cube was caught; exports now restrict both selection and the active scene. Tests require exactly one mesh/node.

The geometry is simplified massing, not a survey. Seven envelopes follow generalized mapped outlines; temple/monument/hatch extents and most heights are approximate. There is no terrain DEM, scale exaggeration or claim that temporary scaffolding/current access is represented.

## Browser checks

A dedicated harness used the same GLB loader, placement and custom layer as the app, with real basemap tiles. Every site was inspected from a pitched facade view and from north-up plan view; the latter overlaid the source footprint. No browser page exceptions, shader errors or GL errors were observed. The actual app was also checked on desktop and phone-sized viewports, including the initial palace framing.

Recovery checks passed:

| Scenario | Observed behavior |
| --- | --- |
| Forced WebGL context loss/restoration | Mesh buffers and shader resources recreated; models drew again |
| Idle after tiles settled | Zero additional render frames during a one-second observation |
| Missing GLB (forced 404) | Optional model marked partial; basemap and pin interaction stayed usable |
| Vector style unavailable | HOT raster fallback loaded and retained the 3D models |
| Mobile layouts | Vietnamese at 320×740; English at 844×390; Korean, Chinese, Japanese and Russian at 390×844 loaded models and toggled perspective without horizontal page overflow |

The default view points toward the palace's facade at 52° pitch. Camera offset places the building below the mobile search panel or to its right on desktop. Model transforms share the map camera/depth buffer; pins and route coordinates remain geographic.

## Performance evidence

On headless Chromium with SwiftShader software rendering, an approximately two-second camera rotation produced:

| Measurement | Models enabled | Basemap only |
| --- | --- | --- |
| Median frame interval | 33.3 ms | 33.3 ms |
| 95th-percentile frame interval | 33.4 ms | 33.4 ms |
| Model CPU submission, median / p95 | 0.1 / 0.1 ms | Not applicable |

This is a local comparative measurement, not a physical-phone FPS guarantee or GPU execution timer. Model asset requests are limited to two concurrent fetches and the viewed area; coarse LODs are used at overview scale. Rendering has one indexed draw per visible site, no shadow maps/textures, and no model-driven animation loop. GPU resources are disposed on style replacement/unmount and restored from a bounded CPU cache after context loss. Content-hashed GLBs use immutable caching. The map chunk grew by about 4.7 kB gzip; no new runtime dependency was added.

## Regression checks

68 unit tests passed across 11 files, including the six model delivery/placement checks. The existing 119-case transit graph audit passed. Frontend and NodeNext server typechecks and the production frontend build passed. Production deployment and browser smoke checks are verified against the pushed commit separately; local results alone are not described as deployed evidence.
