---
'@audius/mobile': patch
---

Fix bottom tab bar color clipping after the comment drawer opens. The drawer rendered a white overlay over the bottom safe area to color the gap below its footer, but it was kept mounted after dismissal and covered the tab bar's surface1 padding, leaving a visible color seam at the bottom. The overlay now only renders while the drawer is visible.
