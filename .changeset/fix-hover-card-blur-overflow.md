---
'@audius/web': patch
---

Fix artist hover card blur overlay overflowing the card. The `.artistCoverPhoto` banner div lacked a positioning context, so the blur overlay's `position: absolute; inset: 0` escaped to the nearest positioned ancestor and bled outside the cover photo banner. Adding `position: relative` (and `overflow: hidden`) to the banner contains the blur to the intended 136px header.
