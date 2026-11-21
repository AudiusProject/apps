# 0025. Contests, uploads and content on mobile

- Status: Accepted
- Date: 2026-11-21

## Context

Remix contests, comments, uploads, profile, library, feed, trending and explore. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/components/contest-card/ContestCard.tsx`

- ContestCard prefers the contest's own cover photo over the parent track artwork, matching the contest screen header fallback order. ([L256](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/contest-card/ContestCard.tsx#L256))
- ContestCard skips contests hosted by deactivated users because the API can still surface tombstoned host accounts, matching the web filter. ([L284](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/contest-card/ContestCard.tsx#L284))

### `src/components/edit/PriceAndAudienceField/PriceAndAudienceScreen.tsx`

- PriceAndAudienceScreen memoizes previousStreamConditions with empty deps so it keeps the stream conditions as they were when the screen opened. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/edit/PriceAndAudienceField/PriceAndAudienceScreen.tsx#L93))

### `src/components/host-remix-contest-drawer/HostRemixContestDrawer.tsx`

- HostRemixContestDrawer spreads the existing eventData on update because the indexer replaces event_data wholesale and fields the form does not edit would otherwise be dropped. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/host-remix-contest-drawer/HostRemixContestDrawer.tsx#L148))

### `src/components/overflow-menu-drawer/OverflowMenuDrawer.tsx`

- OverflowMenuDrawer shows 'View Comments' without a number when commentCount is undefined, deliberately avoiding an incorrect 0 count. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/components/overflow-menu-drawer/OverflowMenuDrawer.tsx#L73))

### `src/hooks/useEnterContest.ts`

- useEnterContest wraps the shared common hook to handle React Native's File shape (data stored on \_data) and the Upload navigator push, while metadata comes from @audius/common. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useEnterContest.ts#L8))
- useEnterContest continues to the upload flow without artwork if pre-filling the contest artwork fails, since artwork is only a pre-fill. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useEnterContest.ts#L38))

### `src/hooks/useSetTrackAvailabilityFields.ts`

- useSetEntityAvailabilityFields uses Formik useField, so it only works inside a Formik form context such as the upload/edit track form. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/hooks/useSetTrackAvailabilityFields.ts#L20))

### `src/screens/collection-screen/CollectionScreenDetailsTile.tsx`

- CollectionScreenDetailsTile only enables useCollection when collectionId is a number because smart collections use non-numeric ids; the -1 placeholder never triggers a request. ([L195](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/collection-screen/CollectionScreenDetailsTile.tsx#L195))

### `src/screens/contest-screen/ContestCommentsList.tsx`

- ContestCommentsList 'updates' mode shows only host top-level posts with an owner-only composer; 'comments' mode shows everything else with a composer for all signed-in users. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L67))
- ContestCommentsList wires useEventComments/usePostEventComment directly instead of CommentSectionProvider, CommentBlock or CommentForm because those depend on track state that events do not populate. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L84))
- ContestCommentsList only offers the Top/Newest sort for comments; host Updates are always newest-first, matching the web tile. ([L111](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L111))
- In ContestCommentsList comments mode the host gets no top-level composer (they reply, and post announcements in Updates); in updates mode only the host can compose. ([L130](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L130))
- ContestCommentsList increments messageId after submit to clear ComposerInput, the same pattern as the track comment form. ([L142](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L142))
- ContestCommentsList filters feed items by mode from the primed React Query cache up front so the empty state renders when every row would be filtered out. ([L160](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L160))
- ContestCommentsList keeps a row whose comment is not yet cached; ContestCommentRow applies the mode filter once it resolves (rare since primeCommentData runs synchronously). ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L171))
- ContestCommentsList omits entityId/entityType on ComposerInput because it assumes a track and reads track.access.stream, which crashes for an event id; without them it is a plain mentions/text input. ([L211](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L211))
- ContestCommentRow disallows replies on host post-updates because they are announcements, not threads. ([L351](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L351))
- ContestCommentRow deletes optimistically from the event comment caches because useDeleteComment's onMutate only updates track caches, so deleted rows reappeared until refetch. ([L379](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestCommentsList.tsx#L379))

### `src/screens/contest-screen/ContestFollowersScreen.tsx`

- ContestFollowersScreen requests useEventFollowers with limit 100 because the hook is unpaginated and larger limits return an empty list from the indexer. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestFollowersScreen.tsx#L12))

### `src/screens/contest-screen/ContestHero.tsx`

- ContestHero renders a raw Image sized manually because TrackImage's Artwork layout forces a square aspect, and it stretches on overscroll like ProfileCoverPhoto to avoid a white gap. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestHero.tsx#L15))
- ContestHero prefers the contest's own coverPhotoUrl over the parent track artwork, the same fallback order as web and contest cards. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestHero.tsx#L49))
- ContestHero reads useCurrentTabScrollY rather than ContestScrollContext because it lives inside Tabs.Container where the per-tab hook is authoritative; the context is for siblings outside. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestHero.tsx#L57))
- ContestHero omits overflow hidden so the scaled cover bleeds upward on pull-to-refresh; downward bleed is covered by the next sibling's white background, and pointerEvents none passes touches to the scroll view. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestHero.tsx#L84))

### `src/screens/contest-screen/ContestPageContext.tsx`

- ContestPageContext lets ContestScreen fetch contest data once and pass it to tab bodies, since CollapsibleTabNavigator renders each tab as its own React tree. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestPageContext.tsx#L6))

### `src/screens/contest-screen/ContestScreen.tsx`

- EmptyTabIcon is a null icon because collapsibleTabScreen always renders an Icon above the label, while the contest tab bar is text-only. ([L146](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L146))
- ContestScreen hides the Updates tab from non-hosts until the host has a top-level post update; the host always sees it to compose. ([L184](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L184))
- ContestScreen renders Stems and Downloads only when the track has downloads because DownloadSection's file-size query errors otherwise. ([L257](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L257))
- ContestScreen hides the stack header in useLayoutEffect placed before any early return so hook order is stable; the in-hero back button is the only back affordance. ([L299](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L299))
- ContestScreen shows a loading follow button until follow state loads to avoid flashing Follow before Following. ([L417](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScreen.tsx#L417))

### `src/screens/contest-screen/ContestScrollContext.tsx`

- ContestScrollContext exposes the current tab scroll value to components outside Tabs.Container, such as ContestNavOverlay, where useCurrentTabScrollY is unavailable. ([L8](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScrollContext.tsx#L8))
- ContestScrollBridge must be rendered inside the collapsible header (inside Tabs.Container) so useCurrentTabScrollY resolves. ([L21](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestScrollContext.tsx#L21))

### `src/screens/contest-screen/ContestStemsCard.tsx`

- ContestStemsCard auto-follows the contest when a signed-in user starts a stem download, firing on tap because the download flow exposes no success callback; the follow is optimistic. ([L120](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/ContestStemsCard.tsx#L120))

### `src/screens/contest-screen/tabs/ContestSubmissionsTab.tsx`

- ContestSubmissionsTab calls loadCachedDataIntoLineup once tan-query data arrives because useRemixesLineup disables automatic cache handling, which otherwise leaves the Redux lineup empty for a tick and blanks the list. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/tabs/ContestSubmissionsTab.tsx#L31))
- ContestSubmissionsTab gets the submissions total from a count-only query so it matches the contest card instead of growing while scrolling. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/tabs/ContestSubmissionsTab.tsx#L97))
- ContestSubmissionsTab delineator keys are the lineup index the label renders after ([original, ...winners, ...remixes]); the map is memoized because it feeds TanQueryLineup renderItem deps. ([L150](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/tabs/ContestSubmissionsTab.tsx#L150))

### `src/screens/contest-screen/useContestScrollStatusBar.ts`

- useContestScrollStatusBar applies the bar style for the restored scroll position on focus because the animated reaction only fires on change. ([L60](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/useContestScrollStatusBar.ts#L60))
- useContestScrollStatusBar re-applies the scrolled bar style when the theme changes, otherwise the status bar keeps the old mode until scrolling crosses the threshold. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/contest-screen/useContestScrollStatusBar.ts#L97))

### `src/screens/edit-profile-screen/FanClubFlairSelector.tsx`

- FanClubFlairSelector adds the currently selected badge coin to the options so it stays selectable after the user switches to Highest Balance or None. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-profile-screen/FanClubFlairSelector.tsx#L66))

### `src/screens/edit-track-screen/EditTrackModalScreen.tsx`

- EditTrackModalScreen loads useTrackCollaboratorsForEdit because the cached track can omit pending collaborator invites, and saving without them would delete those invites. ([L34](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-track-screen/EditTrackModalScreen.tsx#L34))

### `src/screens/edit-track-screen/EditTrackScreen.tsx`

- EditTrackScreen validation does its checks inside zod refine functions because refines only run after the base object passes, which would otherwise surface errors one at a time. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-track-screen/EditTrackScreen.tsx#L48))

### `src/screens/edit-track-screen/screens/AdvancedScreen.tsx`

- AdvancedScreen turns off feedback requests when comments are disabled because feedback is delivered as comments. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/edit-track-screen/screens/AdvancedScreen.tsx#L31))

### `src/screens/explore-screen/components/TrendingGenres.tsx`

- TrendingGenres filters genre suggestions to those with a count because only ranked popular genres have one; merged static genres do not. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/explore-screen/components/TrendingGenres.tsx#L38))

### `src/screens/feed-screen/FeedScreen.tsx`

- FeedScreen tabOrder must match the tab order rendered by FeedTabs; swiping left advances to Latest and right returns to For You. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L50))
- FeedScreen mirrors PagerView's on-screen page in currentPageRef so programmatic page changes only happen when state and pager actually diverge. ([L137](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L137))
- FeedScreen moves the pager to the persisted feed tab, which loads asynchronously after mount, and for header taps, without interfering with swipes. ([L174](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L174))
- FeedScreen tracks each pager page's scroll offset because both lineups stay mounted with their own positions, so the glass chrome can adopt the incoming page's offset. ([L183](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L183))
- FeedScreen renders For You from trackIds only, dropping playlist/album tiles, because the feed/for-you endpoint has no tracks-only param; pagination still counts full backend pages. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/feed-screen/FeedScreen.tsx#L233))

### `src/screens/library-screen/TracksTab.tsx`

- TracksTab merges fetched saved-track ids with localAdditions so optimistic favorites, reposts and purchases appear before the server page includes them. ([L149](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/library-screen/TracksTab.tsx#L149))
- TracksTab reads playback state from the store at press time so play/pause/skip do not re-render the whole list. ([L224](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/library-screen/TracksTab.tsx#L224))
- TracksTab keeps the list and filter input mounted with an inline empty state while filtering so the input does not lose focus mid-typing. ([L309](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/library-screen/TracksTab.tsx#L309))

### `src/screens/profile-screen/ProfileCoverPhoto.tsx`

- Profile screen components read the user via useUserByParams from the route-params cache instead of useProfileUser, because useProfileUser depends on Redux state set in a focus effect that races the first render and causes late pop-in and layout shift. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileCoverPhoto.tsx#L47))

### `src/screens/profile-screen/ProfileHeader/ProfileHeader.tsx`

- Profile screen components read the user via useUserByParams from the route-params cache instead of useProfileUser, because useProfileUser depends on Redux state set in a focus effect that races the first render and causes late pop-in and layout shift. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileHeader/ProfileHeader.tsx#L41))

### `src/screens/profile-screen/ProfileInfo.tsx`

- Profile screen components read the user via useUserByParams from the route-params cache instead of useProfileUser, because useProfileUser depends on Redux state set in a focus effect that races the first render and causes late pop-in and layout shift. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/profile-screen/ProfileInfo.tsx#L42))

### `src/screens/search-screen/SearchFilters.tsx`

- SearchFilters prepends the current genre as an option when it is a freeform genre not in GENRES, otherwise FilterButton can't resolve a label and the active chip just reads 'Genre'. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/search-screen/SearchFilters.tsx#L52))

### `src/screens/trending-screen/TrendingFilterChips.tsx`

- TrendingFilterChips don't reset the lineup when clearing filters because timeRange and genre are in the tanquery key, so a new query fires automatically. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingFilterChips.tsx#L41))

### `src/screens/trending-screen/TrendingLineup.tsx`

- TrendingLineup shows skeletons instead of a persisted trending snapshot that was already stale (older than the 5-minute default staleTime) at session start, until its refetch lands, to avoid showing an old order then reshuffling; on refetch failure the snapshot is shown. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingLineup.tsx#L25))
- TrendingLineup shows skeletons instead of a persisted trending snapshot that was already stale (older than the 5-minute default staleTime) at session start, until its refetch lands, to avoid showing an old order then reshuffling; on refetch failure the snapshot is shown. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingLineup.tsx#L28))
- TrendingLineup updates the redux active time range on tabPress because the filter UI components read it from redux. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingLineup.tsx#L61))
- TrendingLineup shows skeletons instead of a persisted trending snapshot that was already stale (older than the 5-minute default staleTime) at session start, until its refetch lands, to avoid showing an old order then reshuffling; on refetch failure the snapshot is shown. ([L91](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/trending-screen/TrendingLineup.tsx#L91))

### `src/screens/upload-screen/screens/UploadingTracksScreen.tsx`

- UploadingTracksScreen tracks uploadStarted because the upload error is reset asynchronously after mount, so it must distinguish errors that arrived after this attempt began. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/upload-screen/screens/UploadingTracksScreen.tsx#L69))

### `src/screens/weekly-rotation-screen/WeeklyRotationScreen.tsx`

- WeeklyRotationScreen does not paginate because the weekly rotation endpoint always returns a fixed 30 tracks. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/mobile/src/screens/weekly-rotation-screen/WeeklyRotationScreen.tsx#L56))
