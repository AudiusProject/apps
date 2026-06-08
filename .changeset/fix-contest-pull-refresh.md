---
'@audius/mobile': patch
---

Fix a thin white sliver appearing above the cover image when pulling to refresh on the mobile contest page. `ContestHero` was clipping its scaled cover image with `overflow: 'hidden'`, so the existing scale + translate over-scroll interpolation could only stretch within the 220px hero box and never bled upward into the over-scroll gap. The clip is removed (mirroring `ProfileCoverPhoto`), and the title/CTA/countdown section gets its own opaque background to cover the downward bleed — same sibling-with-bg pattern `ProfileHeader` uses below the cover photo.
