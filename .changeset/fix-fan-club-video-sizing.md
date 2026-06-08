---
'@audius/mobile': patch
---

Fix video embed sizing in fan club post cards. The WebView's embedded HTML set `iframe { height: 100% }` but neither `<html>` nor `<body>` had an explicit height, so the iframe collapsed and left a visible gap inside the 16:9 container. Giving `html, body` an explicit `100%` height lets the iframe fill the card as intended.
