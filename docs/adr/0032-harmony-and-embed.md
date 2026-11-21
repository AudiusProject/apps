# 0032. Harmony and the embed player

- Status: Accepted
- Date: 2026-11-21

## Context

Design-system internals in `packages/harmony` and the embeddable player in `packages/embed`. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `packages/embed/jest.config.cjs`

- The embed package declares babel presets inline in jest.config.cjs instead of a root babel.config.js so the Vite/esbuild build is not affected. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/jest.config.cjs#L1))
- Embed jest tests run in the node environment with a window shim because BedtimeClient touches window at import time and the hoisted jsdom version is incompatible. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/jest.config.cjs#L6))

### `packages/embed/jest.setup.cjs`

- Embed jest tests run in the node environment with a window shim because BedtimeClient touches window at import time and the hoisted jsdom version is incompatible. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/jest.setup.cjs#L1))

### `packages/embed/src/analytics/analytics.js`

- Embed isLikelyBot exempts user agents containing 'cubot' because Cubot is a phone brand that the bot regex would otherwise match. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/analytics/analytics.js#L19))

### `packages/embed/src/audio/AudioPlayer.js`

- The embed AudioPlayer assigns its Audio element to window.audio so third-party hosts can interact with playback. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/audio/AudioPlayer.js#L24))
- AudioPlayer.load removes and recreates the Audio element (removing listeners first so src='' doesn't throw) because Chrome breaks when tracks are played quickly in succession. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/audio/AudioPlayer.js#L67))
- AudioPlayer.load removes and recreates the Audio element (removing listeners first so src='' doesn't throw) because Chrome breaks when tracks are played quickly in succession. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/audio/AudioPlayer.js#L70))
- The embed AudioPlayer assigns its Audio element to window.audio so third-party hosts can interact with playback. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/audio/AudioPlayer.js#L83))
- On Chrome-like browsers AudioPlayer pauses/resumes by disconnecting/reconnecting the source node instead of audio.pause/play, because tab backgrounding otherwise resumes at ~0.9x speed; audioCtx.suspend() was rejected since it freezes analyser nodes. ([L156](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/audio/AudioPlayer.js#L156))

### `packages/embed/src/components/app.jsx`

- Embed app.jsx checks track.isStreamable === false explicitly because older API responses omit the field and must be treated as streamable. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/app.jsx#L185))

### `packages/embed/src/components/artwork/Artwork.jsx`

- Embed Artwork computes play-button size in pixels rather than percentages because percentage sizing hits Chrome subpixel rendering issues. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/artwork/Artwork.jsx#L73))

### `packages/embed/src/components/track/TrackPlayerCard.jsx`

- TrackPlayerCard starts the artwork wrapper at opacity 0 because it has no valid size until CardDimensionsContext supplies non-zero values after mount. ([L44](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/track/TrackPlayerCard.jsx#L44))

### `packages/embed/src/components/track/TrackPlayerContainer.jsx`

- Embed TrackPlayerContainer prefers track.stream because it holds pre-authenticated URLs that work for private tracks fetched via permalink; the constructed stream endpoint only works for public tracks. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/track/TrackPlayerContainer.jsx#L59))
- Embed TrackPlayerContainer accepts track.stream as either a legacy string URL or a { url, mirrors } object, falling back to the first mirror. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/track/TrackPlayerContainer.jsx#L63))
- Embed TrackPlayerContainer prefers track.stream because it holds pre-authenticated URLs that work for private tracks fetched via permalink; the constructed stream endpoint only works for public tracks. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/components/track/TrackPlayerContainer.jsx#L76))

### `packages/embed/src/hooks/usePlayback.js`

- usePlayback creates the AudioPlayer lazily in response to a user event because browsers (Chrome) block audio contexts not started from a gesture. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/hooks/usePlayback.js#L23))
- usePlayback keeps playingState in a ref to avoid stale captures by clients and toggles a dummy state to force a rerender whenever the ref changes. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/hooks/usePlayback.js#L29))
- usePlayback stores its returned callbacks in refs so they can be passed to onAfterAudioEnd without a cyclic dependency. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/hooks/usePlayback.js#L41))

### `packages/embed/src/util/BedtimeClient.js`

- getCollectionByPermalink re-fetches the collection by hash id because the bulk/permalink endpoint returns metadata with an empty tracks array. ([L117](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/BedtimeClient.js#L117))

### `packages/embed/src/util/BedtimeClient.test.js`

- BedtimeClient.test mocks @audius/sdk as a virtual module because CI runs the test before the sdk dist is built. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/BedtimeClient.test.js#L5))
- BedtimeClient.test mocks the analytics module so amplitude-js and its browser globals are not loaded at import time. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/BedtimeClient.test.js#L23))

### `packages/embed/src/util/image/dominantColor.worker.js`

- The embed dominant-color worker clamps colors above luminance 201 (#CDC8C8), the brightest background that still gives 4.5:1 contrast with white text. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/image/dominantColor.worker.js#L9))

### `packages/embed/src/util/isMobile.js`

- Embed isMobile treats MacIntel with maxTouchPoints > 1 as mobile because iPadOS 13+ reports a desktop Mac platform. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/isMobile.js#L15))

### `packages/embed/src/util/shareUtil.js`

- Embed getAudiusURL uses the hostname env var only in develop; production derives the URL from window.location. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/src/util/shareUtil.js#L10))

### `packages/embed/vite.config.js`

- The embed Vite config imports .workerscript files as raw strings via a custom transform because the ?raw suffix breaks on mobile. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/embed/vite.config.js#L39))

### `packages/harmony/rollup.fonts.mjs`

- Harmony emits harmony.css with base64 Avenir and harmony-no-fonts.css so apps hosting the font files themselves can skip the inlined font data. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/rollup.fonts.mjs#L14))

### `packages/harmony/src/components/artwork/Artwork.tsx`

- Harmony Artwork forces fill none on the hex border path because fills leaked onto it in the upload flow's coin-gating audience option. ([L199](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/artwork/Artwork.tsx#L199))

### `packages/harmony/src/components/button/FilterButton/FilterButton.tsx`

- FilterButton lazy-loads the virtualized options list so react-virtualized only loads when a virtualized menu opens. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/button/FilterButton/FilterButton.tsx#L28))
- FilterButton casts the lazy VirtualizedOptionsList back to its original type because React.lazy drops the component's generic signature. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/button/FilterButton/FilterButton.tsx#L31))

### `packages/harmony/src/components/button/PlainButton/PlainButton.tsx`

- PlainButton skips the span wrapper when asChild is used because wrapping children breaks links with icons. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/button/PlainButton/PlainButton.tsx#L97))

### `packages/harmony/src/components/image/Image.tsx`

- Harmony Image resets only the error state when src changes, not isLoaded, to avoid a skeleton flash when the next image is cached. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/image/Image.tsx#L92))
- Harmony Image relies on its CSS module being injected before consumer modules so a caller's className overrides the default 100% sizing. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/image/Image.tsx#L121))

### `packages/harmony/src/components/modal/Modal.tsx`

- Harmony Modal intercepts touchmove on the modal root to prevent the iOS Safari overscroll bounce. ([L238](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/modal/Modal.tsx#L238))
- Harmony Modal's click-outside ignores clicks on another modal wrapper so nested modals are dismissed only by their own handler. ([L273](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/modal/Modal.tsx#L273))
- Harmony Modal's click-outside handler no-ops when closed because the handler exists before visibility and would otherwise immediately close a modal opened by a click. ([L278](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/modal/Modal.tsx#L278))

### `packages/harmony/src/components/popup/Popup.tsx`

- Popup copies anchorOrigin/transformOrigin before flipping so caller-provided objects aren't mutated across opens. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/popup/Popup.tsx#L64))
- Popup falls back to document.body for a null portalLocation because refs are often null on first render and default parameters only cover undefined. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/popup/Popup.tsx#L233))
- Popup only actively repositions on scroll for body portals since non-body portals scroll with content. ([L430](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/popup/Popup.tsx#L430))

### `packages/harmony/src/components/scrollbar/Scrollbar.tsx`

- Harmony Scrollbar must keep its useMeasure ref because infinite scrolling depends on it. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/scrollbar/Scrollbar.tsx#L42))

### `packages/harmony/src/components/text-link/TextLink.tsx`

- TextLink leaves display unset when maxLines is used because line clamping requires a special webkit display value. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/text-link/TextLink.tsx#L65))

### `packages/harmony/src/components/text/Text.tsx`

- Harmony Text converts Unicode subscripts to <sub> only for body variant with default strength, since other variants render them correctly. ([L154](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/text/Text.tsx#L154))

### `packages/harmony/src/components/tooltip/Tooltip.tsx`

- Harmony Tooltip defaults to mounting in document.body because position: fixed coordinates are skewed inside transformed ancestors such as the sidebar translateX wrapper and #page. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/tooltip/Tooltip.tsx#L138))
- Harmony Tooltip measures position in a layout effect so it does not paint stale coordinates. ([L299](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/tooltip/Tooltip.tsx#L299))
- Harmony Tooltip keeps repositioning on scroll, resize and for ~400ms after showing to follow short layout transitions such as sidebar resize animations. ([L305](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/tooltip/Tooltip.tsx#L305))
- Harmony Tooltip defaults to mounting in document.body because position: fixed coordinates are skewed inside transformed ancestors such as the sidebar translateX wrapper and #page. ([L360](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/tooltip/Tooltip.tsx#L360))

### `packages/harmony/src/components/track-row/TrackRow.tsx`

- TrackRow treats clicks on links, buttons, menus and data-row-control elements as belonging to those controls; any other row click toggles playback like the tile. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/components/track-row/TrackRow.tsx#L97))

### `packages/harmony/src/foundations/theme/emotion.d.ts`

- harmony emotion.d.ts redeclares the global JSX namespace because Emotion types break under React 19 JSX types. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/foundations/theme/emotion.d.ts#L9))

### `packages/harmony/src/hooks/useClickOutside.ts`

- useClickOutside attaches its mousedown listener in a setTimeout so the event that opened the element does not immediately close it. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/hooks/useClickOutside.ts#L47))
- useClickOutside removes its listener in a setTimeout so cleanup runs after the deferred attach and never leaks a listener. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/hooks/useClickOutside.ts#L53))

### `packages/harmony/src/hooks/useControlled.ts`

- harmony useControlled is adapted from Material UI useControlled; keep the source link for licensing and reference. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/hooks/useControlled.ts#L25))
- useControlled calls hooks inside a NODE_ENV check; this is safe because the branch is fixed for the whole process lifetime. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/harmony/src/hooks/useControlled.ts#L96))
