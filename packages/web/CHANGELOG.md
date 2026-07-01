# @audius/web

## 1.5.180

### Patch Changes

- 64740af: Fix profile and track cover photo banners being clipped horizontally. An inline `position: relative` on the inner photo div was overriding the CSS module's `position: absolute`, which dropped the photo into the parent flex container alongside the edit button — both flex items competed for space, shrinking the banner below full width.
- 8359c3f: Right-align the Host tag in contest comments to match the track-page `CommentBlock` layout. Previously the badge sat inline next to the username; now the header uses `justifyContent='space-between'` with user link + timestamp on the left and the Host badge in a `flexShrink: 0` wrapper on the right. Applies to both top-level contest comments and nested replies.
- 0bc145f: Fix artist hover card blur overlay overflowing the card. The `.artistCoverPhoto` banner div lacked a positioning context, so the blur overlay's `position: absolute; inset: 0` escaped to the nearest positioned ancestor and bled outside the cover photo banner. Adding `position: relative` (and `overflow: hidden`) to the banner contains the blur to the intended 136px header.
- 4cf2bee: Honor "Request Desktop Site" on mobile browsers: when a mobile browser flips its User-Agent to a desktop one (via the browser's "Request Desktop Site" toggle, or iPadOS Safari's default Mac UA), serve the desktop web app instead of the mobile experience.
- 791b612: Hide the profile Contests tab unless the `CONTESTS` feature flag is enabled and the artist hosts at least one remix contest. Previously the desktop and mobile-web profiles always rendered the tab for any artist (ignoring the flag entirely), and the React Native side respected the flag but still showed the tab for artists who don't run any contest — both led to an empty/unreachable destination. Adds a shared `useUserHasRemixContest` hook that paginates the global remix-contest list (matching `ContestsTab`'s page cap) and matches `event.userId` against the host. Direct visits to `/:handle/contests` on a non-qualifying profile fall back to the default tab so the body stays in sync with the (now hidden) tab list.
- f3d55fa: Remove FingerprintJS from all clients and services. Sign-in no longer collects a `visitorId`, the identity service's fingerprint-based OTP bypass is gone (new devices always require OTP), and the anti-abuse-oracle drops the per-fingerprint device-count scoring and UI section.
- b52d005: Rename the Feed page's "Chronological" tab to "Latest" on web and mobile. The persisted `feed-page:tab` localStorage value is migrated transparently so existing users land on the same tab they had selected.
- 519da44: Smooth out lineup infinite-scroll on Trending, Feed, and other tanquery-driven track lists. The scroll-to-bottom "chunk" had three causes stacked: a small fixed 500px threshold, skeletons that gated on tanquery's `isFetching` (so they only painted after a multi-tick state round-trip), and a per-page skeleton count of just `pageSize` (4 on Trending, ~480px tall on desktop) that didn't fill the loading window. The threshold is now ~2× the scroll parent's viewport, a synchronous trigger flag renders skeletons on the next frame, and the skeleton count is sized to fill the threshold area so the bottom stays populated even when the user scrolls in faster than the next page can return.
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

## 1.5.170

### Patch Changes

- 44dba8d: Automatically follow an artist when a user successfully purchases their artist coin
- ab33d7b: Show likes and reposts counts on album collection pages (desktop)
- 89e0229: Show a loading indicator on the Save Changes button while track and playlist edits are in flight, and wait for the playlist edit saga to apply its optimistic update before navigating away from the edit page.
- ab85f43: Fix Explore page tracks to queue as a lineup so pressing next plays the next track in the section
- 01addc7: Profile edit follow-ups: enforce indexer-mandated length limits on the desktop bio (256), desktop name (32), and native display-name (32) inputs so the discovery indexer can't silently reject long values; surface a toast when profile save fails instead of leaving the user with no feedback. Adds a shared `MAX_BIO_LENGTH` constant in `@audius/common`.
- 9fdd5ec: Add left-slide navigation drawer on mobile web (tapped from top-right avatar or kebab) with account header and items for Profile, Notifications, Messages, Wallet, Fan Clubs, Rewards, Contests, Upload, and Settings — matching the native app's LeftNavDrawer.
- 6da21c6: Add a dedicated Playlist: Play amplitude event that fires when a user starts playback of a playlist or album from the collection page or from a collection tile on web and mobile
- 2e2e7b3: Add collectionId to PLAYBACK_PLAY analytics events when a track is played from a playlist or album context
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

## 1.5.169

### Patch Changes

- a51dd4f: Hide the "Members Only" text on the track locked status badge when the tile is narrower than 640px so the flair no longer wraps and breaks the stats row layout
- 1ec251b: Fix SegmentedControl text color being subdued on initial render when selected value doesn't match any option key
- Updated dependencies [7f7e0a6]
- Updated dependencies [1ec251b]
- Updated dependencies [6c4c717]
- Updated dependencies [4b53e87]
  - @audius/common@1.5.77
  - @audius/harmony@0.5.3
  - @audius/sdk@15.2.0
