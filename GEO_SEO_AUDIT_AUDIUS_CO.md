# GEO & SEO Audit: audius.co

**Date:** March 17, 2026
**Auditor:** Claude Code (automated analysis)

---

## Executive Summary

audius.co has a **solid technical SEO foundation in its codebase** — SSR via Vike, dynamic OG images, comprehensive sitemaps, rich JSON-LD schema, and an `llms.txt` file for AI discoverability. However, **critical deployment and configuration gaps** severely undermine its actual SEO and GEO performance. The SSR infrastructure appears to not be serving rendered content to crawlers (pages return JavaScript shells), sitemaps return 404 errors, meta descriptions are missing, and there are no AI-crawler-specific directives. These issues mean that despite having the right code, audius.co is likely **invisible or poorly represented in both traditional search and AI-generated answers**.

### Overall Scores

| Area | Score | Status |
|------|-------|--------|
| **GEO (Generative Engine Optimization)** | 4/10 | Needs major work |
| **Technical SEO** | 3/10 | Critical issues |
| **On-Page SEO** | 4/10 | Significant gaps |
| **Structured Data** | 6/10 | Good foundation, issues |
| **AI Crawler Accessibility** | 5/10 | Mixed — llms.txt exists but content not accessible |
| **Social/Sharing** | 5/10 | OG image service exists but tags not rendering |

### Top 5 Critical Issues

1. **SSR is not serving rendered HTML** — Crawlers see "You need to enable JavaScript" instead of actual content
2. **Sitemaps return 404** — `/sitemaps/track/index.xml`, `/sitemaps/user/index.xml`, `/sitemaps/playlist/index.xml` all 404
3. **No meta descriptions** on any page tested
4. **No AI crawler management** — No GPTBot, PerplexityBot, or other AI bot directives in robots.txt
5. **Track/artist pages show generic titles** when SSR fails — "Audius — Free Music Streaming" instead of "Skrillex • Audius"

---

## 1. GEO (Generative Engine Optimization) Analysis

### 1.1 AI Crawler Accessibility

| Signal | Status | Notes |
|--------|--------|-------|
| `robots.txt` allows AI crawlers | ✅ Pass | `User-agent: *` / `Allow: /` — no blocks |
| `llms.txt` exists | ✅ Pass | Comprehensive developer-focused content |
| `llms-full.txt` exists | ❌ Fail | Returns fallback page, not extended content |
| `ai-plugin.json` exists | ❌ Fail | Returns 500 error |
| `ai.txt` exists | ❌ Fail | Returns fallback page |
| Content accessible without JS | ❌ Critical | Pages return JS shell — AI crawlers cannot read content |
| Explicit AI bot directives | ❌ Missing | No GPTBot, Google-Extended, PerplexityBot, CCBot rules |

**Assessment:** The `llms.txt` file is a strong forward-looking signal — it provides a well-structured developer-focused overview of Audius with SDK docs, API links, and integration paths. However, it's **developer/agent focused** rather than **consumer/discovery focused**. An AI engine answering "what is Audius?" or "best decentralized music platforms" won't find consumer-facing content because the main site pages return empty JS shells to non-browser crawlers.

### 1.2 Content Citability & Authority Signals

GEO relies on AI engines finding authoritative, quotable content. Current state:

| Signal | Status | Notes |
|--------|--------|-------|
| Clear, quotable value proposition | ❌ Weak | Only in JSON-LD schema, not in rendered HTML |
| Statistics & data points | ❌ Missing | No user counts, track counts, or metrics on crawlable pages |
| Expert quotes / testimonials | ❌ Missing | No artist endorsements in crawlable content |
| FAQ content | ❌ Missing | No FAQ schema or content on main site |
| Comparison content ("vs Spotify") | ❌ Missing | Third-party sites own this narrative |
| Freshness signals | ❌ Weak | No lastmod on sitemaps, no date-stamped content |
| Source citations in content | ❌ N/A | No long-form content to cite from |

### 1.3 Third-Party AI Mentions

When searching for Audius in AI-relevant contexts:
- **Strong third-party presence**: Kraken, Coinbase, Binance Academy, Decrypt, CoinMarketCap all have explainer pages
- **Crypto-heavy framing**: AI engines are likely to frame Audius primarily as a "crypto/blockchain music platform" rather than a mainstream music streaming service
- **Competitor comparisons exist**: "Audius vs Spotify" content exists on third-party sites, but Audius doesn't own this narrative
- **7.5M+ users milestone** is mentioned in press — this stat should be on the site for AI citation

### 1.4 llms.txt Quality Assessment

