---
"@audius/common": patch
---

Fix profile edit save silently failing for users whose profile record has a null `name`, `handle`, or `is_deactivated`. The SDK's strict `UpdateProfileSchema` rejected null on these fields; the adapter now coerces them to undefined before send.
