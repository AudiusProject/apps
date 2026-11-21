# 0016. Tracks, collections, uploads and contests on web

- Status: Accepted
- Date: 2026-11-21

## Context

Upload and edit flows, collection pages and editing, library, profile, dashboard, comments and remix contests. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `e2e/uploadTrack.test.ts`

- uploadTrack.test asserts a single enabled audience radio because remixes may only be released as public tracks. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/e2e/uploadTrack.test.ts#L92))

### `src/common/store/cache/collections/addTrackToPlaylistSaga.ts`

- addTrackToPlaylistSaga getCurrentTimestamp returns seconds because client-generated playlist entry timestamps are expected in seconds. ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/addTrackToPlaylistSaga.ts#L53))
- addTrackToPlaylistSaga sets metadata_time to the user-facing add time so tracks added at the same time or in the same block can be told apart. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/addTrackToPlaylistSaga.ts#L102))
- Playlist confirmer success callbacks write the local playlist instead of refetching, because the backend may not have propagated and a refetch would overwrite the optimistic cache with stale data. ([L194](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/addTrackToPlaylistSaga.ts#L194))

### `src/common/store/cache/collections/commonSagas.ts`

- commonSagas getHiddenTracks counts only unlisted tracks that are not scheduled releases, separating deliberately hidden tracks from pre-releases. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L77))
- confirmPublishHiddenTracks asks before starting the publish write because the result is applied inside a confirmer callback that serializes collection writes, and blocking there would hold the queue while the modal is open. ([L83](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L83))
- publishHiddenChildTracks publishes deliberately hidden tracks only when confirmed, and publishes scheduled tracks only as an early release where the collection is scheduled and all its tracks are scheduled. ([L118](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L118))
- removeTrackFromPlaylistAsync skips the full lineup refresh because the UI already dispatched a lineup remove, preserving scroll position. ([L381](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L381))
- removeTrackFromPlaylist's confirmer success writes the local playlist instead of refetching, because a lagging backend would make removed tracks reappear. ([L423](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L423))
- publishPlaylistAsync calls confirmPublishHiddenTracks before the write starts so the modal never holds the collection's confirmer queue. ([L558](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/commonSagas.ts#L558))

### `src/common/store/cache/collections/confirmOrderPlaylist.ts`

- Playlist confirmer success callbacks write the local playlist instead of refetching, because the backend may not have propagated and a refetch would overwrite the optimistic cache with stale data. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/confirmOrderPlaylist.ts#L38))

### `src/common/store/cache/collections/createPlaylistSaga.ts`

