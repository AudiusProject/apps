# @audius/mobile

## 1.5.186

### Patch Changes

- 5a20b85: Fix bottom tab bar color clipping after the comment drawer opens. The drawer rendered a white overlay over the bottom safe area to color the gap below its footer, but it was kept mounted after dismissal and covered the tab bar's surface1 padding, leaving a visible color seam at the bottom. The overlay now only renders while the drawer is visible.
- ea2ca22: Fix a thin white sliver appearing above the cover image when pulling to refresh on the mobile contest page. `ContestHero` was clipping its scaled cover image with `overflow: 'hidden'`, so the existing scale + translate over-scroll interpolation could only stretch within the 220px hero box and never bled upward into the over-scroll gap. The clip is removed (mirroring `ProfileCoverPhoto`), and the title/CTA/countdown section gets its own opaque background to cover the downward bleed — same sibling-with-bg pattern `ProfileHeader` uses below the cover photo.
- 76ef0bb: Restrict the Top Albums This Month, New Album Releases, and Best Selling Albums sections on the Explore page to the Albums tab only, matching web behavior.
- 1259682: Fix video embed sizing in fan club post cards. The WebView's embedded HTML set `iframe { height: 100% }` but neither `<html>` nor `<body>` had an explicit height, so the iframe collapsed and left a visible gap inside the 16:9 container. Giving `html, body` an explicit `100%` height lets the iframe fill the card as intended.
- af63712: Fix initial dark mode load on the mobile app: with theme set to Auto and the system in dark mode, the app launched in light and only flipped after backgrounding. Also fix SelectablePill components keeping the previous palette's colors after a theme flip.
- c917fd6: Fix the mobile play queue drag-to-reorder gesture: dragging a track row was being claimed by the queue drawer's swipe-to-dismiss pan responder, so reorder attempts dragged the drawer down instead. The drawer now suspends its pan responder while a row is being dragged. Also adds a grabber bar above the Queue title and a bit more breathing room in the header.
- 5a5a93f: Smooth out the infinite-scroll feel on Trending and Feed lineups. The mobile `TrackLineup` previously waited a 100ms debounce before dispatching `loadNextPage`, then waited again for the parent's `isFetching` to round-trip back through tanquery before any skeleton rows appeared — so users would scroll to the bottom, see nothing happen, then see late skeletons, then tracks. The threshold is now bumped from 0.5 to a full viewport ahead, the debounce and the duplicate `onScroll` handler are removed, and a synchronous local "load triggered" flag flips skeletons on in the same tick the scroll handler fires.
- 432167f: Migrate seven legacy redux-saga packages to tan-query hooks (recovery-email, change-password, playlist-updates, search-users-modal, dashboard-page, cache/tracks, recommendation, and the dead search-ai-bar). Mobile-facing changes: AccountSettings now uses `useResendRecoveryEmail`, ChatUserListScreen uses `useSearchUsersModal` infinite query, track edit/delete flows go through `useUpdateTrack`/`useDeleteTrack` hooks instead of the saga + confirmer queue.
- 98ad217: Forward the running CodePush bundle label to Optimizely as an `otaVersion` attribute (or `"native"` when no OTA is applied), so feature flags can be gated on a specific OTA cut in addition to the native binary version.
- 791b612: Hide the profile Contests tab unless the `CONTESTS` feature flag is enabled and the artist hosts at least one remix contest. Previously the desktop and mobile-web profiles always rendered the tab for any artist (ignoring the flag entirely), and the React Native side respected the flag but still showed the tab for artists who don't run any contest — both led to an empty/unreachable destination. Adds a shared `useUserHasRemixContest` hook that paginates the global remix-contest list (matching `ContestsTab`'s page cap) and matches `event.userId` against the host. Direct visits to `/:handle/contests` on a non-qualifying profile fall back to the default tab so the body stays in sync with the (now hidden) tab list.
- f3d55fa: Remove FingerprintJS from all clients and services. Sign-in no longer collects a `visitorId`, the identity service's fingerprint-based OTP bypass is gone (new devices always require OTP), and the anti-abuse-oracle drops the per-fingerprint device-count scoring and UI section.
- b52d005: Rename the Feed page's "Chronological" tab to "Latest" on web and mobile. The persisted `feed-page:tab` localStorage value is migrated transparently so existing users land on the same tab they had selected.
- Updated dependencies [b803e5e]
- Updated dependencies [90725b5]
- Updated dependencies [272b8db]
- Updated dependencies [6bd5c27]
- Updated dependencies [98ad217]
- Updated dependencies [da6c724]
- Updated dependencies [be0537f]
- Updated dependencies [5d9d4e4]
- Updated dependencies [791b612]
- Updated dependencies [f3d55fa]
- Updated dependencies [8662a56]
- Updated dependencies [f97f1ac]
- Updated dependencies [b52d005]
  - @audius/sdk@16.0.0
  - @audius/common@1.5.79

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
