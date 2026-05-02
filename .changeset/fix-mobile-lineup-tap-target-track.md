---
'@audius/mobile': patch
---

Fix mobile lineup tile taps occasionally skipping to the next track. The active-index sync polled the RNTP queue length, which could exit mid-build during the middle-out enqueue and skip to the wrong absolute position — most visibly on Trending where tapping the second tile sometimes played the third.
