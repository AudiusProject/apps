---
'@audius/web': patch
---

Right-align the Host tag in contest comments to match the track-page `CommentBlock` layout. Previously the badge sat inline next to the username; now the header uses `justifyContent='space-between'` with user link + timestamp on the left and the Host badge in a `flexShrink: 0` wrapper on the right. Applies to both top-level contest comments and nested replies.
