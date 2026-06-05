---
'@audius/common': patch
---

Add `usePrefetchTrackComments` and `usePrefetchTrackPageLineup`, hooks that warm a track's comment list and "more by / remixes / you might also like" lineup as early as possible (e.g. on track screen mount) so those sections render from cache instead of starting their own fetch only once they mount. Each keeps a live observer so the warmed data isn't evicted before the section mounts. `usePrefetchTrackComments` can fire from a bare trackId; `usePrefetchTrackPageLineup` still depends on the hero track + owner handle but starts the instant those resolve rather than waiting for the mobile screen-ready/animation gate.