- createPlaylistSaga merges the confirmed playlist with the optimistic one, preferring optimistic data in case other unconfirmed edits were made. ([L198](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/createPlaylistSaga.ts#L198))

### `src/common/store/cache/collections/publishHiddenChildTracks.test.ts`

- The publishHiddenChildTracks test expects native mobile to skip the prompt because mobile has no drawer for it and would block forever. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/publishHiddenChildTracks.test.ts#L122))
- The publishHiddenChildTracks test shows a scheduled collection with a non-scheduled hidden track is not an early release, so scheduled tracks stay hidden. ([L155](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/publishHiddenChildTracks.test.ts#L155))

### `src/common/store/cache/collections/utils/hasPendingPlaylistUpdates.ts`

- hasPendingPlaylistUpdates returns true while confirmer calls are pending, meaning use the optimistic cache; when done, refetch to pick up other tabs' changes. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/utils/hasPendingPlaylistUpdates.ts#L12))
- isPlaylistConfirmerDone gates success-callback cache writes so one operation does not overwrite another's optimistic state. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/cache/collections/utils/hasPendingPlaylistUpdates.ts#L26))

### `src/common/store/pages/track/sagas.ts`

- watchTrackPageMakePublic leaves collaborators out of the update metadata so pending collaborator invites are untouched. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/pages/track/sagas.ts#L56))

### `src/common/store/profile/sagas.js`

- profile sagas convert base64 cover photos to files because the native app sends images as base64. ([L107](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/profile/sagas.js#L107))
- After profile update confirmation, the user query is invalidated to fetch processed image sizes and the computed fan_club_badge from the server. ([L154](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/profile/sagas.js#L154))

### `src/common/store/saved-collections/sagas.ts`

- fetchAllAccountCollections fetches full details for every saved collection in parallel and should only be used when track lists are really needed. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/saved-collections/sagas.ts#L27))

### `src/common/store/social/collections/sagas.ts`

- watchSaveCollection optimistically clears the playlist's has-updates badge because saving a playlist counts as viewing it. ([L340](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/social/collections/sagas.ts#L340))

### `src/common/store/social/tracks/sagas.ts`

- downloadTracks treats the first track in the list as the parent track when downloading a track with its stems. ([L537](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/common/store/social/tracks/sagas.ts#L537))

### `src/components/bulk-edit-tracks/BulkEditTracksModal.tsx`

- BulkEditTracksModal stores the edited tracks with the result so the result view survives the caller clearing selection. ([L292](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/bulk-edit-tracks/BulkEditTracksModal.tsx#L292))

### `src/components/collection/desktop/CollectionHeader.tsx`

- CollectionHeader shows InlineAlbumPriceAndAudience in place of the gated-content banner while an album is being edited, until Apply. ([L316](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/CollectionHeader.tsx#L316))

### `src/components/collection/desktop/EditButton.tsx`

- EditButton toggles inline edit mode when a PlaylistEditMode provider exists, otherwise links to the legacy /edit page so other call sites still work. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/EditButton.tsx#L43))

### `src/components/collection/desktop/edit-mode/EditModeNavigationGuard.tsx`

- EditModeNavigationGuard stops blocking navigation once status is saving so the post-save redirect is allowed. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/EditModeNavigationGuard.tsx#L23))

### `src/components/collection/desktop/edit-mode/InlineAlbumPriceAndAudience.tsx`

- InlineAlbumPriceAndAudience uses a local form whose shape mirrors the edit page's Formik form so PriceAndAudienceField behaves identically, including its confirmation modal. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/InlineAlbumPriceAndAudience.tsx#L15))
- PriceAndAudienceField writes download-gate fields, but albums don't persist them, so InlineAlbumPriceAndAudience keeps them only in its local form. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/InlineAlbumPriceAndAudience.tsx#L23))
- AccessDraftSync pushes access fields from the local form into the edit-mode draft so Apply persists them with other staged edits. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/InlineAlbumPriceAndAudience.tsx#L36))
- AccessDraftSync skips the first render because initial values equal the collection's current values; it only syncs after a user change. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/InlineAlbumPriceAndAudience.tsx#L48))

### `src/components/collection/desktop/edit-mode/PlaylistEditModeContext.tsx`

- PlaylistAccessDraft holds only the access fields the album update sends to the SDK; the editPlaylist saga fills in USDC splits for newly premium albums. ([L36](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/PlaylistEditModeContext.tsx#L36))
- PlaylistEditModeContext keeps removal undo/redo stacks beside the draft so they reset atomically on enter, exit, discard and apply. ([L165](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/PlaylistEditModeContext.tsx#L165))
- In create mode PlaylistEditModeContext treats the page as dirty as soon as any tracks exist so navigation away warns. ([L294](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/PlaylistEditModeContext.tsx#L294))
- usePlaylistEditMode returns a no-op context outside its provider so shared components like CollectionHeader work for non-owners. ([L527](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/PlaylistEditModeContext.tsx#L527))

### `src/components/collection/desktop/edit-mode/draftCollectionCache.ts`

- addTrackToDraftCollection updates both trackIds and playlist_contents in the query cache so the inline create flow stays local and dependent queries stay consistent. ([L14](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/draftCollectionCache.ts#L14))

### `src/components/collection/desktop/edit-mode/draftCollections.ts`

- draftCollections tracks ids of unsaved local drafts so the edit-mode provider auto-enters edit mode and treats Apply as a create. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/draftCollections.ts#L3))

### `src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx`

- EditAwareTracksTable makes row clicks toggle selection (shift extends range) instead of playing while in edit mode. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L26))
- EditAwareTracksTable hides tracks staged for removal immediately; they are only persisted or restored on Apply or Discard. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L39))
- EditAwareTracksTable stops the header checkbox click from bubbling to the column sort handler. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L66))
- EditAwareTracksTable stops checkbox clicks from bubbling so the row onClick does not toggle selection a second time. ([L109](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L109))
- EditAwareTracksTable tracks Shift from keyboard events because TracksTable's onClickRow does not pass the MouseEvent. ([L121](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L121))
- EditAwareTracksTable resets its shift flag on window blur because alt-tabbing while holding Shift fires keyup in another window. ([L135](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/EditAwareTracksTable.tsx#L135))

### `src/components/collection/desktop/edit-mode/tracks/TrackBulkActionsBar.tsx`

- TrackBulkActionsBar enables bulk edit only for albums because albums contain only the owner's tracks. ([L45](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/TrackBulkActionsBar.tsx#L45))
- TrackBulkActionsBar excludes tracks staged for removal from selectable ids so Select all does not re-select them. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/TrackBulkActionsBar.tsx#L61))
- TrackBulkActionsBar disables its keyboard shortcuts while the bulk edit modal is open. ([L126](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/TrackBulkActionsBar.tsx#L126))
- TrackBulkActionsBar renders the bulk edit modal outside the bar because the bar hides once selection clears. ([L185](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/TrackBulkActionsBar.tsx#L185))

### `src/components/collection/desktop/edit-mode/tracks/TrackSelectionContext.tsx`

- TrackSelectionContext keeps the range anchor across shift-clicks and resets it on a plain click, matching Finder and Gmail. ([L63](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/collection/desktop/edit-mode/tracks/TrackSelectionContext.tsx#L63))

### `src/components/comments/CommentActionBar.tsx`

- CommentActionBar's delete calls onClickDelete because CommentBlock owns UI logic around deletion. ([L111](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/comments/CommentActionBar.tsx#L111))

### `src/components/comments/CommentBlock.tsx`

- CommentBlock wraps CommentBlockInternal so it can return early when the comment query is undefined without breaking hook ordering. ([L264](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/comments/CommentBlock.tsx#L264))

### `src/components/comments/CommentForm.tsx`

- CommentForm increments a message id after submit to clear the composer input. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/comments/CommentForm.tsx#L108))

### `src/components/comments/CommentSection.tsx`

- CommentSection scrolls to the comment section after replacing history because the replace scrolls to top. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/comments/CommentSection.tsx#L77))

### `src/components/contest-card/ContestCard.tsx`

- ContestCard prefers the contest's own cover photo over the parent track artwork, matching the contest page. ([L243](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L243))
- ContestCard uses a 60s staleTime on the entries count so the primed cache from useAllRemixContests avoids a per-card request. ([L250](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L250))
- ContestCard links to the dedicated contest page rather than the host track page. ([L267](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L267))
- ContestCard returns null when the host is deactivated because the endpoint still returns those contests and they have no valid actions. ([L278](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/contest-card/ContestCard.tsx#L278))

### `src/components/duplicate-playlist-modal/DuplicatePlaylistModal.tsx`

- DuplicatePlaylistModal seeds custom fields from the source collection so toggling a switch starts from the current value. ([L144](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/duplicate-playlist-modal/DuplicatePlaylistModal.tsx#L144))

### `src/components/edit-track/EditTrackForm.tsx`

- EditTrackForm submits directly when replacing a file because the edit track page handles the replace-audio confirmation. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit-track/EditTrackForm.tsx#L134))

### `src/components/edit/fields/AdvancedField.tsx`

- AdvancedField accepts standard ISRC and ISWC formats with optional periods and hyphens. ([L84](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/AdvancedField.tsx#L84))
- AdvancedField sets cover fields to empty strings when the cover toggle is on but unset, for reporting to publishers. ([L222](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/AdvancedField.tsx#L222))
- AdvancedField turns off feedback requests when comments are disabled because feedback arrives as comments. ([L246](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/AdvancedField.tsx#L246))

### `src/components/edit/fields/KeySelectField.tsx`

- KeySelectField stores the flat name for enharmonic keys such as C#/Db. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/KeySelectField.tsx#L16))

### `src/components/edit/fields/RemixSettingsField/RemixSettingsField.tsx`

- RemixSettingsField defaults to showing remixes on upload for public or USDC-gated tracks and hides them otherwise. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/RemixSettingsField/RemixSettingsField.tsx#L95))

### `src/components/edit/fields/StemsAndDownloadsMenuFields.tsx`

- StemsAndDownloadsMenuFields enables lossless files via useEffect because doing it in onChange handlers caused race conditions and spurious errors. ([L176](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/edit/fields/StemsAndDownloadsMenuFields.tsx#L176))

### `src/components/host-remix-contest-modal/HostRemixContestModal.tsx`

- HostRemixContestModal spreads existing event_data because the indexer replaces it wholesale on update. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/host-remix-contest-modal/HostRemixContestModal.tsx#L138))

### `src/components/image-selection/PropTypes.js`

- ImageSelection's onSelect gets a promise so callers can show a processing state as soon as async selection starts. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/image-selection/PropTypes.js#L7))

### `src/components/nav/desktop/PlaylistLibrary/useSanitizePlaylistLibrary.ts`

- useSanitizePlaylistLibrary repairs library entries that have contents but a non-folder type, rewriting them as folders. ([L18](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/nav/desktop/PlaylistLibrary/useSanitizePlaylistLibrary.ts#L18))

### `src/components/profile-progress/hooks.ts`

- useProfileCompletionDismissal hides the meter if loaded complete (accounting for late account load), hides instantly on dismiss, and delays hide if completed this session. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/profile-progress/hooks.ts#L50))
- useProfileCompletionDismissal only marks wasIncomplete for partially complete profiles, because fully incomplete accounts never passed through sign-up. ([L76](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/profile-progress/hooks.ts#L76))

### `src/components/publish-hidden-tracks-confirmation-modal/PublishHiddenTracksConfirmationModal.tsx`

- PublishHiddenTracksConfirmationModal treats dismissal as keep-private so hidden tracks are never published by accident. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/publish-hidden-tracks-confirmation-modal/PublishHiddenTracksConfirmationModal.tsx#L46))

### `src/components/suggested-tracks/SuggestedTracks.tsx`

- SuggestedTracks reads existing track IDs via useCollection, which works for drafts because draftCollectionCache writes to the same query key. ([L283](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L283))
- SuggestedTracks delays between addTrackToPlaylist dispatches so each saga's optimistic update lands before the next reads playlist state. ([L380](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L380))
- SuggestedTracks only intercepts paste when the clipboard has a valid Audius track URL; otherwise typing is untouched. ([L423](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L423))
- SuggestedTracks lets addTracksFromText's promise float because it handles its own errors and the no-void lint rule forbids void. ([L428](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/suggested-tracks/SuggestedTracks.tsx#L428))

### `src/components/track/desktop/TrackTileCommentComposer.tsx`

- TrackTileCommentComposer inserts optimistic comments into the timestamp-sorted list the waveform reads so the avatar shows immediately. ([L22](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTileCommentComposer.tsx#L22))
- TrackTileCommentComposer stops click propagation because the tile navigates on click. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/components/track/desktop/TrackTileCommentComposer.tsx#L87))

### `src/pages/collection-page/useCollectionPage.ts`

- useCollectionPage fetches track owners and attaches .user because TQTrack omits user and the tracks table reads metadata.user.name. ([L133](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L133))
- useCollectionPage derives stable UIDs for its collection entries so uid-based lookups such as the playing highlight and reorder keep working. ([L146](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L146))
- useCollectionPage shows the track's created_at as date added when playlist_contents time is 0, instead of the Unix epoch. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L164))
- useCollectionPage falls back to collection order when the custom sort order is stale (for example a track was removed) so no rows go missing. ([L179](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L179))
- When reordering in useCollectionPage, write back the stored timeAdded rather than the dateAdded display fallback, so playlist_contents times are not overwritten with fake values. ([L745](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/collection-page/useCollectionPage.ts#L745))

### `src/pages/contest-page/ContestPage.tsx`

- ContestPage is routed by the parent track's handle and slug but loads data by the contest event_id, so comments and follows are scoped to the event rather than the track. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/ContestPage.tsx#L12))

### `src/pages/contest-page/components/ContestCommentsSection.tsx`

- ContestCommentsSection supports 'feed' (legacy single pane kept for the mobile contest page), 'updates' (host top-level posts only) and 'comments' (everything else). ([L53](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.tsx#L53))
- In ContestCommentsSection a post update is a top-level comment by the event owner; owner replies are normal comments, mirroring the server rule that only root owner comments fan out notifications. ([L69](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.tsx#L69))
- ContestCommentsSection shows Top/Newest sort only in comments mode; updates and the legacy feed are pinned to newest-first. ([L96](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.tsx#L96))
- ContestCommentRow filters client-side so the comments panel drops host post updates, which would otherwise appear twice alongside the dedicated Updates feed. ([L337](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsSection.tsx#L337))

### `src/pages/contest-page/components/ContestCommentsTile.tsx`

- ContestCommentsTile wires event-comment hooks directly instead of CommentSectionProvider, because that provider is track-scoped (useTrack, gated access, lineup UID). ([L103](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L103))
- In ContestCommentsTile comments mode the host gets no top-level composer (they reply or use the Post Update composer); in updates mode only the host can compose. ([L156](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L156))
- ContestCommentsTile hides the sign-in stub when hideComposer is set because a separate composer already owns the CTA, so it is tracked separately from showComposer. ([L163](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L163))
- ContestCommentsTile clears ComposerInput after submit by incrementing messageId, the same pattern the track page uses. ([L178](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L178))
- ContestCommentsTile pre-filters feed items by mode using comments primed into the React Query cache by useEventComments, so the empty state shows instead of a blank tile. ([L211](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L211))
- On a comment cache miss ContestCommentsTile keeps the row and lets ContestCommentRow's own filter hide it once data arrives. ([L223](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L223))
- ContestCommentRow applies the mode filter itself because the comment's author and parent are only known after useComment resolves; non-matching rows render null. ([L464](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L464))
- ContestCommentRow disallows replies to host post updates because they are announcements, not threads. ([L521](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestCommentsTile.tsx#L521))

### `src/pages/contest-page/components/ContestStemsCard.tsx`

- ContestStemsCard is a custom card rather than the track-page DownloadSection because that section's header, caret and download-all chrome collide with the contest card; it reuses useStems, useFileSizes and useWaitForDownloadModal so downloads behave identically. ([L65](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L65))
- ContestStemsCard auto-follows the contest when a signed-in user starts a stem download, on tap because the download flow exposes no success callback; the follow is optimistic and reversible. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L102))
- ContestStemsCard starts expanded for five or fewer stems and collapsed above that so long lists don't push the followers and comments tiles down; an explicit user toggle wins. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L122))
- ContestStemsCard includes the parent trackId in the useFileSizes query so the Full Track row shows its size even though the parent is not a stem. ([L139](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L139))
- ContestStemsCard rows navigate to the track page on click, so inner download and expand buttons call stopPropagation to avoid triggering navigation. ([L194](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/ContestStemsCard.tsx#L194))

### `src/pages/contest-page/components/PostUpdateComposer.tsx`

- PostUpdateComposer is a host-only standalone composer for surfaces where the Updates feed lives elsewhere, such as the mobile Details tab. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/PostUpdateComposer.tsx#L33))

### `src/pages/contest-page/components/desktop/ContestPage.tsx`

- The desktop ContestPage uses a regular Button with local hover state for Following/Unfollow instead of FollowButton, which is 28px at small size and mismatched the 32px Enter Contest CTA. ([L225](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L225))
- The desktop ContestPage takes the submissions count from the count-only useRemixesCount query, because lineup length only reflects what infinite scroll has loaded and grew while scrolling. ([L333](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L333))
- The ContestPage follow button shows a fixed-width spinner while follow state loads so it doesn't flash 'Follow' before 'Following'. ([L427](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/desktop/ContestPage.tsx#L427))

### `src/pages/contest-page/components/mobile/ContestPage.tsx`

- The mobile ContestPage hides the Updates tab for non-hosts until a host post update exists; the host always sees it so they can compose. ([L314](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/mobile/ContestPage.tsx#L314))
- The mobile ContestPage Details tab renders the description only and does not reuse RemixContestDetailsTab, whose 'Submission Due' row would duplicate the deadline already in the header. ([L768](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/contest-page/components/mobile/ContestPage.tsx#L768))

### `src/pages/create-playlist-page/CreatePlaylistPage.tsx`

- CreatePlaylistPage primes an unsaved draft collection into the query cache without writing to the backend, then redirects to the collection page in create mode. ([L28](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/create-playlist-page/CreatePlaylistPage.tsx#L28))
- CreatePlaylistPage primes the draft with forceReplace, and entity cache options (infinite staleTime/gcTime) keep it from being refetched and clobbered. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/create-playlist-page/CreatePlaylistPage.tsx#L78))

### `src/pages/dashboard-page/components/ArtistDashboardTracksTab.tsx`

- ArtistDashboardTracksTab queries the current page's tracks to drive the table loading state, since useFormattedTrackData only reads page 0. ([L77](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/dashboard-page/components/ArtistDashboardTracksTab.tsx#L77))

### `src/pages/dashboard-page/components/bulk-edit/BulkEditTracksBar.tsx`

- BulkEditTracksBar counts only selected tracks currently shown in the table, so rows hidden by a filter or search are not edited. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/dashboard-page/components/bulk-edit/BulkEditTracksBar.tsx#L25))

### `src/pages/edit-collection-page/desktop/EditCollectionPage.tsx`

- Desktop EditCollectionPage returns a promise resolved in the editPlaylist callback so Formik keeps isSubmitting true until optimistic updates finish, then navigates to the playlist page with fresh data. ([L86](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-collection-page/desktop/EditCollectionPage.tsx#L86))

### `src/pages/edit-collection-page/mobile/EditCollectionPage.tsx`

- Mobile EditCollectionPage converts an undefined description to null on save because the field must be present in the edit payload. ([L204](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-collection-page/mobile/EditCollectionPage.tsx#L204))
- Mobile EditCollectionPage copies playlist_contents track_ids before removing and reordering so the cached collection's array is not mutated before editPlaylist runs. ([L208](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-collection-page/mobile/EditCollectionPage.tsx#L208))
- Mobile EditCollectionPage writes the reordered track_ids into formFields.playlist_contents so editPlaylist's optimistic update stores the new order. ([L228](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-collection-page/mobile/EditCollectionPage.tsx#L228))

### `src/pages/edit-collection-page/utils.ts`

- updatePlaylistContents uses metadata_time to map edited tracks back to playlist_contents so duplicate entries of the same track_id stay distinguishable. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-collection-page/utils.ts#L11))

### `src/pages/edit-page/EditTrackPage.tsx`

- EditTrackPage honours the returnTo search param so Save/Back return to the in-progress host-contest form, which restores from sessionStorage. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-page/EditTrackPage.tsx#L48))
- EditTrackPage must not initialise the form until the stems query settles, since the form's stem list drives the save reconcile and an early empty list would delete all published stems. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-page/EditTrackPage.tsx#L64))
- EditTrackPage waits for useTrackCollaboratorsForEdit because the cached track can lack pending invites, and saving without them would delete those invites. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/edit-page/EditTrackPage.tsx#L72))

### `src/pages/host-remix-contest-page/AddSourceTrackModal.tsx`

- AddSourceTrackModal is single-select because contests support one source track, but returns an array so multi-select can be added without changing callers. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/AddSourceTrackModal.tsx#L46))

### `src/pages/host-remix-contest-page/HostRemixContestPage.tsx`

- HostRemixContestPage serves /:handle/:slug/host-contest and track-less /host-contest; new fields (title, video, cover, source tracks) are stored as extra keys in event_data and entity_id is the first source track. ([L134](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L134))
- HostRemixContestPage only uses drafts in create mode, scoped per user and primary track (or 'trackless'); edit mode is driven by the live event. ([L186](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L186))
- HostRemixContestPage hydrates form state once remixContest resolves because useState initialisers ran before the query finished and left edit fields blank; drafts are disabled in edit mode so nothing is clobbered. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L233))
- HostRemixContestPage seeds sourceTrackIds from the URL track once primaryTrackId resolves, since the initialiser saw undefined and Launch stayed disabled; it never re-seeds after the user removes the row. ([L264](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L264))
- HostRemixContestPage uses the URL primary track as the event entity_id, falling back to the first source track on the track-less route; it also drives post-save navigation. ([L284](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L284))
- HostRemixContestPage debounces draft autosave and skips it while the restore banner is shown or the form is empty, so a discarded draft stays discarded. ([L302](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L302))
- HostRemixContestPage stays on the form when the save mutation throws (its onError already toasts) instead of navigating to a half-created contest. ([L548](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L548))
- HostRemixContestPage renders nothing on the track-scoped route until the track resolves, to avoid flashing an empty form against the wrong track. ([L601](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L601))
- HostRemixContestPage clears the cover file input's value after selection so choosing the same file again still fires onChange. ([L923](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L923))
- SourceTrackRow in HostRemixContestPage shows no stems label until useStems resolves to avoid flashing 'No Stems' on tracks that have stems. ([L1131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/HostRemixContestPage.tsx#L1131))

### `src/pages/host-remix-contest-page/ManageStemsModal.tsx`

- ManageStemsModal edits the track's own is_downloadable and download_conditions with no per-contest override; extra stem uploads are linked to the track edit page. ([L73](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/ManageStemsModal.tsx#L73))
- ManageStemsModal only writes 'public' download availability; premium and follow gates need more form state, so other conditions are preserved and users are linked to the full edit page. ([L187](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/ManageStemsModal.tsx#L187))

### `src/pages/host-remix-contest-page/useContestDraft.ts`

- useContestDraft snapshots the existing draft at mount so later saves don't re-trigger the restore banner. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/host-remix-contest-page/useContestDraft.ts#L61))

### `src/pages/library-page/hooks/useLibraryPage.ts`

- useLibraryPage fetches track owners and attaches user to each entry because tan-query tracks omit user and the library table reads metadata.user.name. ([L262](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/hooks/useLibraryPage.ts#L262))
- useLibraryPage only pushes the filter to the server query when not all tracks are loaded; complete result sets are filtered client-side. ([L500](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/library-page/hooks/useLibraryPage.ts#L500))

### `src/pages/pick-winners-page/PickWinnersPage.tsx`

- PickWinnersPage uses useRemixes rather than useRemixesLineup so the submissions list does not prepend the original track or winners, which live in the winner strip above. ([L90](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/pick-winners-page/PickWinnersPage.tsx#L90))

### `src/pages/profile-page/components/desktop/ProfilePage.tsx`

- Desktop ProfilePage only fetches reposts for artists when the Reposts tab is opened, since artists land on Tracks while other users land on Reposts. ([L196](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/desktop/ProfilePage.tsx#L196))

### `src/pages/profile-page/components/desktop/RecentComments.tsx`

- RecentComments captures isLoading once at mount so entry animations only play when comments were not immediately visible, avoiding re-animation of cached comments. ([L102](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/desktop/RecentComments.tsx#L102))

### `src/pages/profile-page/components/mobile/ProfilePage.tsx`

- Mobile ProfilePage only fetches reposts for artists when the Reposts tab is opened, since artists land on Tracks while other users land on Reposts. ([L160](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/profile-page/components/mobile/ProfilePage.tsx#L160))

### `src/pages/search-explore-page/components/desktop/FeaturedRemixContestsSection.tsx`

- FeaturedRemixContestsSection fetches all contests with PRIME_BATCH_SIZE 30 because that query primes per-track entry counts, replacing one useRemixesCount request per ContestCard. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/FeaturedRemixContestsSection.tsx#L13))
- FeaturedRemixContestsSection calls useAllRemixContests and ignores the result on purpose, only to prime entry-count cache so ContestCard does not fire per-card count requests. ([L26](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/search-explore-page/components/desktop/FeaturedRemixContestsSection.tsx#L26))

### `src/pages/upload-page/UploadPage.tsx`

- UploadPage only resets the upload store on unmount after success or failure, so in-progress uploads can be resumed. ([L131](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/UploadPage.tsx#L131))
- UploadPage clears the saved upload draft when publishing starts; the effect runs after the edit form unmounts so its final autosave is queued before the clear. ([L171](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/UploadPage.tsx#L171))

### `src/pages/upload-page/forms/UploadTrackForm.tsx`

- getTrackEditInitialMetadata must only read track.metadata because EditTrackForm uses enableReinitialize and formState.tracks updates on every submit; initialMetadata is applied when the track is added. ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/forms/UploadTrackForm.tsx#L31))

### `src/pages/upload-page/pages/SelectPage.tsx`

- SelectPage keeps a module-level WeakSet of seeded files so initialMetadata is applied once per file even when the user returns to the page, never overwriting later edits. ([L24](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/pages/SelectPage.tsx#L24))

### `src/pages/upload-page/store/utils/uploadDraft.ts`

- uploadDraft stores audio, stems and artwork once under their own IndexedDB keys and has form values reference them, so autosaving a metadata change does not rewrite gigabytes of stems. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/store/utils/uploadDraft.ts#L7))
- uploadDraft runs IndexedDB operations through a single promise queue so overlapping autosaves and a clear cannot interleave. ([L52](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/store/utils/uploadDraft.ts#L52))
- deserializeDraftValues recreates artwork URLs and rebuilds track previews because blob URLs from the previous session are dead. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/pages/upload-page/store/utils/uploadDraft.ts#L108))

### `src/workers/resizeImage.worker.js`

- resizeImage.worker loads ExifParser directly because Jimp's own dependency does not resolve in the worker, leaving EXIF orientation unparsed and photos sideways. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/web/src/workers/resizeImage.worker.js#L3))
