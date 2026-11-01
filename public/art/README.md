# Nếp Phố ornament sources

The dragon is the user's hand-drawn design, restored from its original SVG implementation in commit `a4ba34b`. Its outline, claws, brow, whiskers and pearl are preserved in `dragon.svg`.

The lantern, river pavilion and lotus compass are manual, simplified native-path recreations of the user-requested [Canva concept](https://www.canva.com/M/MAHZUmAsJs0?utm_source=OC-AaBlKrqBJJNF&utm_campaign=agent_connector_create_image_asset_opened), media `MAHZUmAsJs0`, **not SVG exports from Canva**. No raster images are embedded. The Canva dragon is no longer used.

These four ornament files have an `artwork` group, a fixed viewBox and inherit `currentColor`. The app references that group using an SVG `use` element. Cinnabar details use `#8e3e34`. There are no scripts, external fonts or external image references. Decorative SVGs are hidden from screen readers; their enclosing controls have localized labels.

`indochine-tiles.svg` is a separate original repeating background drawing: fourfold leaves, a floral centre, corner arcs and a narrow grout line in moss green/brick red on paper. It takes visual direction from the traditional symmetry and palette discussed in [Viettiles' cement-tile guide](https://www.viettiles.com/blog-detail/ideas-for-using-patterned-cement-tiles-in-restaurants-to-create-eye-catching-focal-points) and the user's supplied tile references. No product photograph or traced manufacturer pattern is embedded. CSS softens the repeat behind reading areas; the camera feed and map remain unobscured.
