---
'@audius/web': patch
---

Fix profile and track cover photo banners being clipped horizontally. An inline `position: relative` on the inner photo div was overriding the CSS module's `position: absolute`, which dropped the photo into the parent flex container alongside the edit button — both flex items competed for space, shrinking the banner below full width.
