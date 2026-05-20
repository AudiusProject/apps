---
'@audius/sdk': minor
---

Add an optional `userId?: string` query parameter to three endpoints so the backend can personalize embedded users in `related.users` / collection owners (`does_current_user_follow`, etc.):

- `events.getRemixContests`
- `users.getContestsByUser`
- `playlists.getPlaylistsNewReleases`

Without this, the endpoints' handlers (`app.getMyId(c)`) resolved the requester id from the missing `?user_id=` query and got `0`, so embedded user objects came back with `does_current_user_follow: false` for everyone. Clients that primed those into a shared cache (e.g. via `primeRelatedData` / `primeCollectionData`) silently poisoned follow state for the surfaced artists.

Existing callers continue to work unchanged — the field is optional. Pass `Id.parse(currentUserId)` (or whichever id your app treats as "me") to opt in.
