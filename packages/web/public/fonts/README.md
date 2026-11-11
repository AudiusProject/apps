# Landing 2026 fonts

Place the Dust Bucer font files here so the 2026 landing page can load them:

- `DustBucer.woff2` (loaded first; made from the .otf with `pyftsubset DustBucer.otf --glyphs='*' --layout-features='*' --name-IDs='*' --name-languages='*' --legacy-kern --notdef-outline --no-hinting --desubroutinize --flavor=woff2`)
- `DustBucer.otf`
- `DustBucer.ttf`
- `DustBucer Swash.otf`
- `DustBucer Swash.ttf`

They are referenced by `public/fonts-landing-2026.css`.
