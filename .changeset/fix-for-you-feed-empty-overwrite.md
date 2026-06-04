---
'@audius/common': patch
---

Fix the For You feed briefly rendering tracks and then blanking to the "follow artists" empty state. `useForYouFeed` had no `staleTime`, so the personalized query refetched on the next mount/focus right after the first paint; if that refetch settled empty (a transient backend result or a different node in the fleet) it replaced the loaded feed with an empty list, which the lineup reads as "no content." The query now uses `staleTime: Infinity` so the loaded feed stays stable for the session, and `enabled` requires a fully-resolved user id so the query no longer seeds an empty cache entry under the `undefined`-id key while the account is still loading.
