# 0017. Discovery, notifications and analytics on web

- Status: Accepted
- Date: 2026-11-21

## Context

Trending, explore, search, feed, Weekly Rotation, notifications, sharing and analytics. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `src/common/store/social/tracks/sagas.ts`

- watchShareContest builds the share URL as the parent track permalink plus /contest so the recipient lands on the same contest page the sender is on. ([L730](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/social/tracks/sagas.ts#L730))

### `src/common/store/social/users/sagas.ts`

- followUser fetches and caches the followed user before following so does_current_user_follow is correct before the follow is indexed. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/social/users/sagas.ts#L56))

### `src/components/first-upload-modal/FirstUploadModal.tsx`

- FirstUploadModal's tweet text omits the link because Twitter appends it automatically. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/first-upload-modal/FirstUploadModal.tsx#L29))

### `src/components/lineup/TrackLineup.tsx`

- TrackLineup stamps feedType onto queue entries and PLAYBACK_PLAY events as feed_type so plays can be attributed to a feed view. ([L104](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/lineup/TrackLineup.tsx#L104))

### `src/components/notification/Notification/ChallengeRewardNotification.tsx`

- ChallengeRewardNotification hides trending-playlist (tp) rewards because the legacy API may still send them. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/ChallengeRewardNotification.tsx#L93))

### `src/components/notification/Notification/CommentNotification.tsx`

- CommentNotification labels remix-contest comments as 'remix contest' because they resolve through the underlying track and would otherwise read wrong. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/CommentNotification.tsx#L33))

### `src/components/notification/Notification/FanRemixContestStartedNotification.tsx`

- FanRemixContestStartedNotification fetches the host user directly when the contest track was deleted and the entity hook returns null. ([L42](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/FanRemixContestStartedNotification.tsx#L42))

### `src/components/notification/Notification/RemixCreateNotification.tsx`

- RemixCreateNotification fetches child and parent tracks directly because their ids are not in the notification entities list. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/RemixCreateNotification.tsx#L41))

### `src/components/notification/Notification/TrackCollaboratorInviteNotification.tsx`

- TrackCollaboratorInviteNotification falls back to 'a track' because a pending collaborator can't load a private track. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/TrackCollaboratorInviteNotification.tsx#L30))
- TrackCollaboratorInviteNotification renders as long as the inviter loads; accept/decline act on the notification's trackId even if the track is private. ([L117](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/TrackCollaboratorInviteNotification.tsx#L117))

### `src/components/notification/Notification/TrendingGenreNotification.tsx`

- TrendingGenreNotification is hidden when its flag is off because the server sends it regardless. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/TrendingGenreNotification.tsx#L31))

### `src/components/notification/Notification/WeeklyArtistRecapNotification.tsx`

- WeeklyArtistRecapNotification is hidden when its flag is off because the server sends it regardless. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/WeeklyArtistRecapNotification.tsx#L27))

### `src/components/notification/Notification/WeeklyRotationNotification.tsx`

- WeeklyRotationNotification is hidden when its flag is off because the server sends it regardless. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/WeeklyRotationNotification.tsx#L27))

### `src/components/notification/Notification/components/EntityLink.tsx`

- EntityLink rewrites Event-typed comment links from /handle/slug to /handle/contest/slug because those entities resolve to the contest's underlying track. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/components/EntityLink.tsx#L45))

### `src/components/notification/Notification/utils.ts`

- Notification utils map Entity.Event to the TRACK user list type because event comment notifications resolve through the contest track. ([L35](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/notification/Notification/utils.ts#L35))

### `src/components/search-bar/DesktopSearchBar.tsx`

- DesktopSearchBar appends View More to the last option group to avoid extra spacing between groups. ([L246](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/search-bar/DesktopSearchBar.tsx#L246))
- DesktopSearchBar delays closing the menu 200ms on blur so clicks on menu items still register. ([L504](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/search-bar/DesktopSearchBar.tsx#L504))

### `src/components/share-modal/ShareModal.tsx`

- ShareModal routes contest copy-link through shareContest, which copies the /contest URL instead of the track permalink. ([L101](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/share-modal/ShareModal.tsx#L101))

### `src/components/share-modal/utils.ts`

- Share utils record contest shares as track events because there is no contest kind and the parent track is credited for engagement. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/share-modal/utils.ts#L55))

### `src/components/trending-genre-selection/TrendingGenreSelectionPage.tsx`

- TrendingGenreSelectionPage relies on the trending query key including the genre to refetch, so no explicit lineup reset is dispatched on genre change. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/trending-genre-selection/TrendingGenreSelectionPage.tsx#L29))

### `src/components/weekly-rotation/WeeklyRotationBanner.tsx`

- WeeklyRotationBanner fires its view event once and only when the mix has tracks, so hidden banners do not count as impressions. ([L80](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/weekly-rotation/WeeklyRotationBanner.tsx#L80))

### `src/components/withdraw-usdc-modal/WithdrawUSDCModal.tsx`

- TrackFormErrors in WithdrawUSDCModal only sends an error event the first time an error appears after a value change, not on every invalid edit. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/withdraw-usdc-modal/WithdrawUSDCModal.tsx#L51))

### `src/pages/contest-page/components/desktop/ContestPage.tsx`

- ContestPage opens the share modal with type 'contest' so copy-link and X share use the {permalink}/contest URL rather than the parent track. ([L373](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L373))

### `src/pages/feed-page/components/desktop/FeedPageContent.tsx`

- Desktop FeedPageContent uses a larger load-more page size (10) than the mobile-tuned default so successive loads keep up with fast trackpad/wheel scrolling. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/feed-page/components/desktop/FeedPageContent.tsx#L43))
- Desktop FeedPageContent passes the mixed LineupData (tracks plus collection reposts) from both feed hooks to TrackLineup, which renders collections inline wherever the backend places them. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/feed-page/components/desktop/FeedPageContent.tsx#L121))

### `src/pages/search-explore-page/components/desktop/TrendingGenresSection.tsx`

- TrendingGenresSection filters genres by a defined count because only ranked popular genres carry a count while merged static genres do not. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/TrendingGenresSection.tsx#L33))
- TrendingGenresSection hides itself when no ranked genres exist, which covers an empty response or a failed request that fell back to the static genre list. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/TrendingGenresSection.tsx#L41))

### `src/pages/search-page/BpmFilter.tsx`

- BpmFilter stops click propagation inside the range popup so clicks in the inputs do not accidentally close the filter popup. ([L195](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-page/BpmFilter.tsx#L195))

### `src/pages/search-page/SearchFilters.tsx`

- SearchFilters adds the current genre as an option when it is a freeform genre not in GENRES, otherwise the FilterButton chip falls back to the generic Genre label. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-page/SearchFilters.tsx#L64))

### `src/pages/trending-page/components/GenreSelectionList.tsx`

- GenreSelectionList shows topGenres by default while treating genres as the searchable superset, so long-tail genres stay discoverable via search. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/GenreSelectionList.tsx#L37))

### `src/pages/trending-page/components/desktop/TrendingGenreFilters.tsx`

- TrendingGenreFilters remembers the last genre picked from the modal so it stays rendered as a button even after the user selects a preset genre. ([L29](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingGenreFilters.tsx#L29))

### `src/pages/trending-page/components/desktop/TrendingPageContent.tsx`

- Desktop TrendingPageContent tracks timeRange/genre combinations known to be empty so it can skip to the next non-empty tab without refetching. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L68))
- Desktop TrendingPageContent scrolls mainContent to top on category change because the lineup swaps underneath while the outer scroll parent keeps its position. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L96))
- Desktop TrendingPageContent uses a load-more page size of 10 instead of the mobile-tuned default so load-mores keep up with fast trackpad or wheel scrolling. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L122))
- Desktop TrendingPageContent lets a ?genre= URL param override the redux genre left from an earlier visit, otherwise arriving from Explore with a genre would show the previous filter; without a param redux wins. ([L166](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L166))
- Desktop TrendingPageContent skips the first genre URL sync when the URL carried a genre, because redux has not caught up and writing it back would clobber the incoming param. ([L192](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L192))
- Desktop TrendingPageContent routes genres through toTrendingGenreValue so freeform community genres are kept while the all-genres sentinel maps to null. ([L235](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L235))
- Desktop TrendingPageContent marks every equally or more restrictive time range empty when auto-advancing tabs, so it does not bounce back to an empty range. ([L245](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/TrendingPageContent.tsx#L245))

### `src/pages/trending-page/components/desktop/WinnersView.tsx`

- WinnersView caps next-week navigation at the most recent passed Friday because winners are selected at 12PM PT on Fridays, so upcoming weeks never show. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/WinnersView.tsx#L40))
- WinnersView compares weeks as YYYY-MM-DD strings when gating next navigation to avoid timezone and granularity edge cases with dayjs comparisons. ([L110](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/desktop/WinnersView.tsx#L110))

### `src/pages/trending-page/components/mobile/TrendingPageContent.tsx`

- Mobile TrendingPageContent lets a ?genre= URL param override the redux genre left from an earlier visit, otherwise arriving from Explore with a genre would show the previous filter; without a param redux wins. ([L148](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/mobile/TrendingPageContent.tsx#L148))
- Mobile TrendingPageContent skips the first genre URL sync when the URL carried a genre, because redux has not caught up and writing it back would clobber the incoming param. ([L172](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/components/mobile/TrendingPageContent.tsx#L172))

### `src/pages/trending-page/utils.ts`

- isValidGenre accepts any non-empty non-sentinel genre because freeform genres are normalized server-side, so URL params like ?genre=Hyper+Pop restore instead of being dropped. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/trending-page/utils.ts#L39))

### `src/pages/weekly-rotation-page/WeeklyRotationPage.tsx`

- WeeklyRotationPage is assembled from History page pieces with bundled artwork because the mix is not backed by a collection entity with a playlist_id, and the endpoint returns a fixed 30 tracks so there is no pagination. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/weekly-rotation-page/WeeklyRotationPage.tsx#L75))
- WeeklyRotationPage stays registered while the feature flag is off so shared links redirect to Explore instead of 404ing. ([L98](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/weekly-rotation-page/WeeklyRotationPage.tsx#L98))
- WeeklyRotationPage fires its view analytics event once the mix resolves rather than on mount so trackCount and status are real. ([L126](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/weekly-rotation-page/WeeklyRotationPage.tsx#L126))
- WeeklyRotationPage renders nothing until remote config loads so an enabled user is not redirected to Explore on the first frame. ([L230](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/weekly-rotation-page/WeeklyRotationPage.tsx#L230))

### `src/services/analytics/amplitude.test.ts`

- amplitude tests stub navigator.webdriver to false because the test DOM reports itself as automated, which would disable analytics as a bot. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/analytics/amplitude.test.ts#L36))

### `src/services/analytics/amplitude.ts`

- amplitude disables itself for likely bots because crawlers load pages but never use them, which wastes the event quota. ([L17](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/analytics/amplitude.ts#L17))
- amplitude init explicitly lists defaultTracking options because omitted ones default on; sessions are still derived from session ids without automatic events, and attribution stays on for utm/referrer properties. ([L99](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/analytics/amplitude.ts#L99))
- amplitude init sends the client user property only when it changes for this device, tracked in local storage, to save event quota. ([L116](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/analytics/amplitude.ts#L116))
- amplitude identify skips sending traits identical to the last ones since user properties persist, but keys the cache by week so traits are resent weekly in case one was dropped. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/services/analytics/amplitude.ts#L155))

### `src/store/account/sagas.ts`

- store/account sagas cannot request Safari push permission from a saga; it must be initiated by a user action in a component. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/store/account/sagas.ts#L138))

### `src/utils/clientUtil.ts`

- clientUtil isLikelyBot excludes 'cubot' because Cubot is a phone brand whose UA matches the bot regex. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/utils/clientUtil.ts#L68))
