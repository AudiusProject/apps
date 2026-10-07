# Landing 2026 fonts

Dust Bucer font files for the 2026 landing and download pages:

- `DustBucer.woff2`
- `DustBucer-Swash.woff2`

They are referenced by `public/fonts-landing-2026.css`. `DustBucer.woff2` is also
preloaded by `LandingPage2026.tsx`.

Files under `/fonts/` are served with a one-year immutable cache, so ship a
changed font under a new filename.
