---
"@audius/mobile": patch
---

Fix mobile performance regression during long-form audio playback by throttling podcast position persistence to once every 5 seconds instead of every progress tick.
