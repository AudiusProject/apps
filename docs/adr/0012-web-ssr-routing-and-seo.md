# 0012. Routing, SSR and SEO on web

- Status: Accepted
- Date: 2026-11-21

## Context

The Cloudflare worker SSR, route shapes, metadata for crawlers and the public site. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `scripts/workers-site/index.js`

- workers-site cacheControlForPathname returns real Cache-Control strings with long-term immutable caching for hashed assets; a numeric value was invalid and read as no-cache by Lighthouse. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/workers-site/index.js#L12))
- The workers-site handler uses a custom mapRequestToAsset for apple-app-site-association because Cloudflare treats extensionless paths as directories and looks up index.html. ([L496](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/scripts/workers-site/index.js#L496))

### `src/app/web-player/WebPlayer.tsx`

- WebPlayer only scrolls to top and updates route state when the pathname changes, so query-param changes do not reset scroll. ([L576](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/web-player/WebPlayer.tsx#L576))

### `src/components/animated-switch/AnimatedSwitch.tsx`

- AnimatedSwitch keeps stack-reset state in an instance var so the window.onpopstate handler can read it and skip animations. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/animated-switch/AnimatedSwitch.tsx#L96))
- AnimatedSwitch disables animation via location.state.noAnimation because react-router v6 does not expose the navigation action for replace transitions. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/animated-switch/AnimatedSwitch.tsx#L171))

### `src/components/animated-switch/RouterContextProvider.tsx`

- RouterContextProvider tracks a stack-reset flag; when the stack is reset the next page transition is immediate instead of animated. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/animated-switch/RouterContextProvider.tsx#L24))

### `src/components/app-redirect-popover/AppRedirectListener.tsx`

- AppRedirectListener redirects in-app, reloads #embed links without the redirect host and /app-redirect path, and sends other mobile web hits to the app store. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/app-redirect-popover/AppRedirectListener.tsx#L23))

### `src/components/embed-modal/EmbedModal.tsx`

- EmbedModal builds embed URLs from permalinks when available because private tracks and collections need them. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/embed-modal/EmbedModal.tsx#L49))

### `src/components/header/mobile/HeaderContextProvider.tsx`

- HeaderContextProvider clears the header on pathname change so callers only set it and never clean up. ([L54](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/header/mobile/HeaderContextProvider.tsx#L54))

### `src/components/link/SeoLink.tsx`

- SeoLink renders a real anchor for crawlers but is not itself clickable for navigation. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/link/SeoLink.tsx#L10))

### `src/components/mobile-page-container/MobilePageContainer.tsx`

- MobilePageContainer only records scroll when the path still matches its initial path, because it can stay mounted after a route switch. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/mobile-page-container/MobilePageContainer.tsx#L92))

### `src/components/nav/mobile/ConnectedBottomBar.tsx`

- ConnectedBottomBar tracks the last nav route in a ref computed synchronously, because React Router v7 location updates can precede re-renders and cause loops. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/mobile/ConnectedBottomBar.tsx#L48))

### `src/components/nav/mobile/NavContext.tsx`

- useTemporaryNavContext sets the mobile nav on mount and restores the previous nav when the component unmounts, for flows like playlist creation opened from many contexts. ([L105](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/mobile/NavContext.tsx#L105))

### `src/components/navigation-prompt/NavigationPrompt.tsx`

- NavigationPrompt's blockInAppNavigation should only be used where the form never navigates away itself after saving, such as upload. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/navigation-prompt/NavigationPrompt.tsx#L21))

### `src/components/tabs/Tabs.tsx`

- Tabs highlights the first registered tab when none matches, so the accent shows on URLs like /handle where /handle/tracks is canonical. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tabs/Tabs.tsx#L96))
- Tabs' useIsRouteActive always calls useResolvedPath/useMatch for hook rules, passing a stub path in controlled mode and ignoring the result. ([L254](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tabs/Tabs.tsx#L254))
- Tabs preserves the current query string on tab links so Library's ?filter= and ?search= survive tab clicks. ([L374](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tabs/Tabs.tsx#L374))

### `src/components/track/GiantTrackTile.tsx`

- GiantTrackTile scrolls to the comment section in a setTimeout because replacing history resets the scroll. ([L221](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/GiantTrackTile.tsx#L221))

### `src/hooks/useLastLocation.ts`

- useLastLocation replaces react-router-last-location, which does not work with react-router v6. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useLastLocation.ts#L5))

### `src/index.tsx`

- index.tsx reloads the page once when a lazy chunk fails to load after a deploy, guarded so it cannot loop. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/index.tsx#L1))

### `src/pages/contest-page/components/desktop/ContestPage.tsx`

- The ContestPage submissions filter is stored in URL search params so deep links and back/forward work like RemixesPage. ([L268](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L268))

### `src/pages/library-page/lib/libraryUrl.ts`

- Library URL filter values are all, favorites, reposts and premium, where 'premium' maps to the purchased category. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/lib/libraryUrl.ts#L32))

### `src/pages/not-found-page/ServerNotFound.tsx`

- ServerNotFound is the SSR NotFoundPage; it uses deep Harmony imports and skips the Lottie animation and background to keep the worker bundle small. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/not-found-page/ServerNotFound.tsx#L13))

### `src/pages/profile-page/components/desktop/ProfilePage.tsx`

- Desktop ProfilePage falls back to the default tab when /:handle/contests is visited on a profile that hosts no contest, so the body matches the hidden tab list. ([L220](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/desktop/ProfilePage.tsx#L220))

### `src/pages/profile-page/components/mobile/ProfilePage.tsx`

- Mobile ProfilePage falls back to the default tab when the URL points at /contests but the host runs no contests, keeping the body in sync with the hidden tab list. ([L181](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/mobile/ProfilePage.tsx#L181))

### `src/pages/search-page/hooks.ts`

- Search setCategory uses flushSync on mobile so the stack reset is committed before navigation, disabling the page transition animation. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-page/hooks.ts#L53))

### `src/pages/track-page/DesktopServerTrackPage.tsx`

- DesktopServerTrackPage inlines formatDate to avoid pulling dayjs into the server-rendered bundle. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/track-page/DesktopServerTrackPage.tsx#L30))
- DesktopServerTrackPage inlines formatSecondsAsText to avoid pulling dayjs into the server-rendered bundle. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/track-page/DesktopServerTrackPage.tsx#L46))

### `src/pages/track-page/MobileServerTrackPage.tsx`

- MobileServerTrackPage inlines formatDate to avoid pulling dayjs into the server-rendered bundle. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/track-page/MobileServerTrackPage.tsx#L30))
- MobileServerTrackPage inlines formatSecondsAsText to avoid pulling dayjs into the server-rendered bundle. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/track-page/MobileServerTrackPage.tsx#L46))

### `src/pages/weekly-rotation-page/WeeklyRotationPage.tsx`

- WeeklyRotationPage only emits OG card and canonical meta tags for the handle route because the bare route is per-viewer. ([L239](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/weekly-rotation-page/WeeklyRotationPage.tsx#L239))

### `src/public-site/components/handleClickRoute.ts`

- handleClickRoute prevents default on SEO anchor hrefs and cannot use pushRoute because the public site has its own router context; external URLs replace href, internal ones use navigate. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/public-site/components/handleClickRoute.ts#L26))
- handleClickRoute does a full window load for http URLs and landing page routes so landing pages start from zero state instead of being picked up by the app router. ([L44](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/public-site/components/handleClickRoute.ts#L44))

### `src/public-site/pages/landing-2026/LandingPage2026.tsx`

- LandingPage2026 registers stylesheet load/error listeners before appending the link tags so cached stylesheet load events are not missed. ([L111](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/public-site/pages/landing-2026/LandingPage2026.tsx#L111))

### `src/public-site/pages/landing-2026/components/FAQ2026.tsx`

- FAQ2026 uses an inline chevron SVG so its color (white, purple on hover) can be controlled without overriding the Harmony icon theme. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/public-site/pages/landing-2026/components/FAQ2026.tsx#L7))

### `src/public-site/pages/landing-2026/components/Nav2026.tsx`

- Nav2026 resets the closing dropdown state after a 300ms timeout because animationend may never fire if the dropdown unmounts, which would block reopening. ([L137](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/public-site/pages/landing-2026/components/Nav2026.tsx#L137))

### `src/ssr/+onRenderClient.tsx`

- ssr/+onRenderClient HYDRATE_CLIENT can be set false to skip client hydration when testing raw SSR output. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/+onRenderClient.tsx#L12))

### `src/ssr/audio/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/audio/+onRenderClient.tsx#L1))

### `src/ssr/cash/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/cash/+onRenderClient.tsx#L1))

### `src/ssr/coins/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/coins/+onRenderClient.tsx#L1))

### `src/ssr/collection/+onBeforeRender.ts`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/collection/+onBeforeRender.ts#L3))

### `src/ssr/collection/+onRenderHtml.tsx`

- SSR +onRenderHtml creates a fresh Emotion cache per request so styles and theme context are not shared across requests. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/collection/+onRenderHtml.tsx#L46))
- SSR +onRenderHtml serves the raw artwork/profile picture to Discord bots instead of the custom OG image because Discord crops OG unfurls to an odd aspect ratio. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/collection/+onRenderHtml.tsx#L68))

### `src/ssr/contest/+onBeforeRender.tsx`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/contest/+onBeforeRender.tsx#L3))

### `src/ssr/dashboard/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/dashboard/+onRenderClient.tsx#L1))

### `src/ssr/download/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/download/+onRenderClient.tsx#L1))

### `src/ssr/explore/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/explore/+onRenderClient.tsx#L1))

### `src/ssr/feed/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/feed/+onRenderClient.tsx#L1))

### `src/ssr/history/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/history/+onRenderClient.tsx#L1))

### `src/ssr/legal/+Page.tsx`

- ssr/legal LegalPage renders the policy document server-side so it is readable without client-side JavaScript. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/legal/+Page.tsx#L6))

### `src/ssr/legal/documents.ts`

- ssr/legal/documents.ts legalDocuments paths must match the documents the public site displays. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/legal/documents.ts#L1))

### `src/ssr/library/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/library/+onRenderClient.tsx#L1))

### `src/ssr/messages/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/messages/+onRenderClient.tsx#L1))

### `src/ssr/metaTags.ts`

- ssr/metaTags isDiscord exists because Discord crops OG unfurls to an odd aspect ratio, so SSR serves raw artwork instead of the custom OG image. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/metaTags.ts#L72))
- ssr/metaTags getTrackPageContext labels originals 'Original' and remixes 'Remix' with isBasedOn pointing to the original so the original ranks above remixes for the track name. ([L434](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/metaTags.ts#L434))

### `src/ssr/notifications/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/notifications/+onRenderClient.tsx#L1))

### `src/ssr/polyfills.ts`

- ssr/polyfills.ts must be imported before any other module so Buffer, process and global exist when dependencies load. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/polyfills.ts#L1))

### `src/ssr/profile/+onBeforeRender.tsx`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/profile/+onBeforeRender.tsx#L3))
- ssr/profile +onBeforeRender accepts both an object and an array because the handle endpoint returns a single user while other user routes return arrays. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/profile/+onBeforeRender.tsx#L32))

### `src/ssr/profile/+onRenderHtml.tsx`

- ssr/profile +onRenderHtml lowercases the handle because the cache lookup by handle lowercases it. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/profile/+onRenderHtml.tsx#L36))
- SSR +onRenderHtml creates a fresh Emotion cache per request so styles and theme context are not shared across requests. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/profile/+onRenderHtml.tsx#L41))
- SSR +onRenderHtml serves the raw artwork/profile picture to Discord bots instead of the custom OG image because Discord crops OG unfurls to an odd aspect ratio. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/profile/+onRenderHtml.tsx#L58))

### `src/ssr/remixes/+onBeforeRender.tsx`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/remixes/+onBeforeRender.tsx#L3))

### `src/ssr/rewards/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/rewards/+onRenderClient.tsx#L1))

### `src/ssr/search/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/search/+onRenderClient.tsx#L1))

### `src/ssr/settings/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/settings/+onRenderClient.tsx#L1))

### `src/ssr/signup/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/signup/+onRenderClient.tsx#L1))

### `src/ssr/track/+onBeforeRender.tsx`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/track/+onBeforeRender.tsx#L3))

### `src/ssr/track/+onRenderHtml.tsx`

- ssr/track +onRenderHtml treats only is_streamable === false as unavailable (404 with no metadata) because older API responses omit the field. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/track/+onRenderHtml.tsx#L55))
- SSR +onRenderHtml creates a fresh Emotion cache per request so styles and theme context are not shared across requests. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/track/+onRenderHtml.tsx#L64))
- SSR +onRenderHtml serves the raw artwork/profile picture to Discord bots instead of the custom OG image because Discord crops OG unfurls to an odd aspect ratio. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/track/+onRenderHtml.tsx#L108))

### `src/ssr/trending/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/trending/+onRenderClient.tsx#L1))

### `src/ssr/upload/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/upload/+onRenderClient.tsx#L1))

### `src/ssr/util.ts`

- ssr/util.ts defines route constants locally instead of importing route.ts, which would pull dayjs into the SSR bundle. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/util.ts#L4))
- ssr/util reservedPaths stops routes like /upload from matching the /@handle profile pattern as handle='upload'. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/util.ts#L13))
- ssr/util reservedPaths stops routes like /upload from matching the /@handle profile pattern as handle='upload'. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/util.ts#L70))

### `src/ssr/wallet/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/wallet/+onRenderClient.tsx#L1))

### `src/ssr/weekly-rotation/+onBeforeRender.tsx`

- SSR +onBeforeRender files define a local getApiUrl helper instead of importing services/env, which would pull SDK dependencies into the SSR worker bundle. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/weekly-rotation/+onBeforeRender.tsx#L3))
- ssr/weekly-rotation +onBeforeRender only fetches the user name; og.audius.co renders the card from the handle, so the mix is not fetched. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/weekly-rotation/+onBeforeRender.tsx#L15))

### `src/ssr/weekly-rotation/+onRenderClient.tsx`

- Simple vike SSR page entries (+onRenderClient) use createRoot instead of hydrateRoot because the server only renders meta tags, so hydrating would mismatch. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/weekly-rotation/+onRenderClient.tsx#L1))

### `src/ssr/weekly-rotation/+onRenderHtml.tsx`

- ssr/weekly-rotation +onRenderHtml prefers the API's handle casing so the OG card URL matches what the client requests. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/weekly-rotation/+onRenderHtml.tsx#L28))

### `src/ssr/weekly-rotation/+route.ts`

- ssr/weekly-rotation +route only matches /explore/weekly-rotation/@handle; the bare route stays with the explore handler because it is per-viewer with no card. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/weekly-rotation/+route.ts#L3))

### `src/ssr/worker.js`

- ssr/worker.js is a separate Cloudflare worker for SSR because the app bundle causes slow cold starts, so SSR runs only when needed. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/ssr/worker.js#L1))

### `src/utils/clientUtil.ts`

- clientUtil isMobile/getClient read navigator and are not SSR-safe; components should use the useIsMobile hook. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L25))
- clientUtil isMobile/getClient read navigator and are not SSR-safe; components should use the useIsMobile hook. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L121))

### `src/utils/clipboardUtil.ts`

- clipboardUtil getCopyableLink uses location.host instead of hostname so links keep non-80 ports. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clipboardUtil.ts#L49))

### `src/utils/route.test.ts`

- utils/route contestPage builds /{handle}/contest/{slug}, a sibling of /{handle}/album/{slug} rather than a child of the track URL; route.test locks that shape. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route.test.ts#L10))

### `src/utils/route.ts`

- utils/route weeklyRotationPage lives under /explore so it does not collide with /:handle/:slug track permalinks. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route.ts#L116))

### `src/utils/route/collectionRouteParser.ts`

- utils/route parsers (collection/track/user) run params through safeDecode because React Router's matchPath can return URL-encoded params, and re-encoding them would double-encode. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route/collectionRouteParser.ts#L12))

### `src/utils/route/trackRouteParser.ts`

- utils/route parsers (collection/track/user) run params through safeDecode because React Router's matchPath can return URL-encoded params, and re-encoding them would double-encode. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route/trackRouteParser.ts#L8))

### `src/utils/route/userRouteParser.ts`

- utils/route parsers (collection/track/user) run params through safeDecode because React Router's matchPath can return URL-encoded params, and re-encoding them would double-encode. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/route/userRouteParser.ts#L10))

### `src/utils/urlUtils.ts`

- urlUtils encodeUrlName encodes formatUrlName output; since window.location decodes components, formatUrlName results can be compared to it directly. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/urlUtils.ts#L27))

### `src/utils/weeklyRotationPeriod.ts`

- utils/weeklyRotationPeriod imports from @audius/common/src/utils/weeklyRotation by path so the SSR bundle does not pull in the rest of common. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/weeklyRotationPeriod.ts#L1))
- getWeeklyRotationOgImageUrl adds the period param so social scrapers refetch the OG card each week. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/weeklyRotationPeriod.ts#L10))
