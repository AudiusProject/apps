# Architecture decision records

Non-obvious decisions about the code live here instead of in code comments (see [0001](0001-no-code-comments.md)).

## Template

```markdown
# NNNN. <Topic>

- Status: Accepted
- Date: YYYY-MM-DD

## Context

What area this covers and why its decisions are easy to get wrong.

## Decisions

### `path/to/file.ts`

- `functionName` does X because Y. ([L42](permalink to the line before the purge))
```

Extend the existing ADR for a topic rather than starting a new one.

## Index

- [0001. No code comments](0001-no-code-comments.md)
- [0002. Data fetching and caching in common](0002-common-data-fetching.md)
- [0003. Chat and DMs in common](0003-common-chat.md)
- [0004. Payments, wallets and tokens in common](0004-common-payments-and-wallets.md)
- [0005. Playback in common](0005-common-playback.md)
- [0006. Auth and account in common](0006-common-auth-and-account.md)
- [0007. Tracks, collections, uploads and contests in common](0007-common-tracks-and-collections.md)
- [0008. Notifications, analytics and flags in common](0008-common-notifications-and-analytics.md)
- [0009. Redux state and shared utilities in common](0009-common-state-and-utilities.md)
- [0010. Chat and DMs on web](0010-web-chat.md)
- [0011. Desktop (Electron) app](0011-web-desktop-electron.md)
- [0012. Routing, SSR and SEO on web](0012-web-ssr-routing-and-seo.md)
- [0013. Playback on web](0013-web-playback.md)
- [0014. Payments, wallets and fan clubs on web](0014-web-payments-and-wallets.md)
- [0015. Auth, sign-up and account on web](0015-web-auth-and-signup.md)
- [0016. Tracks, collections, uploads and contests on web](0016-web-tracks-collections-and-contests.md)
- [0017. Discovery, notifications and analytics on web](0017-web-discovery-and-notifications.md)
- [0018. Layout and UI on web](0018-web-layout-and-ui.md)
- [0019. Build, state and testing on web](0019-web-build-state-and-testing.md)
- [0020. iOS, Android and React Native quirks](0020-mobile-platform-quirks.md)
- [0021. Layout, gestures and animation on mobile](0021-mobile-layout-gestures-animation.md)
- [0022. Playback, downloads and offline on mobile](0022-mobile-playback-and-offline.md)
- [0023. Navigation, push notifications and sharing on mobile](0023-mobile-navigation-and-notifications.md)
- [0024. Chat and DMs on mobile](0024-mobile-chat.md)
- [0025. Contests, uploads and content on mobile](0025-mobile-contests-and-content.md)
- [0026. Payments, auth and security on mobile](0026-mobile-payments-auth-and-security.md)
- [0027. Build, OTA, startup and performance on mobile](0027-mobile-build-ota-and-performance.md)
- [0028. Legacy libs client](0028-libs.md)
- [0029. Identity service](0029-identity-service.md)
- [0030. Protocol dashboard](0030-protocol-dashboard.md)
- [0031. SDK internals and contracts](0031-sdk-and-contracts.md)
- [0032. Harmony and the embed player](0032-harmony-and-embed.md)
- [0033. Tooling and small packages](0033-tooling.md)
