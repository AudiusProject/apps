---
'@audius/common': patch
'@audius/sdk-legacy': patch
'@audius/web': patch
'@audius/mobile': patch
---

Remove FingerprintJS from all clients and services. Sign-in no longer collects a `visitorId`, the identity service's fingerprint-based OTP bypass is gone (new devices always require OTP), and the anti-abuse-oracle drops the per-fingerprint device-count scoring and UI section.
