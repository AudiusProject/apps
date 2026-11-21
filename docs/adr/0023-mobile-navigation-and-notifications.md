# 0023. Navigation, push notifications and sharing on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Stack navigation, notification routing and share-to-story flows. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `index.js`

- index.js ignores the "new NativeEventEmitter" LogBox warning because of react-navigation issue 9882. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L43))
- index.js registers an empty firebase background message handler because Android starts a headless JS task per background push and the OS already displays it. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L58))

### `src/components/contest-card/ContestCard.tsx`

- ContestCard navigates to the dedicated Contest screen rather than the track screen, matching the web ContestCard. ([L273](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/contest-card/ContestCard.tsx#L273))

### `src/components/core/Screen/hooks/useIsScreenReady.ts`

- useIsScreenReady wraps runAfterInteractions in a minimal setTimeout so scheduling the ready callback does not interrupt in-progress interactions. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/hooks/useIsScreenReady.ts#L21))
- useIsScreenReady forces ready after RESET_DELAY so a screen never stays in its loading state if InteractionManager never settles. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/hooks/useIsScreenReady.ts#L28))

### `src/components/navigation-container/NavigationContainer.tsx`

- NavigationContainer does not gate the navigator on the account-status request because hasAccount and accountHandle come from useCurrentAccount's synchronous local-storage placeholderData on first render. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/navigation-container/NavigationContainer.tsx#L40))

### `src/components/send-tokens-drawer/components/UserSearchAutocomplete.tsx`

- UserSearchAutocomplete uses React Navigation's useNavigation directly (not the app wrapper) so navigation works when rendered inside a drawer. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/components/UserSearchAutocomplete.tsx#L37))
- UserSearchAutocomplete closes the send-tokens drawer before navigating to user selection to avoid stacking bottom sheets. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/components/UserSearchAutocomplete.tsx#L52))
- After a user is chosen, UserSearchAutocomplete reopens the send-tokens drawer on a 100ms timeout so navigation.goBack() finishes first. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/components/UserSearchAutocomplete.tsx#L64))
- UserSearchAutocomplete uses navigation.navigate rather than push to reach SendTokensUserSelection because push does not work from within the drawer. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/send-tokens-drawer/components/UserSearchAutocomplete.tsx#L71))

### `src/components/share-drawer/ShareDrawer.tsx`

- ShareDrawer opens the native share sheet directly for weekly rotation shares (no saga) and passes a relative route because share() prepends AUDIUS_URL. ([L202](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/ShareDrawer.tsx#L202))
- ShareDrawer only offers story sharing for tracks that are streamable and not unlisted/invalid/deleted, because the story renders the track's audio; undefined stream flags mean not populated. ([L224](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/ShareDrawer.tsx#L224))
- ShareDrawer is registered with NiceModal and added to the nice-modal bridge allowlist so code outside React and legacy setVisibility('Share', true) dispatches can open it. ([L385](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/ShareDrawer.tsx#L385))

### `src/components/share-drawer/ShareToStorySticker.tsx`

- ShareToStorySticker accepts a pre-resolved artworkSource (with mirror fallback) so the captured sticker always has a working image URL instead of relying on TrackImage. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/ShareToStorySticker.tsx#L36))
- ShareToStorySticker overlays the milestone headline on the artwork so the sticker keeps the fixed size the story pipeline hardcodes for Snapchat and TikTok. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/ShareToStorySticker.tsx#L41))

### `src/components/share-drawer/useShareToStory.tsx`

- waitForHandoff resolves when the target app opens (SDK resolves or Audius goes to background) because some share SDKs only resolve when the user returns or after a native timeout. ([L132](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L132))
- In useShareToStory, getDominantRgb returns a string with a single default color when it cannot find dominant colors, so the result type is Color[] | string. ([L411](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L411))
- The story WAVEFORM_SEGMENT ffmpeg filter draws 36 bars mirrored around the bass at 504x128, keeps the loudest 64 of showfreqs' 120dB rows, and uses 14px columns with a 4px gap and 2px floor. ([L501](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L501))
- useShareToStory retries the FFmpeg render once because ffmpeg streams the audio itself and can drop the connection; -y lets the retry overwrite the partial file. ([L512](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L512))
- useShareToStory reports the last 800 characters of FFmpeg output because the start is the version banner and the error is at the end. ([L531](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L531))
- useShareToStory treats 'Failed to launch TikTok share' from the TikTok SDK as TikTok not being installed. ([L559](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L559))

### `src/components/top-tab-bar/createCollapsibleTabNavigator.tsx`

- createCollapsibleTabNavigator wraps Tabs.Container in render() because that provides the navigator contexts that useIsFocused and useNavigationState read inside tab screens. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/top-tab-bar/createCollapsibleTabNavigator.tsx#L57))

### `src/constants/storage-keys.ts`

- DEVICE_TOKEN_REGISTRATION_KEY stores the last device token registered with identity so startup only re-registers when the token or signed-in user changes. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/constants/storage-keys.ts#L14))

### `src/hooks/useNavigation.ts`

- useNavigation's duplicate-push guard stores lastNavAction, which is reset by an event handler in AppTabScreen rather than in this hook. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNavigation.ts#L63))

### `src/hooks/useNotificationNavigation.ts`

- For Event-typed comment notifications, useNotificationNavigation reads the cached event (primed by useNotificationEntity) to get the parent track id, because the Contest screen takes a track id, not an event id. ([L191](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L191))
- useNotificationNavigation converts entityId with Number() because the push sends the track id as a string and iOS delivers it unchanged. ([L235](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L235))
- All contest-related notifications carry the contest host track in entityId and navigate to the Contest screen with { trackId }, which resolves its own event and comments. ([L310](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L310))
- WeeklyRotation tile and push carry no entity, so useNotificationNavigation just opens WeeklyRotationScreen, which fetches the mix for the signed-in user. ([L359](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L359))
- WeeklyArtistRecap pushes carry no entity, so useNotificationNavigation opens the Notifications screen where the full recap is shown. ([L365](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L365))
- WeeklyRotationFeatured opens the track when one is featured and the artist profile when several are; the push signals this via entityType, while the tile reads the track owner from the cache primed by useNotificationEntity. ([L369](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L369))
- FanRemixContestSubmission notifications open the submitted remix track rather than the contest, matching web and letting the recipient play it. ([L518](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useNotificationNavigation.ts#L518))

### `src/hooks/useScrollToTop.ts`

- useScrollToTop is a custom replacement because react-navigation's own useScrollToTop does not support nested navigators (react-navigation issue 8586); it listens for scrollToTop on all parent navigators and tabPress on the nearest tab navigator. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useScrollToTop.ts#L6))

### `src/notifications.test.ts`

- openInitialNotification must only navigate for the launch push once; a later remount calling it again must not replay the same notification. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.test.ts#L134))

### `src/notifications.ts`

- OpenedNotification.payload is the APNs userInfo minus aps on iOS and the FCM data map on Android, matching the shape react-native-notifications used to provide so handlers stay unchanged. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.ts#L102))
- PushNotifications.fetchDeviceToken sends the raw lowercase-hex APNs token on iOS because identity-service registers iOS tokens with an SNS APNs platform app; this matches what react-native-notifications sent so existing rows are reused. ([L216](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.ts#L216))

### `src/screens/app-screen/AppScreen.tsx`

- AppScreen resets lastNavAction on transitionEnd via navigator screenListeners because navigation.addListener inside a screen does not reliably catch events from other screens. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppScreen.tsx#L25))

### `src/screens/app-screen/AppTabScreen.tsx`

- WeeklyRotationScreen params: no handle shows the signed-in user's own mix, a handle shows a shared mix. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L120))
- AppTabScreen handleChangeState ignores non-stack state events because nested navigator state changes bubble up; only the outer stack depth decides drawer swipe. ([L223](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L223))
- AppTabScreen resets lastNavAction on transitionEnd via navigator screenListeners because navigation.addListener inside a screen misses events from other screens. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L233))
- AppTabScreen updates AppTabNavigationContext on each screen focus so external surfaces like NowPlayingDrawer push onto the currently focused tab stack at any depth. ([L248](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L248))
- Contests screen forces animation 'simple_push' because arriving from the left nav drawer sets animation to 'none', which caused a jarring instant pop when leaving. ([L337](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/AppTabScreen.tsx#L337))

### `src/screens/app-screen/TrendingTabScreen.tsx`

- TrendingTabScreen pre-declares MobileRootHeader in stack options so React Navigation uses custom-header layout from the first native frame; otherwise the default nav bar shows first and content double-shifts when TrendingScreen's setOptions runs. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TrendingTabScreen.tsx#L12))
- TrendingTabScreen sets headerTransparent in initial options to match TrendingScreen so the first native frame already floats the header instead of laying it out in flow. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/TrendingTabScreen.tsx#L32))

### `src/screens/change-email-screen/ChangeEmailScreen.tsx`

- ChangeEmailScreen navigates to its pages through navigate('ChangeEmail', {screen}) because the pages live in a nested stack. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/change-email-screen/ChangeEmailScreen.tsx#L91))

### `src/screens/change-password-screen/ChangePasswordScreen.tsx`

- ChangePasswordScreen navigates to its pages through navigate('ChangePassword', {screen}) because the pages live in a nested stack. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/change-password-screen/ChangePasswordScreen.tsx#L96))

### `src/screens/collection-screen/CollectionScreen.tsx`

- CollectionScreen fetches by ID or by handle/slug permalink; collectionType comes from the deep link query and is required for permalink lookups. ([L89](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/collection-screen/CollectionScreen.tsx#L89))

### `src/screens/explore-screen/components/SearchExploreHeader.tsx`

- SearchExploreHeader focuses search from the autoFocus route param in a plain useEffect (not useFocusEffect) gated on isFocused, then resets the param, so the keyboard does not reappear on app foreground or flash on cold launch. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/explore-screen/components/SearchExploreHeader.tsx#L77))

### `src/screens/feed-screen/FeedScreen.tsx`

- FeedScreen memoizes renderHeader because a new function each render makes Screen call setOptions and React Navigation rebuild the header, remounting AccountPictureHeader and refetching the profile picture. ([L208](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L208))

### `src/screens/notifications-screen/NotificationList.tsx`

- NotificationList disables maintainVisibleContentPosition because new notifications are prepended on refresh and should be visible. ([L184](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/NotificationList.tsx#L184))

### `src/screens/notifications-screen/Notifications/ChallengeRewardNotification.tsx`

- ChallengeRewardNotification returns null for 'tp'/'trending-playlist' challenge ids because the legacy API may still send these deprecated notifications. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/Notifications/ChallengeRewardNotification.tsx#L91))

### `src/screens/notifications-screen/Notifications/TrendingGenreNotification.tsx`

- TrendingGenreNotification is hidden when its feature flag is off because the server sends it regardless. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/Notifications/TrendingGenreNotification.tsx#L29))

### `src/screens/notifications-screen/Notifications/WeeklyArtistRecapNotification.tsx`

- WeeklyArtistRecapNotification is hidden when its feature flag is off because the server sends it regardless; it opens the artist's own profile. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/notifications-screen/Notifications/WeeklyArtistRecapNotification.tsx#L24))

### `src/screens/root-screen/RootScreen.tsx`

- After sign-up, iOS auto-navigates to HomeStack when the sign-up stack unmounts, but Android does not, so RootScreen navigates to HomeStack explicitly on Android. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L155))

### `src/screens/root-screen/useResetNotificationBadgeCount.ts`

- useResetNotificationBadgeCount only clears the local app badge on foreground because the notifications service resets the server-side badge count when notifications are marked seen. ([L9](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/useResetNotificationBadgeCount.ts#L9))

### `src/screens/sign-on-screen/SignOnStack.tsx`

- SignOnStack navigates to sign-on screens via navigation.navigate('SignOnStack', { screen }) because those screens live in a nested stack. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/SignOnStack.tsx#L90))

### `src/screens/sign-on-screen/screens/SignOnScreen.tsx`

- SignOnScreen switches between sign-in and sign-up inside one container instead of using navigation so it can animate the transition between them. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/screens/SignOnScreen.tsx#L65))

### `src/screens/trending-screen/TrendingScreen.tsx`

- TrendingScreen memoizes renderHeader because a new function each render makes Screen call setOptions, rebuilding the header, remounting AccountPictureHeader and refetching the profile picture. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingScreen.tsx#L53))

### `src/screens/upload-screen/screens/UploadCompleteScreen.tsx`

- UploadCompleteScreen uses the app tab navigation for profile and chat links because those screens live in the tab stacks, not inside the upload modal stack. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/upload-screen/screens/UploadCompleteScreen.tsx#L75))

### `src/store/account/sagas.ts`

- Account sagas call updateUserEvent with hasSignedInNativeMobile on first native sign-in because identity service uses it for notification indexing. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/account/sagas.ts#L47))

### `src/store/settings/sagas.ts`

- Settings sagas re-register the push device token at least every 7 days even if unchanged, in case identity dropped the token on its side. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/settings/sagas.ts#L41))
- Push registration is skipped when this user registered this exact token recently; new installs, a different user or a rotated token miss the cache and register again. ([L114](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/settings/sagas.ts#L114))
- Enabling push notifications waits for queryAccountUser before updating settings because during sign-up the user may not exist yet when this runs. ([L145](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/store/settings/sagas.ts#L145))

### `src/utils/deeplink/getNavigationStateFromDeeplinkPath.ts`

- getNavigationStateFromDeeplinkPath routes /oauth/\* universal links to OAuthScreen because otherwise they hit an unmatched path and crash. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/deeplink/getNavigationStateFromDeeplinkPath.ts#L116))
- Deeplinks to /trending drop their query params because the mobile trending route always opens This Week. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/deeplink/getNavigationStateFromDeeplinkPath.ts#L150))