The existing `llms.txt` at `/llms.txt` is **good for developers but missing for consumers**:

**Strengths:**
- Clear platform description
- SDK and API documentation links
- Developer onboarding paths
- Links to docs.audius.co

**Gaps:**
- No consumer-facing content (what is Audius for listeners?)
- No artist success stories or platform stats
- No links to trending/popular content
- No mention of key features (free streaming, artist payouts, USDC payments)
- No `llms-full.txt` with extended content

---

## 2. Technical SEO Analysis

### 2.1 Server-Side Rendering (SSR)

**Codebase:** The codebase has a complete SSR setup using Vike (Vite plugin) with dedicated render handlers for tracks, profiles, collections, and generic pages.

**Reality:** Every page tested returned a JavaScript shell with minimal static content:
- Homepage: "You need to enable JavaScript to run this app"
- `/trending`: Same JS shell
- `/Skrillex`: Title shows "Skrillex • Audius" but body is empty
- `/Skrillex/bangarang-feat-sirah-1`: Falls back to generic "Audius — Free Music Streaming" title
- `/explore`: JS shell
- `/feed`: JS shell

**Possible causes:**
- `VITE_SSR` environment variable may not be enabled in production
- SSR may be gated behind user-agent detection (only serving to known bots)
- Deployment configuration may bypass SSR

**Impact:** This is the **single most critical SEO/GEO issue**. Without rendered HTML, Google's JS rendering queue adds days of delay, and AI crawlers that don't execute JS see nothing.

### 2.2 Sitemap Health

| Sitemap | Status | Notes |
|---------|--------|-------|
| Referenced in robots.txt | ✅ | 4 sitemaps listed |
| `/sitemaps/default.xml` | ❌ 404 | Not found |
| `/sitemaps/track/index.xml` | ❌ 404 | Not found |
| `/sitemaps/user/index.xml` | ❌ 404 | Not found |
| `/sitemaps/playlist/index.xml` | ❌ 404 | Not found |

**Impact:** Search engines cannot discover content programmatically. The sitemap generation code exists in the Discovery Provider (`get_sitemap.py`) and filters for entities with 10+ followers, but the endpoints are not responding.

### 2.3 Robots.txt

```
User-agent: *
Allow: /

Sitemap: https://audius.co/sitemaps/default.xml
Sitemap: https://audius.co/sitemaps/track/index.xml
Sitemap: https://audius.co/sitemaps/playlist/index.xml
Sitemap: https://audius.co/sitemaps/user/index.xml
```

**Issues:**
- No crawl-delay directive
- No specific AI crawler rules
- Points to broken sitemaps
- No disallow for auth/account recovery/settings pages (wasted crawl budget)

### 2.4 Page Speed & Core Web Vitals

Based on code analysis (not live measurement):
- **Heavy JS bundles**: React SPA with Google Analytics, Facebook Pixel, Optimizely, Cloudflare challenge scripts
- **Emotion CSS**: Server-extracted when SSR works, but falls back to client-side injection
- **No resource hints visible**: Missing preconnect/prefetch for critical origins
- **Recommendation**: Run PageSpeed Insights at `https://pagespeed.web.dev/analysis?url=https://audius.co` for live CWV data

### 2.5 URL Structure

**Good:**
- Clean URLs: `/ArtistName`, `/ArtistName/track-name`
- Logical hierarchy for content types

**Issues:**
- No canonical tags rendered (exist in code but SSR not delivering them)
- No hreflang tags (single language site, acceptable)
- Hash-based routing fallback could create duplicate content issues

---

## 3. On-Page SEO Analysis

### 3.1 Title Tags

| Page | Expected | Actual (fetched) |
|------|----------|-------------------|
| Homepage | "Audius — Free Music Streaming for Artists, Labels & Fans" | ✅ Correct (hardcoded in index.html) |
| `/Skrillex` | "Skrillex • Audius" | ⚠️ Sometimes correct, sometimes falls back to generic |
| `/Skrillex/bangarang-feat-sirah-1` | "Bangarang feat. Sirah by Skrillex • Audius" | ❌ Shows generic title |
| `/trending` | Dynamic | ❌ Shows generic title |
| `/explore` | Dynamic | ❌ Shows generic title |

### 3.2 Meta Descriptions

**All pages tested: No meta description found.**

The `MetaTags.tsx` component generates descriptions using `createSeoDescription()`, but since SSR isn't delivering rendered HTML, these never appear in the static HTML that crawlers read.

### 3.3 Heading Hierarchy

Without SSR, pages have no semantic heading structure. The codebase renders proper H1/H2/H3 tags client-side, but crawlers see nothing.

