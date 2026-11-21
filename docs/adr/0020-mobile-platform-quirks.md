# 0020. iOS, Android and React Native quirks

- Status: Accepted
- Date: 2026-11-21

## Context

Platform-specific workarounds for iOS, Android, Hermes, polyfills and the status bar that look removable but are not. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `index.js`

- index.js applies the Hermes Error.stack polyfill before any other import to avoid "Error.stack getter called with an invalid receiver" from libraries with non-standard error inheritance. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L3))
- index.js re-enables the deprecated scaleY view style attribute because the inverted FlatList workaround for Android (worse on Android 13) depends on it. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L15))
- react-native-get-random-values is required in index.js so @solana/web3.js can generate randomness. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L34))
- index.js installs a WebCrypto SubtleCrypto shim because micro-aes-gcm and @noble/secp256k1 expect it. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/index.js#L38))

### `src/app/App.tsx`

- App.tsx enables setLayoutAnimationEnabledExperimental on Android because LayoutAnimation does not work there otherwise. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/App.tsx#L58))

### `src/app/ThemeProvider.tsx`

- ThemeProvider ignores appearance changes while backgrounded because iOS briefly reports dark while generating the app-switcher snapshot, but always runs the first dispatch. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/app/ThemeProvider.tsx#L174))

### `src/components/audio/Airplay.tsx`

- Airplay renders a hidden native AVRoutePickerView via AirplayViewManager because AirPlay, unlike Chromecast, requires a native component. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/Airplay.tsx#L27))

### `src/components/audio/AudioPlayer.tsx`

