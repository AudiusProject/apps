# @audius/common

## 1.5.78

### Patch Changes

- 44dba8d: Automatically follow an artist when a user successfully purchases their artist coin
- 89e0229: Show a loading indicator on the Save Changes button while track and playlist edits are in flight, and wait for the playlist edit saga to apply its optimistic update before navigating away from the edit page.
- ab85f43: Fix Explore page tracks to queue as a lineup so pressing next plays the next track in the section
- d5e8ecf: Fix cross-device account sync so refreshing on Device B picks up edits made on Device A instead of showing stale localStorage data
- 8387d1c: Replace polling-based podcast playback position persistence with an event-driven approach (saving on pause, track change, queue end, and app background) and cap stored positions per user to bound storage growth.
- 01addc7: Profile edit follow-ups: enforce indexer-mandated length limits on the desktop bio (256), desktop name (32), and native display-name (32) inputs so the discovery indexer can't silently reject long values; surface a toast when profile save fails instead of leaving the user with no feedback. Adds a shared `MAX_BIO_LENGTH` constant in `@audius/common`.
- 5d61140: Fix profile edit save silently failing for users whose profile record has a null `name`, `handle`, or `is_deactivated`. The SDK's strict `UpdateProfileSchema` rejected null on these fields; the adapter now coerces them to undefined before send.
- 6da21c6: Add a dedicated Playlist: Play amplitude event that fires when a user starts playback of a playlist or album from the collection page or from a collection tile on web and mobile
- 2e2e7b3: Add collectionId to PLAYBACK_PLAY analytics events when a track is played from a playlist or album context
- Updated dependencies [c8f9a4d]
  - @audius/sdk@15.3.0

## 1.5.77

### Patch Changes

- 7f7e0a6: Invalidate fan club feed and comment queries after coin swaps so locked content unlocks without requiring a page refresh
- Updated dependencies [6c4c717]
- Updated dependencies [4b53e87]
  - @audius/sdk@15.2.0
