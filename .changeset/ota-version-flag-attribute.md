---
'@audius/common': patch
'@audius/mobile': patch
---

Forward the running CodePush bundle label to Optimizely as an `otaVersion` attribute (or `"native"` when no OTA is applied), so feature flags can be gated on a specific OTA cut in addition to the native binary version.
