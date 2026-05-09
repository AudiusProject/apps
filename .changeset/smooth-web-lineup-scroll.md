---
'@audius/web': patch
---

Smooth out lineup infinite-scroll on Trending, Feed, and other tanquery-driven track lists. The scroll-to-bottom "chunk" had three causes stacked: a small fixed 500px threshold, skeletons that gated on tanquery's `isFetching` (so they only painted after a multi-tick state round-trip), and a per-page skeleton count of just `pageSize` (4 on Trending, ~480px tall on desktop) that didn't fill the loading window. The threshold is now ~2× the scroll parent's viewport, a synchronous trigger flag renders skeletons on the next frame, and the skeleton count is sized to fill the threshold area so the bottom stays populated even when the user scrolls in faster than the next page can return.
