# HIST ornament sources

The dragon is the user's hand-drawn design, restored from its original SVG implementation in commit `a4ba34b`. Its outline, claws, brow, whiskers and pearl are preserved in `dragon.svg`.

The lantern, river pavilion and lotus compass are manual, simplified native-path recreations of the user-requested [Canva concept](https://www.canva.com/M/MAHZUmAsJs0?utm_source=OC-AaBlKrqBJJNF&utm_campaign=agent_connector_create_image_asset_opened), media `MAHZUmAsJs0`, **not SVG exports from Canva**. No raster images are embedded. The Canva dragon is no longer used.

Each file has an `artwork` group, a fixed viewBox and inherits `currentColor`. The app references that group using an SVG `use` element. Cinnabar details use `#8e3e34`. There are no scripts, external fonts or external image references. Decorative SVGs are hidden from screen readers; their enclosing controls have localized labels.
