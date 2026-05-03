---
'@audius/mobile': patch
---

Migrate seven legacy redux-saga packages to tan-query hooks (recovery-email, change-password, playlist-updates, search-users-modal, dashboard-page, cache/tracks, recommendation, and the dead search-ai-bar). Mobile-facing changes: AccountSettings now uses `useResendRecoveryEmail`, ChatUserListScreen uses `useSearchUsersModal` infinite query, track edit/delete flows go through `useUpdateTrack`/`useDeleteTrack` hooks instead of the saga + confirmer queue.
