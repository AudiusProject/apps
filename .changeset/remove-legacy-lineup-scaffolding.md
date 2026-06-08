---
'@audius/common': patch
---

Remove the unused legacy lineup store module (`store/lineup`: `lineupActions`, `lineupReducer`, `lineupSelectors`, `LineupBaseActions`, `lineupRegistry`) from `@audius/common`. The lineup engine has been fully migrated to tan-query hooks plus the playback slice; these exports had no remaining consumers and were not wired into any store.
