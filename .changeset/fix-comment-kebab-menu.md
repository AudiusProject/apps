---
'@audius/mobile': patch
---

Fix the comment kebab (three-dot) menu in mobile: tapping the kebab now reliably opens the action drawer with Edit/Delete (and other) options. The previous handler toggled `isOpen`/`isVisible` from captured state, which let the two booleans drift out of sync after a swipe-close mid-animation — from then on, taps re-rendered the drawer with `isOpen=false` and it never slid back in. Also dropped a redundant inner `CommentSectionProvider` wrap inside the Portal that could short-circuit the drawer to `null` while its track query rehydrated.
