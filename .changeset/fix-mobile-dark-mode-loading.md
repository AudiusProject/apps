---
'@audius/mobile': patch
---

Fix initial dark mode load on the mobile app: with theme set to Auto and the system in dark mode, the app launched in light and only flipped after backgrounding. Also fix SelectablePill components keeping the previous palette's colors after a theme flip.
