---
'@audius/common': patch
---

Point the For You feed at the live `GET /v1/tracks/recommended` endpoint (`sdk.tracks.getRecommendedTracks`) instead of `GET /v1/users/{id}/feed/for-you`. The dedicated for-you endpoint is not yet deployed across the validator-node fleet and 404s in production, leaving the For You tab empty. `/tracks/recommended` is the same personalized recommendation source the Explore page used before the For You feed existed and reliably returns 200 today. It has no `offset`, so pagination passes the already-seen track ids as `exclusionList`. Revert to `getUserForYouFeed()` once the new endpoint is rolled out.
