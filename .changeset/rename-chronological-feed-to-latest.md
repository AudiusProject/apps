---
'@audius/web': patch
'@audius/mobile': patch
'@audius/common': patch
---

Rename the Feed page's "Chronological" tab to "Latest" on web and mobile. The persisted `feed-page:tab` localStorage value is migrated transparently so existing users land on the same tab they had selected.
