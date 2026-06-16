---
'@audius/common': patch
---

Fix freeform/custom track genres silently reverting to Electronic on save. `toSdkGenre` in the track adapter filtered out any value not in the canonical `Genre` enum and returned `undefined`, which then fell back to `DEFAULT_GENRE` (Electronic) before reaching the SDK. Now any non-empty genre string is passed through unchanged (the SDK upload schema already caps it at 100 chars), so custom genres entered by artists are preserved end-to-end.
