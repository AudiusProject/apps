---
'@audius/common': patch
'@audius/mobile': patch
'@audius/web': patch
---

Hide the profile Contests tab unless the `CONTESTS` feature flag is enabled and the artist hosts at least one remix contest. Previously the desktop and mobile-web profiles always rendered the tab for any artist (ignoring the flag entirely), and the React Native side respected the flag but still showed the tab for artists who don't run any contest — both led to an empty/unreachable destination. Adds a shared `useUserHasRemixContest` hook that paginates the global remix-contest list (matching `ContestsTab`'s page cap) and matches `event.userId` against the host. Direct visits to `/:handle/contests` on a non-qualifying profile fall back to the default tab so the body stays in sync with the (now hidden) tab list.
