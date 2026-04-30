---
"@audius/mobile": patch
"@audius/common": patch
---

Replace polling-based podcast playback position persistence with an event-driven approach (saving on pause, track change, queue end, and app background) and cap stored positions per user to bound storage growth.