### 3.4 Open Graph Tags

**Codebase capability:**
- Full OG tag support (title, description, image, url, type)
- Dynamic OG images via `og.audius.co/{entity_type}/{hash_id}`
- Twitter Card support (summary_large_image, player for embeds)
- Farcaster Frame metadata

**Reality:** OG tags are not present in static HTML for any page tested. The `<meta property="helmet" />` placeholder exists in `index.html` but is not being replaced server-side.

### 3.5 Image SEO

- OG image service (`og.audius.co`) is functional and returns valid images
- No alt text on the default OG image in index.html
- Client-side images likely have alt text but it's not crawlable without JS

---

## 4. Structured Data Analysis

### 4.1 Static JSON-LD (in index.html)

Three schema types are hardcoded and **always present** (this is the one SEO element that works):

```json
{
  "@type": "Organization",
  "name": "Audius",
  "description": "A decentralized music streaming and sharing platform...",
  "sameAs": ["twitter", "github", "discord", "instagram"]
}

{
  "@type": "WebSite",
  "description": "Free music streaming for artists, labels, and fans..."
}

{
  "@type": "SoftwareApplication",
  "applicationCategory": "MusicApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": { "price": "0", "priceCurrency": "USD" }
}
```

### 4.2 Dynamic JSON-LD (SSR-dependent)

The codebase generates rich schema for:
- `MusicRecording` (tracks) — with title, description, release date, ListenAction
- `MusicGroup` (artist profiles) — with bio, URL, ListenAction
- `MusicAlbum` (playlists/albums) — with name, description, ListenAction
- Remix attribution via `isBasedOn`

**Issue:** Uses `http://schema.googleapis.com/` context instead of standard `https://schema.org/`. This non-standard namespace may not be recognized by all AI engines and rich result validators.

### 4.3 Missing Schema Types

| Schema Type | Benefit | Present? |
|-------------|---------|----------|
| `FAQPage` | AI snippet eligibility, GEO citation | ❌ |
| `HowTo` | "How to use Audius" queries | ❌ |
| `Review` / `AggregateRating` | Star ratings in SERPs | ❌ |
| `BreadcrumbList` | Navigation rich results | ❌ |
| `VideoObject` | For any video content | ❌ |
| `Event` | For live events / listening parties | ❌ |

---

## 5. Content & Authority Analysis

### 5.1 On-Site Content

| Content Type | Present? | Notes |
|-------------|----------|-------|
| Blog / editorial content | ❌ | No blog on audius.co (blog.audius.co may exist separately) |
| Help center | ✅ | help.audius.co (separate subdomain) |
| Developer docs | ✅ | docs.audius.co (server-rendered, good indexability) |
| About / company page | ❌ | audius.org exists but is separate |
| Landing pages for key queries | ❌ | No "What is Audius" or "Audius vs Spotify" pages |
| Artist spotlight / case studies | ❌ | No crawlable artist success stories |

### 5.2 E-E-A-T Signals (Experience, Expertise, Authoritativeness, Trust)

| Signal | Status |
|--------|--------|
| Clear company identity | ⚠️ Organization schema present, but no about page |
| Contact information | ❌ Not visible |
| Trust signals (user count, press) | ❌ Not on crawlable pages |
| Author attribution | ❌ N/A (no editorial content) |
| Privacy policy / ToS | ✅ Linked in sitemap |

---

## 6. Competitive GEO Positioning

When AI engines answer queries about music streaming, Audius faces challenges:

| Query | Who Wins Today | Audius Position |
|-------|---------------|-----------------|
| "What is Audius?" | Third-party sites (Kraken, Decrypt, Coinbase) | Audius.co doesn't rank with useful content |
| "Best decentralized music platforms" | Listicle sites | Mentioned but not cited from own content |
| "Audius vs Spotify" | Medium, comparison blogs | No owned comparison content |
| "Free music streaming platforms" | Generic listicles | Rarely mentioned; framed as "crypto" not "free streaming" |
| "How to upload music to Audius" | help.audius.co, third parties | Help center works, main site doesn't |

---

## 7. Recommendations

### P0 — Critical (Fix Immediately)

1. **Enable and verify SSR in production**
   - Ensure `VITE_SSR=true` in production environment
   - Verify SSR is serving rendered HTML to all user agents (not just known bots)
   - Test with `curl -s https://audius.co/trending | grep "<h1"` — should return real content
   - This single fix resolves meta tags, OG tags, heading hierarchy, and crawlable content

