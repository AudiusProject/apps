# @audius/web

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
