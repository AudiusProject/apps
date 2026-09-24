---
'@audius/sdk': patch
---

When a storage node reports an audio upload as done without its transcode result, poll the next node and fail after two minutes instead of waiting for the 20-minute stall timeout.
