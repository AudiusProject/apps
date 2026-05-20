---
'@audius/common': patch
'@audius/web': patch
'@audius/mobile': patch
---

Fix profile page showing the wrong follow state after navigating from a "new track" user-subscription notification. The notifications endpoint now returns a `related.users` block hydrated server-side, but without the requester's perspective — `does_current_user_follow` is omitted. `primeRelatedData` was writing those partial users into the tan-query user cache; because `useUser` / `useUserByHandle` use `staleTime: Infinity` and `primeUserData` skips overwriting an existing entry, the partial prime persisted and the profile page rendered "Follow" for accounts the viewer was already following. Skip the prime when the related user lacks current-user fields and let `useUser`'s batcher fetch fresh data with `currentUserId` instead. (Other `primeRelatedData` callers — comments, events — are unaffected when their server responses include current-user context, and self-heal once the notifications API hydrates the perspective too.)
