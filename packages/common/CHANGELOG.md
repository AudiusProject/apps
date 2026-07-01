# @audius/common

## 1.5.79

### Patch Changes

- 272b8db: Fix freeform/custom track genres silently reverting to Electronic on save. `toSdkGenre` in the track adapter filtered out any value not in the canonical `Genre` enum and returned `undefined`, which then fell back to `DEFAULT_GENRE` (Electronic) before reaching the SDK. Now any non-empty genre string is passed through unchanged (the SDK upload schema already caps it at 100 chars), so custom genres entered by artists are preserved end-to-end.
- 98ad217: Forward the running CodePush bundle label to Optimizely as an `otaVersion` attribute (or `"native"` when no OTA is applied), so feature flags can be gated on a specific OTA cut in addition to the native binary version.
- 5d9d4e4: Add `usePrefetchTrackComments` and `usePrefetchTrackPageLineup`, hooks that warm a track's comment list and "more by / remixes / you might also like" lineup as early as possible (e.g. on track screen mount) so those sections render from cache instead of starting their own fetch only once they mount. Each keeps a live observer so the warmed data isn't evicted before the section mounts. `usePrefetchTrackComments` can fire from a bare trackId; `usePrefetchTrackPageLineup` still depends on the hero track + owner handle but starts the instant those resolve rather than waiting for the mobile screen-ready/animation gate.
- 791b612: Hide the profile Contests tab unless the `CONTESTS` feature flag is enabled and the artist hosts at least one remix contest. Previously the desktop and mobile-web profiles always rendered the tab for any artist (ignoring the flag entirely), and the React Native side respected the flag but still showed the tab for artists who don't run any contest — both led to an empty/unreachable destination. Adds a shared `useUserHasRemixContest` hook that paginates the global remix-contest list (matching `ContestsTab`'s page cap) and matches `event.userId` against the host. Direct visits to `/:handle/contests` on a non-qualifying profile fall back to the default tab so the body stays in sync with the (now hidden) tab list.
- f3d55fa: Remove FingerprintJS from all clients and services. Sign-in no longer collects a `visitorId`, the identity service's fingerprint-based OTP bypass is gone (new devices always require OTP), and the anti-abuse-oracle drops the per-fingerprint device-count scoring and UI section.
- f97f1ac: Remove the unused legacy lineup store module (`store/lineup`: `lineupActions`, `lineupReducer`, `lineupSelectors`, `LineupBaseActions`, `lineupRegistry`) from `@audius/common`. The lineup engine has been fully migrated to tan-query hooks plus the playback slice; these exports had no remaining consumers and were not wired into any store.
- b52d005: Rename the Feed page's "Chronological" tab to "Latest" on web and mobile. The persisted `feed-page:tab` localStorage value is migrated transparently so existing users land on the same tab they had selected.
- Updated dependencies [b803e5e]
- Updated dependencies [90725b5]
- Updated dependencies [6bd5c27]
- Updated dependencies [da6c724]
- Updated dependencies [be0537f]
- Updated dependencies [8662a56]
  - @audius/sdk@16.0.0

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
