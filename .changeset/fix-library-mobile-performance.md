---
'@audius/mobile': patch
---

Fix performance regressions on the mobile Library screen by stabilizing list keys and memoizing derived data so the screen no longer re-renders the full track / album / playlist list on every state change.
