---
'@audius/common': patch
---

Add `usePrefetchTrackComments`, a hook that warms a track's comment list query as early as possible (e.g. on track screen mount, in parallel with the track fetch) so the comment section renders from cache instead of starting its own fetch only once it mounts. It keeps a live observer on the `gcTime: 0` comment-list query so the warmed data isn't evicted before the comment section mounts, and uses the default `Top` sort/page size to guarantee a cache hit.
