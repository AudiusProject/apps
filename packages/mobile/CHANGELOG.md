# @audius/mobile

## 1.5.180

### Patch Changes

- 44dba8d: Automatically follow an artist when a user successfully purchases their artist coin
- ab85f43: Fix Explore page tracks to queue as a lineup so pressing next plays the next track in the section
- be98c72: Fix mobile contest detail header backdrop staying on the light theme after the system/app theme flips. The title, submissions-due block, countdown, and hosted-by row now re-theme alongside the rest of the screen.
- 72af6ee: Fix performance regressions on the mobile Library screen by stabilizing list keys and memoizing derived data so the screen no longer re-renders the full track / album / playlist list on every state change.
- 8387d1c: Replace polling-based podcast playback position persistence with an event-driven approach (saving on pause, track change, queue end, and app background) and cap stored positions per user to bound storage growth.
- 1b1c38a: Fix mobile profile tracks tab showing "no tracks" regression when visiting an artist's profile, and stop rendering skeleton tiles for the albums/playlists tabs when the user has zero of them.
- 45a6ebb: Fix the blurred nav overlay that fades in when scrolling the profile and contest screens not adapting to dark mode. The banner now uses a dark blur in dark themes (matching the rest of the page), and the phone's status bar icons switch to light content so they stay readable against the dark blur.
- 30cafec: Fix double divider on mobile profile header when the profile has no fan-club button
- 01addc7: Profile edit follow-ups: enforce indexer-mandated length limits on the desktop bio (256), desktop name (32), and native display-name (32) inputs so the discovery indexer can't silently reject long values; surface a toast when profile save fails instead of leaving the user with no feedback. Adds a shared `MAX_BIO_LENGTH` constant in `@audius/common`.
- abe841d: Fix SelectablePill components (e.g., the Trending category pills) not adapting to system theme changes until the next interaction.
- 5816e86: Fix now-playing drawer not closing when tapping the artist or track link while a profile screen is already open
- 6da21c6: Add a dedicated Playlist: Play amplitude event that fires when a user starts playback of a playlist or album from the collection page or from a collection tile on web and mobile
- 2e2e7b3: Add collectionId to PLAYBACK_PLAY analytics events when a track is played from a playlist or album context
- 12e8eb4: Remove the "PRIZES AVAILABLE" pill from contest cards on the explore surface. Prize details are still available on the dedicated contest page.
- Updated dependencies [44dba8d]
- Updated dependencies [89e0229]
- Updated dependencies [ab85f43]
- Updated dependencies [d5e8ecf]
- Updated dependencies [8387d1c]
- Updated dependencies [01addc7]
- Updated dependencies [5d61140]
- Updated dependencies [6da21c6]
- Updated dependencies [2e2e7b3]
- Updated dependencies [c8f9a4d]
  - @audius/common@1.5.78
  - @audius/sdk@15.3.0

## 1.5.175

### Patch Changes

- 8737f59: Fix deep links navigating through Feed tab instead of Trending (the actual root screen)
- c6095c9: Fix unlock drawer title color to match lock icon default
- Updated dependencies [7f7e0a6]
- Updated dependencies [1ec251b]
- Updated dependencies [6c4c717]
- Updated dependencies [4b53e87]
  - @audius/common@1.5.77
  - @audius/harmony@0.5.3
  - @audius/sdk@15.2.0
