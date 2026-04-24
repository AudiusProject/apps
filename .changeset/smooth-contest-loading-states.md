---
"@audius/web": patch
"@audius/mobile": patch
---

Smooth out the contest explore page and contest detail page loading states:

- Contest explore now paginates via infinite scroll (initial page size 8 web / 6 mobile) so first paint doesn't fan out 25 concurrent cover image requests; tail skeletons render while the next page is fetching.
- Mobile contest cards now render a skeleton (instead of collapsing to nothing) while each card's per-track queries are pending, removing the blank gap users saw between "skeletons" and "cards".
- The web contest card skeleton reserves the same 2-line title block as the populated card to prevent a layout shift when cards swap in.
- The contest detail page hero now sits on a skeleton and layers a small (150×150) blurred thumbnail under the full (1000×1000) cover so the banner is never totally blank while the large image is in flight.
