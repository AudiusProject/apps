---
'@audius/web': patch
---

Honor "Request Desktop Site" on mobile browsers: when a mobile browser flips its User-Agent to a desktop one (via the browser's "Request Desktop Site" toggle, or iPadOS Safari's default Mac UA), serve the desktop web app instead of the mobile experience.