2. **Fix broken sitemaps**
   - Verify Discovery Provider sitemap endpoints are accessible at `audius.co/sitemaps/*`
   - Check if reverse proxy / CDN is blocking these routes
   - Add `<lastmod>` dates to all sitemap entries

3. **Add meta descriptions**
   - Ensure `createSeoDescription()` output is rendered server-side
   - Homepage should have a hardcoded meta description in `index.html` as fallback:
     `"Audius is a free music streaming platform where artists upload directly and fans listen without paywalls. Discover trending tracks, playlists, and independent artists."`

### P1 — High Priority (Next 2-4 Weeks)

4. **Add AI crawler directives to robots.txt**
   ```
   # AI Crawlers - explicitly allowed
   User-agent: GPTBot
   Allow: /

   User-agent: Google-Extended
   Allow: /

   User-agent: PerplexityBot
   Allow: /

   User-agent: ChatGPT-User
   Allow: /

   User-agent: anthropic-ai
   Allow: /

   User-agent: CCBot
   Allow: /

   # Waste reduction
   User-agent: *
   Disallow: /settings
   Disallow: /messages
   Disallow: /dashboard
   Disallow: /favorites
   Disallow: /history
   ```

5. **Create `llms-full.txt`** with consumer-focused content:
   - What Audius is (for listeners, not just developers)
   - Key stats: 7.5M+ users, number of tracks, artist payouts
   - How it differs from Spotify/SoundCloud
   - Key features: free streaming, artist coins, USDC payments
   - Top artists on the platform
   - How to get started as a listener vs. artist

6. **Fix JSON-LD context namespace**
   - Change `http://schema.googleapis.com/` to `https://schema.org/`
   - Validate with Google's Rich Results Test

7. **Add FAQ schema** to key landing pages
   - "What is Audius?" / "How does Audius work?" / "Is Audius free?"
   - These directly feed AI engine answers

### P2 — Medium Priority (Next 1-2 Months)

8. **Create SEO landing pages** for high-value queries:
   - `/about` — "What is Audius" (entity page for Knowledge Panel)
   - `/artists` — showcase top artists with stats
   - `/compare` — honest comparison with Spotify, SoundCloud, etc.
   - `/for-artists` — artist onboarding with success stories

9. **Add `BreadcrumbList` schema** for navigation context

10. **Implement `AggregateRating` or review schema** if user ratings exist

11. **Create a consumer-facing blog** on audius.co (not a separate subdomain) for:
    - Artist spotlights
    - Platform updates
    - Music industry analysis
    - "How to" content for artists and listeners

12. **Add structured data for individual tracks** with:
    - `duration` property
    - `genre` property
    - `datePublished`
    - Play count / engagement metrics

### P3 — Long-term (Ongoing)

13. **Content freshness program** — AI engines have strong recency bias; update key pages quarterly
14. **PR and third-party citation strategy** — Get mentioned in authoritative music industry publications (not just crypto publications) to shift AI framing from "crypto music platform" to "free music streaming platform"
15. **Monitor AI visibility** — Track how Audius appears in ChatGPT, Perplexity, Google AI Overviews for target queries
16. **Internationalization** — Add hreflang tags if/when multi-language support is added

---

## 8. GEO-Specific Quick Wins

These require **no code changes** and can dramatically improve AI engine visibility:

1. **Update `llms.txt`** to include consumer-facing content alongside developer content
2. **Add statistics to schema.org markup**: user count, track count, artist count
3. **Ensure third-party profiles are updated**: Wikipedia (if exists), Crunchbase, app store descriptions should use consistent messaging focused on "free music streaming" not just "decentralized/blockchain"
4. **Submit to AI directories**: Ensure Audius is listed in AI-crawled directories and databases

---

## Appendix: Data Sources

- Direct HTML fetching of audius.co pages (homepage, /trending, /explore, /Skrillex, /feed)
- robots.txt analysis
- Sitemap endpoint testing
- llms.txt content review
- Codebase analysis (packages/web SSR setup, MetaTags.tsx, metaTags.ts, index.html, get_sitemap.py)
- Web search for third-party mentions and GEO best practices
- GEO best practices from SearchEngineLand, GenOptima, LLMrefs, Superlines (2026 guides)

### GEO Best Practices Sources
- [GenOptima 2026 Playbook](https://www.gen-optima.com/blog/generative-engine-optimization-best-practices-complete-2026-playbook/)
- [SearchEngineLand GEO Guide](https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142)
- [LLMrefs GEO Guide](https://llmrefs.com/generative-engine-optimization)
- [Superlines GEO Checklist](https://www.superlines.io/articles/generative-engine-optimization-best-practices-checklist)
- [llms.txt Specification](https://llmstxt.org/)
