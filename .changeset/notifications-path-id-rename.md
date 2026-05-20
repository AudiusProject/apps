---
'@audius/sdk': major
---

Rename the path field on `getNotifications` and `getPlaylistUpdates` from `userId` to `id`, matching the convention used by every `/users/{id}/…` method. Add an optional `userId` query field that carries the requester id for personalization of embedded `related.users` (e.g. `does_current_user_follow`).

**Migration:**

```ts
// Before
sdk.notifications.getNotifications({ userId: 'aE9MA' })
sdk.notifications.getPlaylistUpdates({ userId: 'aE9MA' })

// After
sdk.notifications.getNotifications({
  id: 'aE9MA',          // notifications owner (was `userId`)
  userId: 'aE9MA'       // requester id, for personalization of related.users
})
sdk.notifications.getPlaylistUpdates({ id: 'aE9MA', userId: 'aE9MA' })
```

The two ids differ only when a manager reads a managed user's notifications; in the normal flow they're the same value. The wire format and server URL are unchanged — only the request type shape was renamed to remove a collision between the path and the new query parameter.
