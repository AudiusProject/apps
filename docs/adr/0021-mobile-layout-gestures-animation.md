# 0021. Layout, gestures and animation on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Layout constraints, gesture conflicts between drawers, scrubbers and lists, and Reanimated animation behaviour. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/app/ThemeProvider.tsx`

- getCurrentSystemAppearance falls back to Appearance.getColorScheme before redux is seeded so the first paint is not forced light when the OS is dark. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ThemeProvider.tsx#L69))
- ThemeProvider uses RN useColorScheme because it returns the system value synchronously, unlike react-native-dynamic which can report stale light. ([L117](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ThemeProvider.tsx#L117))

### `src/components/bottom-tab-bar/constants.ts`

- BOTTOM_BAR_HEIGHT is 41 = 32px icon + 8px top padding + 1px top border. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/constants.ts#L1))
- BOTTOM_BAR_BUTTON_HEIGHT accounts for the border because of react-native issue 23994. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/constants.ts#L3))
- The iOS 26 floating pill takes the same space as the classic bar (BOTTOM_BAR_HEIGHT plus bottom inset) so screens, BottomChin and the now-playing drawer need not know which is shown. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/constants.ts#L8))
- The tab bar collapse runs shrink then drop (COLLAPSE_SHRINK_END/COLLAPSE_DROP_START) so each move stays on one axis and the play bar does not swoop diagonally. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/constants.ts#L25))

### `src/components/bottom-tab-bar/useFloatingTabBar.ts`

- useFloatingTabBar returns null on home-button devices because without a bottom inset the pill would need more room than BOTTOM_BAR_HEIGHT. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/useFloatingTabBar.ts#L11))

### `src/components/card/Card.tsx`

- Card text sets fixed lineHeight and height 24 because emojis otherwise increase the text height. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/card/Card.tsx#L46))

### `src/components/collapsible-tabs/Container.tsx`

- Collapsible tabs Container re-scrolls to the correct position after render when dynamic tabs change. ([L170](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/Container.tsx#L170))
- Collapsible tabs Container syncs the current tab scroll position every frame for ~1500ms (iOS) after an index change because lists accept scrollTo late, which otherwise makes the position jump. ([L222](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/Container.tsx#L222))
- Collapsible tabs Container keys each tab by name so it remounts when the name changes but the index does not. ([L445](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/Container.tsx#L445))

### `src/components/collapsible-tabs/FlatList.tsx`

- collapsible-tabs FlatList enables scroll handling only after mount because an initial onScroll with the starting position breaks header state. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/FlatList.tsx#L45))

### `src/components/collapsible-tabs/ScrollView.tsx`

- collapsible-tabs ScrollView enables scroll handling only after mount because an initial onScroll with the starting position breaks header state. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/ScrollView.tsx#L62))

### `src/components/collapsible-tabs/SectionList.tsx`

- collapsible-tabs SectionList enables scroll handling only after mount because an initial onScroll with the starting position breaks header state. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/SectionList.tsx#L51))

### `src/components/collection-list/CollectionCard.tsx`

- CollectionCard sets lineHeight 16 on the hidden/scheduled label so the card footer height does not change. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collection-list/CollectionCard.tsx#L128))

### `src/components/comments/CommentOverflowMenu.tsx`

- CommentOverflowMenu keeps both isOpen and isVisible so the drawer can finish its closing animation. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentOverflowMenu.tsx#L53))

### `src/components/comments/useGestureEventHandlers.ts`

- useGestureEventsHandlers is a fork of @gorhom/bottom-sheet's default hook so content can scroll at every snap point; changes are marked inline. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useGestureEventHandlers.ts#L52))
- useGestureEventsHandlers (forked) skips handling content gestures when the sheet is at a snap point and the list is scrolled, so the list scrolls instead of the sheet moving. ([L169](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useGestureEventHandlers.ts#L169))
- useGestureEventsHandlers (forked) does not snap on gesture end when the sheet is at a snap point and the list is scrolled down. ([L331](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useGestureEventHandlers.ts#L331))
- useGestureEventsHandlers returns early when the scroll view handled the gesture at the highest snap point, preventing snaps to middle/bottom after repeated interrupted scrolls. ([L433](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useGestureEventHandlers.ts#L433))

### `src/components/comments/useScrollEventHandlers.ts`

- useScrollEventHandlers (forked from gorhom) locks list scrolling when the sheet is not at a snap point or the list is pulled past the top. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useScrollEventHandlers.ts#L55))
- useScrollEventHandlers (forked) locks list scrolling during drag end when the sheet is not at a snap point or scrolled upward. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useScrollEventHandlers.ts#L116))
- useScrollEventHandlers (forked) locks list scrolling on momentum when the sheet is not at a snap point or scrolled upward. ([L156](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useScrollEventHandlers.ts#L156))

### `src/components/contest-card/ContestCard.tsx`

- ContestCard wraps each Skeleton in a relatively positioned sized container because the mobile Skeleton fills its parent absolutely. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/contest-card/ContestCard.tsx#L73))

### `src/components/core/AnimatedButton.tsx`

- AnimatedButton ignores Lottie finish events it did not start (resetting to frame 0) because acting on them makes the button press itself, e.g. after the play button's buffering spinner. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/AnimatedButton.tsx#L91))
- AnimatedButton resets binary-state animations when inactive and not playing because frequent rerenders can leave the animation stuck in the active state. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/AnimatedButton.tsx#L185))

### `src/components/core/BottomChin.tsx`

- useBottomChinHeight adds bottom padding so list rows clear the absolutely positioned floating tab bar and, when a track is loaded, the play bar. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/BottomChin.tsx#L11))

### `src/components/core/FixedFooter.test.tsx`

- FixedFooter does not add the safe area to its padding because it is already part of the bottom bar inset. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/FixedFooter.test.tsx#L91))
- FixedFooter adds the bottom inset to keyboardShowingOffset so the footer is not lifted twice when the keyboard shows. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/FixedFooter.test.tsx#L95))

### `src/components/core/FlatList.tsx`

- core FlatList reads refreshing from CollapsibleTabNavigatorContext when a host screen provides it, falling back to props for direct callers. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/FlatList.tsx#L27))

### `src/components/core/KeyboardAvoidingView.tsx`

- The handrolled KeyboardAvoidingView exists because React Native's default one does not translate content far enough upwards. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/KeyboardAvoidingView.tsx#L28))

### `src/components/core/ProfilePicture.tsx`

- ProfilePicture uses a 3s per-URL render timeout so a hung validator node advances to the next mirror instead of waiting for the 60-90s OS TCP timeout. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/ProfilePicture.tsx#L14))
- ProfilePicture pulls onError off props so it can chain it with the mirror-retry handler instead of being overwritten by the spread. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/ProfilePicture.tsx#L31))
- ProfilePicture forwards render-time image errors to useImageSize so stalled renders, not just prefetch failures, swap to the next mirror. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/ProfilePicture.tsx#L53))

### `src/components/core/PullToRefresh.tsx`

- useOverflowHandlers delays the post-refresh scrollTo(0) by DEBOUNCE_TIME_MS because firing immediately yanks the list while the user is already interacting. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/PullToRefresh.tsx#L116))

### `src/components/core/Screen/GlassCapsule.tsx`

- GlassCapsule strips alpha from the theme background (slice to #RRGGBB) because the fading cover must be opaque. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassCapsule.tsx#L90))
- GlassCapsule puts the shadow on an unclipped wrapper and clips the frosted surface inside so the frost does not spill past the corners; the edge separates it from same-colored cards in dark mode. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassCapsule.tsx#L116))

### `src/components/core/Screen/Screen.tsx`

- Screen's headerTransparent floats the custom header over content so it scrolls behind a translucent header; the screen must then pad its scrollable content using useRootHeaderHeight. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/Screen.tsx#L59))

### `src/components/core/Screen/ScreenSecondaryContent.tsx`

- ScreenSecondaryContent keeps showing the skeleton while useIsRestoring is true, because PersistQueryClientProvider pauses queries during AsyncStorage hydration and real content would first render with isPending. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/ScreenSecondaryContent.tsx#L23))
- ScreenSecondaryContent keeps a flex:1 wrapper View mounted across skeleton and content phases; mounting a fresh view caused a 0-height frame that Yoga expanded, animating as a slide-up on iOS. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/ScreenSecondaryContent.tsx#L31))

### `src/components/core/ScreenFooterLayout.test.tsx`

- ScreenFooterLayout test asserts a loaded or restored track alone does not reserve hidden mini-player space; only a visible mini-player adds clearance. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/ScreenFooterLayout.test.tsx#L78))

### `src/components/core/SectionList.tsx`

- SectionList synthesizes onEndReached from the Reanimated scroll value because Tabs.SectionList overrides onScroll with its own handler, which stops VirtualizedList's built-in onEndReached from firing. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/SectionList.tsx#L46))

### `src/components/core/Tile/Tile.tsx`

- Tile uses plain shadow styles instead of react-native-shadow-2 because that library caused performance problems when rendering multiple lineups in tabs. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Tile/Tile.tsx#L28))

### `src/components/core/UserGeneratedText.tsx`

- UserGeneratedText lets Autolink render each link invisibly to capture its position, then overlays touchable links at those positions. ([L240](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/UserGeneratedText.tsx#L240))
- UserGeneratedText's hidden link View uses marginTop -3 to compensate for View overflow so measured link positions line up with the text. ([L263](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/UserGeneratedText.tsx#L263))
- UserGeneratedText uses a custom URL regex instead of Autolink's default URL matcher to avoid conflicts with the @handle matcher (react-native-autolink issue 78). ([L353](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/UserGeneratedText.tsx#L353))

### `src/components/drawer/Drawer.tsx`

- Drawer's gesturesDisabled makes the pan responder refuse new gestures without tearing it down, so nested gesture UI such as drag-to-reorder lists can take over. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L138))
- Drawer's initialOffsetPosition leaves the drawer partly visible so it can be dragged open as well as closed, as the Now Playing drawer does. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L162))
- Drawer's springy slide scales tension and friction by drawer height because short drawers otherwise feel sluggish and tall ones overshoot. ([L251](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L251))
- Drawer records isOpenIntent in a ref on pan release because the slide animation may still be running when the next pan starts, and that gesture must use the previous intent. ([L326](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L326))
- Drawer mirrors gesturesDisabled into a ref so the memoized PanResponder reads the latest value without being recreated. ([L334](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L334))
- Drawer's onPanResponderMove handles both normal swipe-to-dismiss drawers and drawers resting at an initial offset (Now Playing) that drag open. ([L489](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L489))

### `src/components/drawers/ArtistPickConfirmationDrawer.tsx`

- ArtistPickConfirmationDrawer memoizes the add/update/remove action on trackId only, so the drawer text does not flip from the optimistic artist-pick update while the drawer is closing. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawers/ArtistPickConfirmationDrawer.tsx#L41))

### `src/components/fields/TextField.tsx`

- TextField skips Formik's onChange when onChangeText is passed, so callers providing onChangeText must set the field value themselves. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/fields/TextField.tsx#L88))

### `src/components/image/TrackImage.tsx`

- useTrackImage returns no source when the track has no artwork or has not loaded, so a stale image from a previous track is never shown. ([L82](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/image/TrackImage.tsx#L82))

### `src/components/lineup-tile/CollectionTileTrackList.tsx`

- CollectionTileTrackList fetches each row's owner name with useUser because tracks from useOrderedCollectionTracks have no joined user object. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/CollectionTileTrackList.tsx#L94))

### `src/components/lineup-tile/LineupTileActionButtons.tsx`

- LineupTileActionButtons blocks the tile press in onPressIn because repost/favorite onPress runs after the Lottie animation, too late for the tile tap's 100ms check. ([L105](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/LineupTileActionButtons.tsx#L105))
- LineupTileActionButtons wraps share in RN TouchableOpacity so the parent Paper's RNGH tap receives the release and runs onFinalize, otherwise the tile stays depressed. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/LineupTileActionButtons.tsx#L128))

### `src/components/lineup-tile/TrackRowTile.tsx`

- TrackRowTile's artwork overlay uses zIndex 3 to sit above the Artwork image, which sets zIndex 2. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/TrackRowTile.tsx#L63))

### `src/components/lineup-tile/useOpenTrackOverflow.ts`

- useOpenTrackOverflow's includeSocial adds share, favorite and repost to the menu because track rows have no inline buttons for them. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup-tile/useOpenTrackOverflow.ts#L19))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup adds trailing skeletons only for a load-more; a background refetch replaces the list in place. ([L360](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/lineup/TrackLineup.tsx#L360))

### `src/components/loading-spinner/LoadingSpinner.tsx`

- LoadingSpinner replays its Lottie animation on app foreground because lottie-react-native leaves it paused (issue 412). ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/loading-spinner/LoadingSpinner.tsx#L42))

### `src/components/now-playing-drawer/CommentBubble.tsx`

- CommentBubble pill is 28px tall so it clears the play button that overhangs the controls row. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/CommentBubble.tsx#L164))

### `src/components/now-playing-drawer/NowPlayingDrawer.tsx`

- NowPlayingDrawer is transparent while collapsed with the floating tab bar so content shows around the play bar and tab bar pills; the background fades in as it opens. ([L98](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L98))
- NowPlayingDrawer reserves spacing(8) under the waveform so the floating comment bubble clears the play button. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L128))
- NowPlayingDrawer disables its gestures while the comments bottom sheet is open, since the sheet's swipe-to-dismiss would also close this drawer underneath. ([L158](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L158))
- NowPlayingDrawer hides its shadow on the Chat screen so the drawer sits level with the chat text input. ([L173](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L173))
- NowPlayingDrawer uses cached static insets when mostly open so pulling down the notification panel does not shift the full-screen player layout. ([L215](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L215))
- NowPlayingDrawer translates the whole drawer so the collapsed play bar drops into the hidden tab bar's place (between the collapsed floating buttons, or onto the safe area in classic mode), keeping playback controls visible; pinned to 0 while open. ([L224](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L224))
- NowPlayingDrawer disables the notifications drawer swipe immediately on pan release and lets the open-state effect re-enable it, avoiding gesture conflicts. ([L313](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L313))
- NowPlayingDrawer's Reanimated wrapper restates the drawer zIndex because it creates a new stacking context, and uses pointerEvents box-none so touches reach the screen behind. ([L418](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L418))
- NowPlayingDrawer uses the NOW_PLAYING_DRAWER zIndex so it appears below the bottom bar, unlike other drawers. ([L429](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L429))

### `src/components/now-playing-drawer/PlayBar.tsx`

- PlayBar's queue button (32px) collapses to nothing when the play bar sits between the collapsed tab bar's buttons. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/PlayBar.tsx#L48))
- PlayBar's floating container pads artwork and play button away from the glass pill's rounded ends. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/PlayBar.tsx#L83))
- PlayBar narrows to fit between the collapsed tab bar's buttons and drops the queue button to make room for the title. ([L202](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/PlayBar.tsx#L202))
- PlayBar folds the row gap into the shrinking queue button with a negative margin so no empty space remains when it collapses. ([L224](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/PlayBar.tsx#L224))

### `src/components/now-playing-drawer/TrackingBar.tsx`

- TrackingBar draws no rail inside the floating glass pill because the empty rail reads as a stray gray line along the rounded top. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/TrackingBar.tsx#L30))
- TrackingBar fades out shortly after the Now Playing drawer starts opening so it is not visible while the drawer animates its corner radius. ([L128](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/TrackingBar.tsx#L128))

### `src/components/now-playing-drawer/WaveformScrubber.tsx`

- WaveformScrubber uses n300 for unplayed bars in dark mode because n150 nearly disappears on the dark drawer background. ([L198](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L198))
- WaveformScrubber's peaks query settles to null on a miss or error, and the fallback waveform shape is drawn in either case. ([L205](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L205))
- WaveformScrubber waits for the peaks lookup to settle before drawing so a real waveform never visibly replaces the fallback shape. ([L212](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L212))
- WaveformScrubber stores width, duration and press callbacks in a ref so the once-created PanResponder sees current values. ([L256](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L256))
- WaveformScrubber relies on children not taking touches so nativeEvent.locationX is always relative to the waveform for seek fractions. ([L261](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L261))
- WaveformScrubber returns false from onPanResponderTerminationRequest so the Now Playing drawer's swipe-to-close gesture cannot steal an in-progress scrub. ([L270](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/WaveformScrubber.tsx#L270))

### `src/components/now-playing-drawer/useDominantArtworkColors.ts`

- useDominantArtworkColors is the only thing on mobile that fills the dominant-colors store keyed by CID that getDominantColorsByTrack reads; removing it leaves that selector empty. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/useDominantArtworkColors.ts#L16))
- getDominantRgb resolves to a single default color string when it cannot read the image, so callers must treat a string result as failure rather than colors. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/useDominantArtworkColors.ts#L43))

### `src/components/premium-content-purchase-drawer/PremiumContentPurchaseDrawer.tsx`

- PremiumContentPurchaseDrawer's title paddingRight of spacing(6) matches the close icon width so the title stays visually centered. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/premium-content-purchase-drawer/PremiumContentPurchaseDrawer.tsx#L132))

### `src/components/queue-drawer/QueueDrawer.tsx`

- QueueDrawer's collapsed height is 85% of the screen so the dimmed background stays tappable to dismiss and the drag handle/header are always on screen regardless of queue length. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/queue-drawer/QueueDrawer.tsx#L48))
- QueueDrawer uses a fixed 64pt row height because getItemLayout requires it and initialScrollIndex otherwise breaks the FlatList scroll bounds. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/queue-drawer/QueueDrawer.tsx#L53))
- QueueDrawer suspends the parent drawer's swipe-to-dismiss while a row is being reordered, otherwise the drawer's PanResponder claims the vertical drag and the drawer slides instead of the row. ([L320](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/queue-drawer/QueueDrawer.tsx#L320))

### `src/components/scrubber/Slider.tsx`

- Slider's tracker is the full rail width and animates with translateX instead of growing width so it keeps rounded ends. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/scrubber/Slider.tsx#L42))
- Slider's rail press uses nativeEvent.pageX minus the rail's pageX because locationX reports inconsistent values while the handle animates. ([L206](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/scrubber/Slider.tsx#L206))

### `src/components/top-tab-bar/CollapsibleTopTabBar.tsx`

- In CollapsibleTopTabBar, INDICATOR_ANIM_GRANULARITY is the number of sine points in the indicator stretch: 1 means no stretch, 2 a linear stretch, higher values follow the sine curve more closely. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/top-tab-bar/CollapsibleTopTabBar.tsx#L19))

### `src/components/top-tab-bar/TopTabBar.tsx`

- In TopTabBar, INDICATOR_ANIM_GRANULARITY is the number of sine points in the indicator stretch: 1 means no stretch, 2 a linear stretch, higher values follow the sine curve more closely. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/top-tab-bar/TopTabBar.tsx#L13))

### `src/components/track-list/AnimatedEqBars.tsx`

- AnimatedEqBars draws each bar full height inside a rounded clip and slides it with translateY so the native driver can animate it (height is not native-driver animatable). ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/track-list/AnimatedEqBars.tsx#L13))

### `src/components/track-list/TrackList.tsx`

- TrackList accepts track ids as well as uids because some callers, such as the EditPlaylist track list, have no uids. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/track-list/TrackList.tsx#L28))
- When TrackList is reorderable it must not be nested in a ScrollView, otherwise auto-scroll while dragging stops working. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/track-list/TrackList.tsx#L66))

### `src/components/user-balance-history-graph/balanceChartGeometry.test.ts`

- balanceChartGeometry's path test compares against a curve captured from react-native-gifted-charts 1.4.46 (curved, 200 high, 252 wide), with our plot shifted 10px right. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/user-balance-history-graph/balanceChartGeometry.test.ts#L65))

### `src/components/user-balance-history-graph/balanceChartGeometry.ts`

- balanceChartGeometry's layout and scale constants deliberately reproduce the layout BalanceLineChart had when drawn with react-native-gifted-charts. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/user-balance-history-graph/balanceChartGeometry.ts#L1))
- In balanceChartGeometry, horizontal insets are relative to the plot layer that starts after the y-axis labels, and the plot layer intentionally overhangs the container on the right. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/user-balance-history-graph/balanceChartGeometry.ts#L9))
- getYScale puts the axis bottom 10% of the data range below the minimum and rounds the top up to the next multiple of 10, or adds 10% headroom when the range is 1 or less. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/user-balance-history-graph/balanceChartGeometry.ts#L48))

### `src/harmony-native/components/Artwork.tsx`

- Artwork memoizes on primitive fields of source because a fresh source object each render makes AnimatedImage reload and flash. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Artwork.tsx#L59))

### `src/harmony-native/components/Image/Image.tsx`

- harmony-native Image's timeoutMs dispatches a synthetic onError for remote URIs that never load or error so mirror-retry logic can move to the next URL instead of waiting on a hung connection. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Image/Image.tsx#L33))
- harmony-native Image keeps onError in a ref so the timeout closure calls the latest callback without adding it to effect deps, which would reset the timer every render. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Image/Image.tsx#L88))
- harmony-native Image shows local require()'d sources immediately without fading, since they are synchronous and a fade causes an opacity-0 flash. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Image/Image.tsx#L120))
- harmony-native Image synthesizes onError after timeoutMs because the native image cache and TCP stack otherwise wait 60-90s on a hung connection without firing onError. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Image/Image.tsx#L138))

### `src/harmony-native/components/LinearGradient/LinearGradient.tsx`

- getAngleStartEnd runs the gradient line through the center along the bearing, long enough that perpendiculars through opposite corners meet its ends, matching CSS angle gradients. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/LinearGradient/LinearGradient.tsx#L56))
- LinearGradient strips React useId output to word characters and dashes because raw useId values are not valid SVG ids. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/LinearGradient/LinearGradient.tsx#L121))

### `src/harmony-native/components/LoadingSpinner/LoadingSpinner.tsx`

- LoadingSpinner replays its Lottie animation on entering foreground to work around lottie-react-native issue #412 where the animation stays paused. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/LoadingSpinner/LoadingSpinner.tsx#L39))

### `src/harmony-native/components/RadialGradient/RadialGradient.tsx`

- RadialGradient strips React useId output to word characters and dashes because raw useId values are not valid SVG ids. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/RadialGradient/RadialGradient.tsx#L38))

### `src/harmony-native/components/TextLink/TextLink.tsx`

- TextLink is built entirely from Text components so it flows inline with surrounding Text. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/TextLink/TextLink.tsx#L12))

### `src/harmony-native/components/TextLink/TextPressable.tsx`

- TextPressable nests an AnimatedText inside a Text so press handlers and animation work while keeping inline Text layout. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/TextLink/TextPressable.tsx#L61))

### `src/harmony-native/components/TrackRow/TrackRow.tsx`

- TrackRow overrides Skeleton to position relative because Skeleton fills its parent absolutely by default and rows lay it out inline. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/TrackRow/TrackRow.tsx#L28))
- TrackRow's press-out skips the release spring after a long press because the long-press pop already returns to rest and would be cut short. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/TrackRow/TrackRow.tsx#L91))

### `src/harmony-native/components/input/SelectablePill/SelectablePill.tsx`

- SelectablePill bumps a themeNudge shared value on theme change because Reanimated only re-runs a worklet when a shared value it reads changes; useAnimatedStyle deps alone do not repaint. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/input/SelectablePill/SelectablePill.tsx#L60))
- SelectablePill's animated styles read themeNudge.value so the worklet re-runs with the new palette colors on theme change. ([L139](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/input/SelectablePill/SelectablePill.tsx#L139))

### `src/harmony-native/components/input/TextInput/TextInput.tsx`

- harmony-native TextInput sets an explicit input height (18/23) because intrinsic heights differ between iOS and Android. ([L365](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/input/TextInput/TextInput.tsx#L365))

### `src/harmony-native/components/layout/Box/types.ts`

- harmony-native Box's flex prop follows emotion/native CSS shorthand, so flex: 1 also sets flexShrink 1 and flexBasis 0, unlike React Native's legacy flex. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/layout/Box/types.ts#L5))

### `src/harmony-native/components/layout/Paper/Paper.tsx`

- Paper uses only a tap gesture with maxDeltaX/Y so any movement fails the tap and swipes bubble up to parent gestures. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/layout/Paper/Paper.tsx#L112))

### `src/hooks/usePrefetchTrendingImages.ts`

- usePrefetchTrendingImages prefetches the first page of trending artwork after React Query hydration and seeds global IMAGE_CACHE so useImageSize resolves synchronously and tiles never show the artwork skeleton. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/usePrefetchTrendingImages.ts#L17))

### `src/screens/app-drawer-screen/AppDrawerScreen.tsx`

- AppDrawerScreen only enables drawer swipe-to-open at a tab stack root and limits the navigator pan to the left edge (swipeEdgeWidth) so it cannot steal vertical scrolls or native back swipes; mid-screen opening is handled by useOpenDrawerGesture. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-drawer-screen/AppDrawerScreen.tsx#L67))

### `src/screens/app-drawer-screen/useOpenDrawerGesture.ts`

- useOpenDrawerGesture fails after 12pt of vertical travel against a 20pt horizontal activation so only drags within about 30 degrees of horizontal open the drawer. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-drawer-screen/useOpenDrawerGesture.ts#L9))
- useOpenDrawerGesture adds a mid-screen rightward pan to open the left nav drawer because the drawer navigator's own pan has fixed 5pt thresholds and is therefore restricted to the screen edge. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-drawer-screen/useOpenDrawerGesture.ts#L13))

### `src/screens/app-screen/AppTabBar.tsx`

- AppTabBar translates the classic tab bar past the bottom edge when chrome hides, clearing the safe area so no sliver remains over the home indicator, layered on top of the drawer translation; the floating bar collapses in place instead. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabBar.tsx#L38))
- The tab bar is absolutely positioned so screens are full height and scroll behind it; screens clear it with BottomChin. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabBar.tsx#L72))
- AppTabBar wrapper creates a new stacking context, so zIndex/elevation 4 is restated to keep the tab bar above the now-playing drawer. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabBar.tsx#L78))

### `src/screens/app-screen/AppTabScreen.tsx`

- AppTabScreen re-asserts drawer swipeEnabled imperatively because NowPlayingDrawer calls setOptions({swipeEnabled:false}) on pan release and that override survives screenOptions re-renders. ([L211](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L211))
- AppTabScreen enables the mid-screen open-drawer gesture only at the stack root and not when gesturesDisabled (e.g. Feed handles horizontal swipes) or when right swipe means back. ([L260](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L260))
- Profile disables fullScreenGestureEnabled because its collapsible tab view's diagonal vertical scrolls were hijacked as swipe-to-pop; swipe-back is limited to the left edge, as on Chat. ([L292](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L292))

### `src/screens/app-screen/AppTabsScreen.tsx`

- TabBarAutoHideProvider sits above the Tab.Navigator because the tab bar renders as a sibling of the screens and must still animate off the focused tab's scroll. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabsScreen.tsx#L41))

### `src/screens/app-screen/CompactHeader.tsx`

- CompactControls is rendered by the screen rather than the navigation header so tab-state changes do not rebuild the header. ([L136](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/CompactHeader.tsx#L136))
- Compact header capsule sets marginHorizontal 0 because GlassCapsule insets 16px from each edge while floating, and centered pills should size to content. ([L189](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/CompactHeader.tsx#L189))

### `src/screens/app-screen/FloatingSubHeader.tsx`

- FloatingSubHeader is owned by the screen, not passed into MobileRootHeader, because rebuilding MobileRootHeader's memoized render prop on tab changes remounts AccountPictureHeader and refetches the profile picture. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/FloatingSubHeader.tsx#L41))

### `src/screens/app-screen/GlassChromeContext.tsx`

- GlassChromeContext requires 6px of travel in one direction before flipping chrome hidden/shown, otherwise sub-pixel jitter at the end of a fling flaps the header. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L40))
- GlassChromeProvider publishes measured header and sub-header heights because root tab screens float their header (headerTransparent) and must pad scroll content by heights that vary with the safe-area inset. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L72))
- GlassChromeProvider seeds headerHeight with insets.top plus the nominal row height so the first frame is near correct; starting at 0 made the list jump once onLayout reported. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L87))
- GlassChromeProvider ignores header height changes under 1px because onLayout fires every pass and sub-pixel jitter would otherwise churn context and re-render loops. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L120))
- useSyncGlassScroll resets the scroll anchor when the list behind the glass is swapped for one keeping its own offset (Feed pager pages), so the swap is not read as a scroll that hides chrome. ([L249](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L249))
- useGlassScrollHandler is a plain JS onScroll (with scrollEventThrottle 16) because core list primitives wrap React Native Animated rather than reanimated; only one list per screen should drive it. ([L265](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassChromeContext.tsx#L265))

### `src/screens/app-screen/GlassEdgeFade.tsx`

- GlassEdgeFade draws its gradient with stopOpacity instead of harmony LinearGradient because react-native-svg ignores the alpha channel of a stop color. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassEdgeFade.tsx#L24))
- GlassEdgeFade slices theme background to #RRGGBB since backgrounds may be #RRGGBBAA and the gradient stops carry alpha via stopOpacity. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/GlassEdgeFade.tsx#L35))

### `src/screens/app-screen/TabBarAutoHideContext.tsx`

- TabBarAutoHideProvider exists because the bottom tab bar renders outside each tab's GlassChromeProvider, so the focused tab's auto-hide progress must be republished above it. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TabBarAutoHideContext.tsx#L18))
- useTabBarHiddenProgress falls back to a never-written shared value outside the provider so the bar stays put rather than crashing a screen rendered out of context. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TabBarAutoHideContext.tsx#L32))
- useIsTabBarCollapsed mirrors the hidden progress into React state for props that cannot be animated, such as pointerEvents. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TabBarAutoHideContext.tsx#L45))
- TabBarAutoHideBridge publishes the tab's auto-hide progress only while focused and forces 0 when not at stack root, since pushed screens do not drive the scroll signal. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TabBarAutoHideContext.tsx#L63))

### `src/screens/chat-screen/ChatListItem.tsx`

- ChatListItem Swipeable uses 30pt drag offsets (default 10pt) so a vertical scroll with sideways drift stays with the chat list instead of opening swipe actions. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/ChatListItem.tsx#L96))

### `src/screens/chat-screen/hooks/useKeyboardAvoidingPlaybarStyle.ts`

- useKeyboardAvoidingPlaybarStyle pads by tab bar height plus bottom inset because the tab bar floats over screens (absolute in AppTabBar). ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/chat-screen/hooks/useKeyboardAvoidingPlaybarStyle.ts#L26))

### `src/screens/contest-screen/ContestNavOverlay.tsx`

- CONTEST_NAV_CONTROLS_HEIGHT is used by ContestScreen minHeaderHeight so the floating nav overlay never overlaps the tab bar at full collapse. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestNavOverlay.tsx#L26))

### `src/screens/contest-screen/ContestScreen.tsx`

- ContestScreen's collapsible header uses pointerEvents box-none so drags on blank header space reach the scroll view, and sets a theme background because Tabs.Container hardcodes a literal white behind the header. ([L324](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L324))
- ContestScreen seeds CollapsibleTabNavigator headerHeight high because underestimating causes a visible jump before measurement; overestimating is harmless. ([L588](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L588))

### `src/screens/explore-screen/SearchExploreScreen.tsx`

- SearchExploreScreen resets the glass chrome scroll to 0 when toggling search because search results replace the explore list, which remounts at the top. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/explore-screen/SearchExploreScreen.tsx#L65))

### `src/screens/explore-screen/components/SearchExploreHeader.tsx`

- SearchExploreHeader field sets marginHorizontal 0 because GlassCapsule insets itself from the screen edges while floating. ([L263](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/explore-screen/components/SearchExploreHeader.tsx#L263))

### `src/screens/fan-clubs-explore-screen/FanClubExploreCard.tsx`

- FanClubExploreCardCover is keyed by mint from its parent so FlashList cell recycling does not reuse cover-image hook state across rows. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/fan-clubs-explore-screen/FanClubExploreCard.tsx#L81))

### `src/screens/feed-screen/FeedScreen.tsx`

- FeedScreen disables the drawer navigator's edge swipe while focused and the drawer is closed because it competes with the PagerView and track tile taps; it re-enables when open so it can be swiped closed, and restores on blur. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L97))
- FeedScreen enables useOpenDrawerGesture only on For You because PagerView swallows right-swipes on its first page, leaving the drawer unreachable by gesture; on Latest a right swipe pages back. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L112))
- FeedScreen composes the drawer pan Simultaneous with Gesture.Native for the pager, otherwise the pager's native fling recognizer claims fast horizontal swipes before the pan activates. ([L123](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L123))
- FeedScreen adds bottomChin padding to lineup content because TrackLineup sets hideBottomChin, so the floating tab bar inset must be applied here. ([L225](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L225))

### `src/screens/library-screen/useLibraryTabChrome.ts`

- useLibraryTabChrome lets the focused Library tab drive the glass header scroll since each tab keeps its own scroll position, syncing the header on tab switch. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/library-screen/useLibraryTabChrome.ts#L12))

### `src/screens/notifications-screen/NotificationList.tsx`

- NotificationList sets progressViewOffset to the glass header inset so the pull-to-refresh spinner shows below the floating header, not under it. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/NotificationList.tsx#L171))

### `src/screens/notifications-screen/Reaction/ReactionList.tsx`

- ReactionList tracks the interacting reaction in a ref because the gesture handler is itself held in a ref and would read stale state. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/Reaction/ReactionList.tsx#L64))

### `src/screens/profile-screen/FullscreenImageViewer.tsx`

- FullscreenImageViewer resets pan translation on every open so an earlier partial drag that did not dismiss doesn't leave the image off-center. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/FullscreenImageViewer.tsx#L81))

### `src/screens/profile-screen/ProfileHeader/Bio.tsx`

- Profile Bio renders the collapsed (numberOfLines) case as a separate non-interactive branch so the expanded bio text can remain scrollable. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileHeader/Bio.tsx#L24))
- Bio only applies numberOfLines once onTextLayout shows the text needs truncation, so it can report to the parent whether the bio section is expandable. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileHeader/Bio.tsx#L37))

### `src/screens/profile-screen/ProfileHeader/ProfileSocials.tsx`

- ProfileSocials starts its Animated opacity at 1 so the loading skeleton is visible before socials load and fade in. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileHeader/ProfileSocials.tsx#L68))

### `src/screens/profile-screen/ProfileNavOverlay.tsx`

- PROFILE_NAV_CONTROLS_HEIGHT is exported so ProfileTabNavigator reserves the same space via minHeaderHeight; the two must stay in sync. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileNavOverlay.tsx#L34))

### `src/screens/profile-screen/ProfileScreenSkeleton.tsx`

- ExpandableSectionSkeleton only mirrors the collapsed 2-line bio, because tier and full socials appear only after expansion and reserving space for them would cause a skeleton-to-content shift. ([L104](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileScreenSkeleton.tsx#L104))

### `src/screens/profile-screen/ProfileScrollContext.tsx`

- useCurrentTabScrollY only works inside the collapsible Tabs.Container, so ProfileScrollBridge must be rendered inside the collapsible header to copy the tab scroll position into ProfileScrollContext for consumers outside it like ProfileNavOverlay. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileScrollContext.tsx#L8))
- useCurrentTabScrollY only works inside the collapsible Tabs.Container, so ProfileScrollBridge must be rendered inside the collapsible header to copy the tab scroll position into ProfileScrollContext for consumers outside it like ProfileNavOverlay. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileScrollContext.tsx#L20))

### `src/screens/profile-screen/ProfileTabs/ContestsTab.tsx`

- Profile ContestsTab uses the shared FlatList from app/components/core because a plain ScrollView breaks the CollapsibleTabNavigator header scroll tracking. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileTabs/ContestsTab.tsx#L12))

### `src/screens/search-screen/SearchCategoriesAndFilters.tsx`

- Search category pills set disableUnselectAnimation so the pills rearranging after selection don't flash purple. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/search-screen/SearchCategoriesAndFilters.tsx#L58))

### `src/screens/sign-on-screen/components/AccountHeader.tsx`

- Sign-on AccountHeader uses zIndex 2 so it renders above the Page component, which uses zIndex 1. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/components/AccountHeader.tsx#L58))

### `src/screens/sign-on-screen/components/layout.tsx`

- Sign-on Page adds bottom padding of 48 + 2\*spacing.l + spacing.xl to offset the absolutely positioned footer (button height plus footer padding plus extra). ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/components/layout.tsx#L59))

### `src/screens/trending-screen/TrendingHeader.tsx`

- TrendingHeader omits a backgroundColor because FloatingSubHeader provides the fill. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingHeader.tsx#L45))

### `src/screens/trending-screen/TrendingLineupSkeletons.tsx`

- TrendingLineupSkeletons renders TrackLineup with empty trackIds and isPending so skeleton rows match the loaded lineup exactly. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingLineupSkeletons.tsx#L8))

### `src/screens/trending-screen/TrendingScreen.tsx`

- TrendingScreen passes bottomChin padding to TrackLineup because the lineup opts out of the shared chin and must clear the floating tab bar itself. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingScreen.tsx#L41))
- TrendingScreen renders the same TrendingHeader element as both the deferred skeleton and the real children so React reconciles one instance and the pills don't pop in or shift when isScreenReady flips. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingScreen.tsx#L70))

### `src/utils/animation.ts`

- animateLinear runs long animations as 10s linear segments restarted from wall-clock position, because the native driver precomputes a frame per 16ms and a track-length animation would send a huge array to native. ([L4](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/animation.ts#L4))
- attachToScroll must be the list's onScroll on its own; adding custom onScroll logic alongside the Animated.event prevents using the native driver. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/animation.ts#L77))

### `src/utils/dominantColors.ts`

- dominantColors clamps colors above luminance 201 (#CDC8C8), the brightest background that keeps 4.5:1 contrast with white text. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/dominantColors.ts#L8))

### `src/utils/image/decodePng.ts`

- decodePng is a minimal non-interlaced PNG decoder because artwork is served as JPEG and PNG only appears for the occasional local file. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/image/decodePng.ts#L21))

### `src/utils/image/rgbaImage.ts`

- resizeImage uses area averaging when shrinking and bilinear when growing to stay close to jimp's default resize output that it replaced. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/image/rgbaImage.ts#L52))

### `src/utils/launchSelectImageActionSheet.ts`

- launchSelectImageActionSheet disables includeBase64 when freeStyleCropEnabled is set because react-native-image-crop-picker otherwise fails with 'Cannot find image data'. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/launchSelectImageActionSheet.ts#L29))
- launchSelectImageActionSheet disables includeBase64 when freeStyleCropEnabled is set because react-native-image-crop-picker otherwise fails with 'Cannot find image data'. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/launchSelectImageActionSheet.ts#L36))
