---
'@audius/web': patch
---

Smooth out lineup infinite-scroll on Trending, Feed, and other tanquery-driven track lists. Skeletons used to gate on tanquery's `isFetching`, so the next page only painted after the scroll handler → `loadNextPage` → tanquery state round-trip — long enough that scrolling fast left a visible "stuck at the bottom" gap. The threshold is now ~one viewport (matching mobile) and a synchronous trigger flag renders skeletons on the next frame instead of waiting for `isFetching` to propagate.