- After TrackPlayer.skip, AudioPlayer calls play() again when redux is playing because on iOS skip only keeps playing if the player was already in the playing state. ([L475](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/AudioPlayer.tsx#L475))

### `src/components/audio/addTracksAroundCurrent.test.ts`

- addTracksAroundCurrent tests model SwiftAudioEx 1.x where inserting before the current item only shifts currentIndex when the queue has more than one item. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/addTracksAroundCurrent.test.ts#L3))

### `src/components/audio/addTracksAroundCurrent.ts`

- addTracksAroundCurrent inserts "after" tracks first (or a temporary placeholder) because SwiftAudioEx does not shift currentIndex for inserts before a lone track, causing the track to replay instead of advancing. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/audio/addTracksAroundCurrent.ts#L6))

### `src/components/bottom-tab-bar/BottomTabBar.tsx`

- FloatingPill is the iOS 26 liquid-glass tab bar; scrolling collapses it to a circle with search and the play bar between, and tapping the active tab scrolls to top and expands it. ([L211](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/BottomTabBar.tsx#L211))
- The collapsed search button scales in rather than fading because the iOS system glass stops rendering under a parent that starts at zero opacity. ([L281](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/bottom-tab-bar/BottomTabBar.tsx#L281))

### `src/components/challenge-rewards-drawer/CosignChallengeContent.tsx`

- CosignChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/CosignChallengeContent.tsx#L74))

### `src/components/challenge-rewards-drawer/FirstWeeklyCommentChallengeContent.tsx`

- FirstWeeklyCommentChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/FirstWeeklyCommentChallengeContent.tsx#L76))

### `src/components/challenge-rewards-drawer/ListenStreakEndlessChallengeContent.tsx`

- ListenStreakEndlessChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/ListenStreakEndlessChallengeContent.tsx#L70))

### `src/components/challenge-rewards-drawer/PinnedCommentChallengeContent.tsx`

- PinnedCommentChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/PinnedCommentChallengeContent.tsx#L76))

### `src/components/challenge-rewards-drawer/RemixContestWinnerChallengeContent.tsx`

- RemixContestWinnerChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/RemixContestWinnerChallengeContent.tsx#L75))

### `src/components/challenge-rewards-drawer/TastemakerChallengeContent.tsx`

- TastemakerChallengeContent sets lineHeight 0 on iOS because iOS misaligns emojis vertically with text. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/challenge-rewards-drawer/TastemakerChallengeContent.tsx#L64))

### `src/components/collapsible-tabs/Container.tsx`

- Collapsible tabs Container sets contentInset to header+tabbar height on iOS so the refresh control and scroll bars sit beneath the header. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/Container.tsx#L112))

### `src/components/collapsible-tabs/hooks.tsx`

- useCollapsibleStyle sets progressViewOffset 0 on iOS with header overscroll so the refresh control sits at the top. ([L169](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L169))
- useCollapsibleStyle offsets the Android refresh control below the header because otherwise z-index hides it. ([L172](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L172))
- collapsible-tabs tracks afterDrag because iOS only calls onMomentumEnd after a vigorous swipe, so it must be triggered manually to sync scenes. ([L287](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L287))
- collapsible-tabs delays the afterDrag check by one frame on iOS so onMomentumBegin can fire first. ([L421](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L421))
- If the one-frame afterDrag timer finishes, onMomentumBegin never fired, so collapsible-tabs calls onMomentumEnd manually to snap the header. ([L425](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/collapsible-tabs/hooks.tsx#L425))

### `src/components/comments/CommentDrawer.tsx`

- CommentDrawer's footer memo intentionally omits insets.bottom because the rerender on keyboard open closes the keyboard on Android. ([L307](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentDrawer.tsx#L307))

### `src/components/comments/CommentForm.tsx`

- CommentForm focuses the input inside setTimeout because Android does not focus it synchronously. ([L125](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentForm.tsx#L125))
- CommentForm calls setSelection to the end of the initial message because Android otherwise leaves the cursor at the start. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/CommentForm.tsx#L168))

### `src/components/comments/useGestureEventHandlers.ts`

- useGestureEventsHandlers skips Keyboard.dismiss on iOS when content is scrollable and the touch ends below the keyboard, because iOS keyboard dismissal is interactive. ([L378](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/comments/useGestureEventHandlers.ts#L378))

### `src/components/connect-drawer/ConnectDrawer.tsx`

- ConnectDrawer starts Google Cast discovery manually on iOS because the framework only auto-discovers when a native CastButton is mounted; Android starts MediaRouter in MainActivity. ([L81](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/connect-drawer/ConnectDrawer.tsx#L81))
- ConnectDrawer opens the system AirPlay picker to disconnect because iOS does not allow ending an AirPlay route programmatically. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/connect-drawer/ConnectDrawer.tsx#L99))
- ConnectDrawer opens android.settings.BLUETOOTH_SETTINGS and falls back to general settings when the intent is not handled. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/connect-drawer/ConnectDrawer.tsx#L110))
- When switching from AirPlay to Cast, ConnectDrawer opens the AirPlay picker so the user can route back to the phone, since iOS cannot disconnect AirPlay programmatically. ([L127](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/connect-drawer/ConnectDrawer.tsx#L127))

### `src/components/core/ExpandableContent.tsx`

- ExpandableContent waits for the toggle button's onLayout before measuring because Android returns bad measurements otherwise. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/ExpandableContent.tsx#L171))

### `src/components/core/Link.tsx`

- Link opens mailto: URLs directly with openURL because canOpenURL on iOS requires mailto in LSApplicationQueriesSchemes. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Link.tsx#L25))

### `src/components/core/Screen/GlassCapsule.tsx`

- GlassCapsule keeps the glass drawn at all times under a page-colored cover that fades out, because iOS glass cannot fade in from transparent. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassCapsule.tsx#L29))
- GlassCapsule switches the iOS 26 glass effect to 'none' and back to animate it away/in natively, which an opacity fade cannot do. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassCapsule.tsx#L41))

### `src/components/core/Screen/GlassSurface.tsx`

- GlassSurface uses 0.72 tint opacity, above desktop's 65%, because mobile blurs busier backdrops and header text must stay legible. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassSurface.tsx#L15))
- GlassSurface uses an opaque root background on Android because backdrop blur is too costly and gesture-handler treats background-less view groups as see-through, letting taps reach handlers underneath. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassSurface.tsx#L87))
- GlassSurface sets elevation 0 on the top-edge shadow because Android elevation always casts downward into the bar itself; the upward shadow only works via iOS shadowOffset. ([L153](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/GlassSurface.tsx#L153))

### `src/components/core/Screen/LiquidGlass.ts`

- LiquidGlass checks TurboModuleRegistry for NativeLiquidGlassModule before requiring the library, because OTA JS can reach older binaries without the native module and the library's getEnforcing lookup would throw on import. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Screen/LiquidGlass.ts#L6))

### `src/components/core/Text.tsx`

- Text adds a small marginTop for demiBold weight on iOS because that font's glyphs render mispositioned vertically there. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/Text.tsx#L71))

### `src/components/core/TextInput.tsx`

- TextInput sets padding 0 on the input because Android applies default internal padding to native text inputs. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/TextInput.tsx#L79))

### `src/components/core/UserGeneratedText.tsx`

- UserGeneratedText measures links with measureInWindow because onLayout and measure return incorrect layouts for nested Text elements on Android. ([L219](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/core/UserGeneratedText.tsx#L219))

### `src/components/drawer/Drawer.tsx`

- Drawer registers useAndroidBackHandler while open so the hardware back press is swallowed; with blockClose the drawer stays up and the press does not reach navigation underneath. ([L478](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L478))
- Drawer interpolates the border radius so values between 0 and 1 snap to 0, because iOS renders fractional border radii under 1 incorrectly. ([L676](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/drawer/Drawer.tsx#L676))

### `src/components/fields/HarmonyTextField.tsx`

- HarmonyTextField reads nativeEvent.text on blur even though the type lacks it, because iOS still sends text on blur events. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/fields/HarmonyTextField.tsx#L74))

### `src/components/fields/ImageField.tsx`

- ImageField passes immediate to HarmonyImage because on Android the fade-in can miss onLoad when the same URL returns from cache, leaving the image transparent. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/fields/ImageField.tsx#L113))

### `src/components/now-playing-drawer/NowPlayingDrawer.tsx`

- NowPlayingDrawer caches the first non-zero top inset so it keeps the real value after the status bar is hidden, since the inset can start at 0. ([L207](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L207))
- NowPlayingDrawer attaches to the drawer's pan responder to fade the status bar in and out while dragging. ([L284](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L284))
- NowPlayingDrawer only hides the iOS status bar when the top inset exceeds 20, because hiding it on smaller insets causes a layout shift that breaks the drag animation. ([L288](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/now-playing-drawer/NowPlayingDrawer.tsx#L288))

### `src/components/ota-update-banner/OtaUpdateBanner.tsx`

- OtaUpdateBanner animates by sliding rather than fading because the iOS system glass effect stops rendering under a parent at zero opacity. ([L265](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/ota-update-banner/OtaUpdateBanner.tsx#L265))

### `src/components/scrubber/usePosition.ts`

- usePosition re-reads TrackPlayer progress when the app becomes active because Android pauses JS timeouts in the background and the position drifts. ([L82](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/scrubber/usePosition.ts#L82))

### `src/components/share-drawer/useShareToStory.tsx`

- useShareToStory's IOS_APP_SCHEMES must match LSApplicationQueriesSchemes in Info.plist or Linking.canOpenURL cannot detect the apps. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L110))
- useShareToStory's isAppInstalled only checks on iOS because Android has no package visibility for every target app, so it assumes installed there. ([L117](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L117))
- useShareToStory captures the sticker after a short wait even if onLoad never fired, because on iOS onLoad can be skipped for cached or opacity:0 images. ([L240](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L240))
- pasteToTikTokApp passes a plain file path on Android (the TikTok SDK converts it via FileProvider) and a file:// URI on iOS. ([L358](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L358))
- useShareToStory tracks the success event before cleanup because Android pauses JS timers in the background and deferred work may never run if the user stays in the other app. ([L576](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L576))
- useShareToStory defers cleanup until the app is active again because updating UI while the target app opens can pull Audius back to the foreground on Android. ([L586](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/share-drawer/useShareToStory.tsx#L586))

### `src/components/user-link/UserLink.tsx`

- UserLink's outer Pressable must not also navigate to Profile: on iOS a tap reached both it and the inner TextLink, pushing two Profile screens, so TextLink alone owns the push. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/user-link/UserLink.tsx#L57))

### `src/harmony-native/components/Button/Button/Button.tsx`

- harmony-native Button passes static (non-animated) icon fill props on Android instead of the animated icon props used on iOS. ([L265](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Button/Button/Button.tsx#L265))

### `src/harmony-native/components/Button/EntityActionButton/EntityActionButton.tsx`

- EntityActionButton passes static (non-animated) icon fill props on Android instead of animated icon props. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Button/EntityActionButton/EntityActionButton.tsx#L101))

### `src/harmony-native/components/Button/PlainButton/PlainButton.tsx`

- PlainButton passes static (non-animated) icon fill props on Android instead of animated icon props. ([L111](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Button/PlainButton/PlainButton.tsx#L111))

### `src/harmony-native/components/CoverPhoto/CoverPhoto.tsx`

- CoverPhoto unwraps source.file when the source has no uri, because Android's upload format nests the image under 'file'. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/CoverPhoto/CoverPhoto.tsx#L72))

### `src/harmony-native/components/Image/Image.tsx`

- harmony-native Image wraps onError so Error objects are never passed as props, which caused 'Error.stack getter called with an invalid receiver' in Hermes. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Image/Image.tsx#L96))

### `src/harmony-native/components/Text/Text.tsx`

- harmony-native Text adjusts letterSpacing on Android because it adds unmeasured trailing space after the last character, clipping the final letter. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Text/Text.tsx#L69))
- harmony-native Text adds marginTop 2 to demiBold text on iOS to correct the font's vertical misalignment. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/Text/Text.tsx#L87))

### `src/harmony-native/components/input/TextInput/TextInput.tsx`

- harmony-native TextInput sets padding 0 to remove Android's default TextInput padding. ([L367](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/input/TextInput/TextInput.tsx#L367))

### `src/harmony-native/components/layout/Box/Box.tsx`

- harmony-native Box defaults to a white background when shadow is set because iOS shadows do not render on views without a background color. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/harmony-native/components/layout/Box/Box.tsx#L102))

### `src/hooks/useActivityPing.ts`

- useActivityPing pings once on mount because AppState starts as 'active' with no transition, so useEnterForeground alone would miss the initial app open. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useActivityPing.ts#L25))

### `src/hooks/useAndroidBackHandler.ts`

- useAndroidBackHandler relies on BackHandler running the most recently added listener first, so overlays opened later take priority over react-navigation and earlier overlays. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useAndroidBackHandler.ts#L5))

### `src/notifications.ts`

- parseAndroidNotificationData exists because FCM on Android delivers every data payload value as a string, so numeric IDs and nested JSON must be parsed back before notification navigation. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.ts#L30))
- iOS pushes are sent straight to APNs via SNS, not FCM, so @react-native-firebase/messaging ignores their taps; fromNotifeeEvent reads them from Notifee PRESS events, which AppDelegate ensures Notifee receives. ([L119](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.ts#L119))
- On Android, requestPermission uses react-native-permissions requestNotifications because PERMISSIONS.ANDROID lacks POST_NOTIFICATIONS in v5 and request(undefined) crashed natively. ([L267](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/notifications.ts#L267))

### `src/screens/app-screen/CompactHeader.tsx`

- useCompactFade on iOS 26 fades only the content and switches the glass effect on natively past half progress, because Liquid Glass stops rendering under a parent whose opacity animates from 0. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/CompactHeader.tsx#L35))

### `src/screens/app-screen/useAppScreenOptions.tsx`

- useAppScreenOptions uses animation 'simple_push' with animationMatchesGesture because on iOS 26 the default animation makes native-stack use Apple's edge-only interactiveContentPopGestureRecognizer; this switches RNScreens to its full-screen RNSPanGestureRecognizer. ([L88](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/app-screen/useAppScreenOptions.tsx#L88))

### `src/screens/coin-details-screen/components/CoinInsightsCard.tsx`

- CoinInsightsCard adds marginTop 2 on iOS to the graduated label because the harmony label variant renders misaligned vertically on iOS. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/coin-details-screen/components/CoinInsightsCard.tsx#L51))

### `src/screens/edit-profile-screen/GroupedTextField.tsx`

- GroupedTextField input sets the label's lineHeight and includeFontPadding false so the label and input share a baseline on Android. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-profile-screen/GroupedTextField.tsx#L30))

### `src/screens/feed-screen/FeedScreen.tsx`

- FeedScreen ignores onPageSelected when the page already matches state, swallowing PagerView's initial mount event on Android that would fire spurious analytics and clobber the persisted tab. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L164))

### `src/screens/profile-screen/useProfileScrollStatusBar.ts`

- useProfileScrollStatusBar applies the bar style in requestAnimationFrame on focus because useAnimatedReaction only fires on change and would miss a restored scroll position. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/useProfileScrollStatusBar.ts#L59))
- useProfileScrollStatusBar re-applies the scrolled bar style when the theme changes, otherwise the status bar keeps the previous theme's content style until the user crosses the fade threshold again. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/useProfileScrollStatusBar.ts#L96))

### `src/screens/rewards-screen/Panel.tsx`

- Rewards Panel sets lineHeight 0 on iOS for the status label because iOS misaligns emojis vertically with the surrounding text otherwise. ([L129](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/rewards-screen/Panel.tsx#L129))

### `src/screens/root-screen/RootScreen.tsx`

- On Android the HomeStack and AccountLoading screens use animation: 'none' to work around a react-native-screens 'white screen of death' when transitioning between stacks. ([L196](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/root-screen/RootScreen.tsx#L196))

### `src/screens/sign-on-screen/SignOnStack.tsx`

- On Android the HomeStack and AccountLoading screens use animation: 'none' to work around a react-native-screens 'white screen of death' when transitioning between stacks. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/sign-on-screen/SignOnStack.tsx#L135))

### `src/services/track-download.ts`

- track-download sends single-file Android downloads through the Download Manager straight to the Downloads directory. ([L208](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L208))
- track-download stages Android multi-file downloads in a temp folder without the Download Manager to avoid per-file notifications, zips them, then adds one notification for the zip. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L233))
- On Android 13+ track-download must copy the zip into the MediaStore Downloads collection manually. ([L246](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L246))
- track-download still calls addCompleteDownload after copying to MediaStore on Android 13+ so the user gets a completed-download notification. ([L266](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/services/track-download.ts#L266))

### `src/utils/hermes-error-stack-polyfill.ts`

- applyHermesErrorStackPolyfill wraps Error.prototype.stack on Hermes because Hermes throws 'Error.stack getter called with an invalid receiver' for libraries using non-standard Error inheritance (RN #43636, hermes #1496). ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/hermes-error-stack-polyfill.ts#L1))

### `src/utils/share.ts`

- share() concatenates message and URL into one message because Android's Share API doesn't support a separate url field the way iOS does. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/utils/share.ts#L16))
