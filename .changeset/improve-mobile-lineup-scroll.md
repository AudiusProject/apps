---
'@audius/mobile': patch
---

Smooth out the infinite-scroll feel on Trending and Feed lineups. The mobile `TrackLineup` previously waited a 100ms debounce before dispatching `loadNextPage`, then waited again for the parent's `isFetching` to round-trip back through tanquery before any skeleton rows appeared — so users would scroll to the bottom, see nothing happen, then see late skeletons, then tracks. The threshold is now bumped from 0.5 to a full viewport ahead, the debounce and the duplicate `onScroll` handler are removed, and a synchronous local "load triggered" flag flips skeletons on in the same tick the scroll handler fires.
