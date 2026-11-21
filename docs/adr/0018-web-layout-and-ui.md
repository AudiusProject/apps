# 0018. Layout and UI on web

- Status: Accepted
- Date: 2026-11-21

## Context

CSS and layout constraints, animation, modals, menus, drag and drop, images and other UI behaviour that is easy to break. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/app/AppProviders.tsx`

- AppProviders calls setNiceModalAdapter so platform-agnostic common code (sagas/services) can show and hide nice-modal-react modals without depending on the package. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/AppProviders.tsx#L38))

### `src/app/ReownAppKitModal.tsx`

- ReownAppKitModal sets its z-index so the AppKit modal renders above ConnectWalletModal. ([L32](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/ReownAppKitModal.tsx#L32))

### `src/app/registerNiceModals.ts`

- registerNiceModals.ts is imported from AppProviders so every nice-modal registration exists before anything calls showNiceModal(id). ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/app/registerNiceModals.ts#L1))

### `src/common/utils/isMobileWeb.ts`

- isMobileWeb must only run after confirming the client is not the native mobile app; it cannot be used in React Native. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/utils/isMobileWeb.ts#L5))
- isMobileWeb relies only on the User-Agent so a mobile browser's Request Desktop Site gets the desktop app; platform/touch heuristics are avoided on purpose. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/utils/isMobileWeb.ts#L6))

### `src/components/alt-button/FavoriteButton.tsx`

- FavoriteButton's altVariant prop makes the button behave as a static icon. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/alt-button/FavoriteButton.tsx#L30))

### `src/components/alt-button/RepostButton.tsx`

- RepostButton's altVariant prop makes the button behave as a static icon. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/alt-button/RepostButton.tsx#L26))

### `src/components/avatar/Avatar.tsx`

- Avatar stores the failed src URL rather than a boolean so a later mirror URL from useImageSize can still render. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/avatar/Avatar.tsx#L42))
- Avatar's onError lets useImageSize try the next mirror; once all mirrors fail the data-uri placeholder sticks. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/avatar/Avatar.tsx#L60))

### `src/components/buy-sell-modal/components/TokenDropdown.tsx`

- TokenDropdown renders a fixed Blanket so clicks outside the dropdown but inside the modal close it. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/buy-sell-modal/components/TokenDropdown.tsx#L38))

### `src/components/collection/desktop/edit-mode/PlaylistEditModeBar.tsx`

- PlaylistEditModeBar portals to the app shell because the main content wrapper's transform breaks position:fixed, while still inheriting --nav-width and --play-bar-height. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/PlaylistEditModeBar.tsx#L25))

### `src/components/collections-table/CollectionsTable.tsx`

- CollectionsTable is tailored to the Artist Dashboard and is not a general table like TracksTable. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collections-table/CollectionsTable.tsx#L73))

### `src/components/contest-card/ContestCard.tsx`

- ContestCover renders an img element instead of a CSS background so the browser's HiDPI scaling keeps the wide hero crisp. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L66))
- The ContestCard skeleton reserves an 80px or 64px two-line title block to match the real card and avoid a size pop. ([L187](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L187))
- ContestCard requests 1000x1000 art for the full-width hero and 480x480 for ~309px grid cards. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L233))
- ContestCard pins the title block to two line-heights so grid cards align regardless of title length. ([L259](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L259))
- ContestCard sets position relative so the stretched Link overlay works and cmd/middle-click open in a new tab. ([L304](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L304))
- ContestCard raises the scrolling entries row above the stretched link so scrolling and pill clicks do not navigate. ([L387](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L387))

### `src/components/data-entry/ContextualMenu.tsx`

- ContextualMenu slugifies its label into the form id because ids with spaces silently break the form/submit-button association. ([L71](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/data-entry/ContextualMenu.tsx#L71))

### `src/components/data-entry/TagInput.jsx`

- TagInput allows shift+3 (#) because hashtags are stripped later. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/data-entry/TagInput.jsx#L17))

### `src/components/drag-autoscroller/DragAutoscroller.tsx`

- DragAutoscroller handles onDragEnter because it fires repeatedly while an item dragged from outside is over the container. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/drag-autoscroller/DragAutoscroller.tsx#L99))
- DragAutoscroller handles onDrag because it fires repeatedly while dragging an item that started inside the container. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/drag-autoscroller/DragAutoscroller.tsx#L101))

### `src/components/dragndrop/Draggable.tsx`

- Draggable skips setting text/uri-list on Firefox because doing so forces a page refresh on drop. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/dragndrop/Draggable.tsx#L58))

### `src/components/dragndrop/Droppable.tsx`

- Droppable checks nativeEvent.defaultPrevented because it is the only reliable way to stop nested drops from bubbling. ([L89](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/dragndrop/Droppable.tsx#L89))

### `src/components/drawer/Drawer.tsx`

- Drawer opens via setImmediate so the content height is measured before animating. ([L172](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/drawer/Drawer.tsx#L172))
- FullscreenDrawer disables body scroll while open to prevent double scrollbars. ([L329](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/drawer/Drawer.tsx#L329))

### `src/components/edit-collection/EditCollectionForm.tsx`

- EditCollectionForm returns the onSubmit promise so Formik keeps isSubmitting true while saving. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit-collection/EditCollectionForm.tsx#L101))

### `src/components/edit/AnchoredSubmitRow.tsx`

- AnchoredSubmitRow portals to the app shell because mainContentWrapper's transform breaks position:fixed, while keeping --nav-width and --play-bar-height. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/AnchoredSubmitRow.tsx#L22))

### `src/components/edit/AnchoredSubmitRowEdit.tsx`

- AnchoredSubmitRowEdit uses Formik's isSubmitting when no explicit prop is passed so all flows show a loading state. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/AnchoredSubmitRowEdit.tsx#L36))
- AnchoredSubmitRowEdit portals to the app shell because mainContentWrapper's transform breaks position:fixed. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/AnchoredSubmitRowEdit.tsx#L43))

### `src/components/edit/fields/datePickerUtils.ts`

- isDateOnOrBeforeToday compares local calendar dates so a rolling 24-hour window never allows tomorrow. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/datePickerUtils.ts#L1))

### `src/components/edit/fields/download-availability/DownloadAvailability.tsx`

- DownloadAvailability uses forceRefreshAfterMs=180 to match the 0.18s entry animation. ([L144](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/download-availability/DownloadAvailability.tsx#L144))

### `src/components/embed-modal/EmbedModal.tsx`

- EmbedModal delays rendering the embed frame by 100ms so the modal open animation stays smooth. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/embed-modal/EmbedModal.tsx#L131))

### `src/components/file-replace-container/FileReplaceContainer.tsx`

- FileReplaceContainer passes an empty style to ReactDropzone to drop its default styles so it hugs the button. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/file-replace-container/FileReplaceContainer.tsx#L47))

### `src/components/header/desktop/HeaderGutter.tsx`

- HeaderGutter is a portaled low z-index div so scrollbars appear to float above sticky headers. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/header/desktop/HeaderGutter.tsx#L18))
- HeaderGutter portals to the main content parent rather than body to account for banners. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/header/desktop/HeaderGutter.tsx#L29))

### `src/components/host-remix-contest-modal/TimeInput.tsx`

- TimeInput sets the cursor in requestAnimationFrame so it applies after React updates the input value. ([L146](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/host-remix-contest-modal/TimeInput.tsx#L146))

### `src/components/image-selection/ImageSelectionButton.jsx`

- ImageSelectionButton ignores clicks with event.detail 0 (keyboard-triggered); instanceof KeyboardEvent did not work. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/image-selection/ImageSelectionButton.jsx#L52))

### `src/components/leaving-audius-modal/LeavingAudiusModal.tsx`

- LeavingAudiusModal reads its link payload from the redux slice set by useLeavingAudiusModal, while NiceModal's useModal owns visibility. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/leaving-audius-modal/LeavingAudiusModal.tsx#L29))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup reads playback state from the store at click time instead of subscribing, so play/pause/skip don't rebuild every tile. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L171))

### `src/components/link/UserLink.tsx`

- UserLink renders badges outside the TextLink so link hover effects don't apply to the badges. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/link/UserLink.tsx#L112))

### `src/components/loading-spinner/LoadingSpinner.tsx`

- LoadingSpinner must keep its svg > g > path structure because stylesheets recolor it via g path selectors. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/loading-spinner/LoadingSpinner.tsx#L7))

### `src/components/menu/TrackMenu.tsx`

- TrackMenu defers repost actions with setTimeout 0 so the menu closes before the change propagates. ([L229](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/menu/TrackMenu.tsx#L229))
- TrackMenu defers the favorite toggle with setTimeout 0 so the menu closes before the change propagates. ([L239](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/menu/TrackMenu.tsx#L239))

### `src/components/modal-form/ModalForm.tsx`

- ModalForm can't move to Stems because mismatched Formik versions would split the Formik context; it must be used inside <Formik>. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/modal-form/ModalForm.tsx#L6))

### `src/components/nav-banner/NavBanner.tsx`

- NavBanner hides the sort button below MAX_PAGE_WIDTH_PX + 120 so it doesn't crowd the tabs. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav-banner/NavBanner.tsx#L36))

### `src/components/nav/Navigator.tsx`

- Navigator hides the mobile top nav on /contest routes so the contest page's full-bleed hero and back control own the top of the viewport. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/Navigator.tsx#L46))
- Navigator keeps nav width at the committed collapsed/expanded value during drag and only animates to the new state on release. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/Navigator.tsx#L60))
- Navigator updates nav CSS vars in a layout effect and uses FLIP: commit the new width once, then animate a transform back to zero. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/Navigator.tsx#L75))
- Navigator calls getBoundingClientRect to flush the starting --nav-shift transform before setting it back to zero so the transition runs. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/Navigator.tsx#L90))

### `src/components/nav/desktop/AccountDetails.tsx`

- AccountDetails uses one signed-in component for collapsed and expanded states so the Avatar stays mounted and its image never reloads. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/AccountDetails.tsx#L101))

### `src/components/nav/desktop/NotificationsButton.tsx`

- NotificationsButton mounts the panel on first hover or open; mounting starts the notifications fetch, so hovering warms both code and data. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/NotificationsButton.tsx#L52))

### `src/components/nav/desktop/NowPlayingArtworkTile.tsx`

- NowPlayingArtworkTile seeds the spring from the visible state when a track is already playing at mount, so toggling the sidebar doesn't flash. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/NowPlayingArtworkTile.tsx#L95))

### `src/components/nav/desktop/PlaylistLibrary/CollectionNavItem.tsx`

- CollectionNavItem passes BASE_URL plus path to the Draggable because draggables require a full URL. ([L236](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/PlaylistLibrary/CollectionNavItem.tsx#L236))

### `src/components/now-playing/NowPlaying.tsx`

- NowPlaying sets artwork width from its flexed height in an effect so the image stays square. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L155))
- NowPlaying subtracts 4px from artwork height for the image borders when sizing width. ([L160](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L160))
- NowPlaying stores position and duration in one state object so updates trigger a single render. ([L167](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L167))
- NowPlaying only updates timing when the displayed second or duration changes; the scrubber animates itself between updates. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/now-playing/NowPlaying.tsx#L185))

### `src/components/payment-method/PaymentMethod.tsx`

- PaymentMethod renders the balance value as a title Text to avoid a <p> inside <p> DOM warning. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/payment-method/PaymentMethod.tsx#L92))

### `src/components/play-bar/VolumeBar.jsx`

- VolumeBar calls volumeChange on mount so the slider renders rounded edges at the default 100% volume. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/VolumeBar.jsx#L68))

### `src/components/play-bar/desktop/PlayBar.tsx`

- Desktop PlayBar only updates timing when the displayed second or duration changes; the scrubber animates between updates. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/desktop/PlayBar.tsx#L116))
- Desktop PlayBar reads position from audioPlayer in skip callbacks so they and their hotkeys don't change on every timing update. ([L221](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/desktop/PlayBar.tsx#L221))

### `src/components/play-bar/desktop/components/VolumeHoverButton.tsx`

- VolumeHoverButton calls volumeChange on mount so the slider renders rounded edges at the default volume. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/desktop/components/VolumeHoverButton.tsx#L87))

### `src/components/play-bar/mobile/PlayBar.tsx`

- Mobile PlayBar puts progress state in PlayBarTrackingBar so 200ms updates only re-render the bar. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/mobile/PlayBar.tsx#L51))

### `src/components/play-bar/queue-button/QueueButton.tsx`

- QueueButton only mounts and loads the queue popover once it has been opened. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/queue-button/QueueButton.tsx#L27))

### `src/components/play-bar/slider/Slider.tsx`

- Slider animates progress with CSS transitions instead of per-tick updates to stay fluid. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/slider/Slider.tsx#L14))
- Slider's onMouseDown bails when a touch drag is active, since browsers fire emulated mouse events after touch. ([L142](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/play-bar/slider/Slider.tsx#L142))

### `src/components/profile-progress/ProfileCompletionPanel.tsx`

- ProfileCompletionPanel disables its tooltip before dismissing so it isn't scaled in the dismiss animation. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/profile-progress/ProfileCompletionPanel.tsx#L51))

### `src/components/queue-popover/QueuePopover.tsx`

- QueuePopover keeps rendering after isVisible turns off so the close animation can play. ([L103](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/queue-popover/QueuePopover.tsx#L103))
- QueuePopover avoids transforms so nested position:fixed children like the dragged queue row keep viewport containing-block semantics. ([L181](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/queue-popover/QueuePopover.tsx#L181))

### `src/components/segmented-progress-bar/SegmentedProgressBar.tsx`

- SegmentedProgressBar nests container, mask and an over-wide segment container so segments fill the mask's rounded corners with a white gap inside the border. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/segmented-progress-bar/SegmentedProgressBar.tsx#L23))
- SegmentedProgressBar uses marginLeft -1 so the first segment isn't cut off. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/segmented-progress-bar/SegmentedProgressBar.tsx#L50))
- SegmentedProgressBar offsets the segment container left by one spacing unit to account for the first segment's width. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/segmented-progress-bar/SegmentedProgressBar.tsx#L63))
- SegmentedProgressBar segments use -1px side margins to reduce aliasing on the skewed edges. ([L79](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/segmented-progress-bar/SegmentedProgressBar.tsx#L79))

### `src/components/share-modal/ShareModal.tsx`

- ShareModal reuses onClose as onClosed because NiceModal unmounts via remove() after the close animation with no separate closed callback. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/share-modal/ShareModal.tsx#L48))

### `src/components/suggested-tracks/SuggestedTracks.tsx`

- SuggestedTracks saves and restores scrollTop when adding a track to prevent scroll-to-top from focus loss when the Add button disables. ([L295](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L295))
- SuggestedTracks restores scroll in a double requestAnimationFrame so it runs after React commits the update. ([L306](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L306))

### `src/components/table/Table.tsx`

- Table adds 24px per column for cell padding in responsive collapse budgeting to avoid clipping before a column is dropped. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/table/Table.tsx#L56))
- Table forces WindowScroller.updatePosition after layout and when row count changes so scroll position is preserved. ([L860](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/table/Table.tsx#L860))

### `src/components/table/columnWidths.ts`

- Table column widths keep minWidth equal to width so responsive budgeting matches the flex-shrink:0 layout floor. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/table/columnWidths.ts#L1))

### `src/components/table/responsiveColumns.ts`

- responsiveColumns uses a column's minWidth first in collapse decisions so columns shrink before they are dropped. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/table/responsiveColumns.ts#L53))

### `src/components/tabs/Tabs.tsx`

- Tabs casts the accent spring setter because react-spring v8 typings don't match its runtime API. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tabs/Tabs.tsx#L171))
- Tabs handles Enter/Space only in controlled mode because NavLink handles activation for routed tabs. ([L313](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tabs/Tabs.tsx#L313))

### `src/components/track-overflow-modal/components/MobileOverflowModal.tsx`

- MobileOverflowModal maps some overflow actions to no-ops because they are implemented in native mobile but not mobile web. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track-overflow-modal/components/MobileOverflowModal.tsx#L109))

### `src/components/track/desktop/CollectionTile.tsx`

- CollectionTile skips toggling play for clicks inside the track menu instead of stopping propagation, so the document listener can close other open menus. ([L225](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/CollectionTile.tsx#L225))

### `src/components/track/desktop/TrackListItem.tsx`

- TrackListItem skips toggling play for clicks inside the track menu instead of stopping propagation, so the document listener can close other open menus. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackListItem.tsx#L121))

### `src/components/track/desktop/TrackTile.tsx`

- Desktop TrackTile uses 176px artwork with the waveform to match the right column's height. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTile.tsx#L168))

### `src/components/track/desktop/TrackTileWaveform.tsx`

- TrackTileWaveform draws nothing until the peaks lookup settles so a real waveform never replaces the fallback shape after it is visible. ([L256](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTileWaveform.tsx#L256))

### `src/components/track/mobile/TrackTile.tsx`

- The mobile TrackTile is also used on desktop, so renderOverflowMenu shims in the desktop overflow menu whenever isMobile is false. ([L196](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/mobile/TrackTile.tsx#L196))

### `src/components/tracks-table/TracksTable.tsx`

- TracksTable shows owners the kind of gating on a track, while fans see whether they have access. ([L671](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tracks-table/TracksTable.tsx#L671))
- TracksTable disables sorting on the Track column when a custom trackNameHeader is supplied so its controls (select-all checkbox) receive clicks instead of toggling sort. ([L1009](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tracks-table/TracksTable.tsx#L1009))
- TracksTable adds its own dense class to the Table wrapper because Table's dense class is scoped to its CSS module and cannot be matched from TracksTable.module.css. ([L1108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/tracks-table/TracksTable.tsx#L1108))

### `src/components/user-generated-text/UserGeneratedTextV2.tsx`

- UserGeneratedTextV2 is hand rolled rather than using linkify-react because it needs custom matchers such as mentions. ([L222](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/user-generated-text/UserGeneratedTextV2.tsx#L222))
- In UserGeneratedTextV2 the email matcher must run before the link matcher so emails are not matched twice. ([L309](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/user-generated-text/UserGeneratedTextV2.tsx#L309))

### `src/hooks/useProfilePicture.ts`

- useProfilePictureSource returns useImageSize's onError so an img render failure advances to the next mirror; preload alone can miss a node that fails the render request. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useProfilePicture.ts#L15))

### `src/hooks/useTrackCoverArt.ts`

- useTrackCoverArt returns no URL while track data is unloaded or the track has no artwork so the previous track's image is never shown. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/hooks/useTrackCoverArt.ts#L59))

### `src/pages/chat-page/ChatPage.tsx`

- ChatPage keeps --chat-composer-height in sync with the composer's real height because the message list scrolls behind the composer and the composer grows with multi-line input and link previews. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/ChatPage.tsx#L76))

### `src/pages/chat-page/components/ChatHeader.tsx`

- ChatHeader's title and tabs rows plus padding exactly fill the 112px --chat-header-height so list offsets stay unchanged. ([L94](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatHeader.tsx#L94))

### `src/pages/chat-page/components/ChatListItem.tsx`

- ChatListItem keeps the row as a single native button with the options trigger as a sibling so the row keeps its accessible name and click. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ChatListItem.tsx#L55))

### `src/pages/chat-page/components/ReactionPopupMenu.tsx`

- ReactionPopupMenu flips side to side when possible and, if both sides clip in the nearest horizontal clipping container, places the popup below the trigger and scales it to fit. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/chat-page/components/ReactionPopupMenu.tsx#L95))

### `src/pages/contest-page/components/ContestStemsCard.tsx`

- StemCountPill in ContestStemsCard is border-only with no background fill, because a surface2 fill caused a dark-mode contrast bug. ([L376](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L376))

### `src/pages/contest-page/components/desktop/ContestPage.tsx`

- The desktop ContestPage hero height clamps between 220 and 288 using cqi units on the named 'contest' container so it tracks real content width (collapsed sidebar, resizable nav) rather than the viewport. ([L100](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L100))
- The desktop ContestPage uses container-query breakpoints to stack header and details columns when the shell is narrow, instead of viewport-based useIsMobile; mobile web uses a separate file. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L108))
- The ContestPage public header renders follow as a regular small Button rather than FollowButton so its height matches the Enter Contest CTA. ([L399](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L399))

### `src/pages/contests-page/RunYourOwnContestBanner.tsx`

- RunYourOwnContestBanner is fixed in a portal on the main content container, offset by nav width and play bar height, so it stays reachable while scrolling; dismissal is session-only. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contests-page/RunYourOwnContestBanner.tsx#L29))

### `src/pages/dashboard-page/components/TotalPlaysChart.jsx`

- TotalPlaysChart updates the chart after document.fonts.ready because chart.js measures axis label text via canvas and would size labels wrong before fonts load. ([L243](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/dashboard-page/components/TotalPlaysChart.jsx#L243))

### `src/pages/fan-club-detail-page/FanClubDetailContent.tsx`

- FanClubDetailContent keeps the sidebar fixed width and lets the main column shrink until both are equal width, then collapses to a single column. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-club-detail-page/FanClubDetailContent.tsx#L15))

### `src/pages/fan-club-detail-page/components/FanClubInfoSection.tsx`

- OnchainMetricValue in FanClubInfoSection sets regular weight explicitly because Harmony's body text defaults to medium, which is too heavy for data values. ([L382](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/fan-club-detail-page/components/FanClubInfoSection.tsx#L382))

### `src/pages/library-page/components/mobile/LibraryPage.tsx`

- Mobile LibraryPage's useOffsetScroll sets the content height to content plus SCROLL_HEIGHT and scrolls on mount so the filter input sits hidden under the top bar until the user scrolls up. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/components/mobile/LibraryPage.tsx#L110))
- Mobile LibraryPage sets node.style.height = null (with @ts-expect-error) because null is valid at runtime to unset the height even though the TS type disallows it. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/components/mobile/LibraryPage.tsx#L122))
- Mobile LibraryPage scrolls past the filter input once initial load completes; otherwise the scroll position ends up in the wrong place. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/components/mobile/LibraryPage.tsx#L162))
- Mobile LibraryPage recalculates container height only when result length or loading/empty/list state changes; exhaustive-deps is disabled deliberately. ([L175](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/components/mobile/LibraryPage.tsx#L175))

### `src/pages/profile-page/components/DeactivatedProfileTombstone.tsx`

- DeactivatedProfileTombstone uses flex:1 on mobile web where the page fills the viewport, and a clamp min-height on desktop where the page is content-sized, so the message reads as a centered empty state. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/DeactivatedProfileTombstone.tsx#L25))

### `src/pages/profile-page/components/desktop/ContestsTab.tsx`

- Profile ContestsTab cards flex between 280px and 480px without JS breakpoints, but a lone contest card expands to full width because capping at 480px left an awkward gap. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/desktop/ContestsTab.tsx#L67))

### `src/pages/profile-page/components/mobile/ProfilePage.tsx`

- Mobile ProfilePage renders DeactivatedProfileTombstone as a direct child of the flex-column page container so its flex:1 can claim the space below the header. ([L434](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/mobile/ProfilePage.tsx#L434))

### `src/pages/search-explore-page/components/desktop/Carousel.tsx`

- Explore Carousel adds internal vertical padding because the scroll container clips overflow, which would otherwise cut card shadows and hover states between carousels. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/Carousel.tsx#L60))
- Explore Carousel scrolls by nearly one viewport of rail content rather than a fixed pixel jump so navigation stays aligned across responsive widths. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/Carousel.tsx#L69))
- Explore Carousel uses negative horizontal margins with matching padding so edge clipping stays aligned while leaving room for card shadows. ([L162](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/Carousel.tsx#L162))

### `src/pages/settings-page/components/desktop/DeveloperApps/CreateNewAppPage.tsx`

- CreateNewAppPage leaves imageUrl undefined rather than empty string in initial values so the optional URL field passes validation. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/settings-page/components/desktop/DeveloperApps/CreateNewAppPage.tsx#L63))

### `src/pages/track-page/components/shared/TrackContestsSection.tsx`

- TrackContestsSection cards flex from 280px up to 480px without JS breakpoints, and a single contest card expands edge to edge instead of being capped. ([L62](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/track-page/components/shared/TrackContestsSection.tsx#L62))

### `src/utils/clientUtil.ts`

- clientUtil isMobile honors localStorage **FORCE_MOBILE**='1' so engineers can preview mobile web from desktop without DevTools device mode. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L34))
- clientUtil isMobile relies only on the User-Agent so mobile 'Request Desktop Site' serves desktop, avoiding iPadOS/touchPoints heuristics that would override that choice. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L47))
- clientUtil getMobileOS checks Windows Phone first because its User-Agent also contains 'Android'. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L102))

### `src/utils/lottieTheme.ts`

- utils/lottieTheme recolors Lottie JSON at runtime for each palette and mode instead of shipping separate assets per theme. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/lottieTheme.ts#L1))

### `src/utils/styleUtils.ts`

- styleUtils backgroundOverlay draws the overlay on a ::before pseudo element so its opacity does not affect children or the element background. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/styleUtils.ts#L8))

### `src/utils/theme/theme.ts`

- theme getThemeFromStorage treats the legacy stored value 'default' as Theme.AUTO. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/theme/theme.ts#L45))

### `src/utils/zIndex.ts`

- zIndex SVG_BUTTON_ICONS exists because Harmony button icons use a z-index that can place them above elements promoted to GPU layers. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/zIndex.ts#L13))
- zIndex EDIT_TRACK_MODAL and similar are 1000 to leave room for nested modals inside them, which take a higher z-index. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/zIndex.ts#L37))

### `src/workers/dominantColor.worker.js`

- dominantColor.worker clamps colors above luminance 201 (#CDC8C8) because that is the brightest background with acceptable contrast for white text. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/workers/dominantColor.worker.js#L7))
