# 0007. Tracks, collections, uploads and contests in common

- Status: Accepted
- Date: 2026-11-21

## Context

Upload schemas, track metadata, stems, playlists, library, remix contests and comments. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `adapters/track.ts`

- userTrackMetadataFromSDK in adapters/track.ts maps pendingCollaborators (owner-only) so the edit form preserves pending invites when saving. ([L180](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/track.ts#L180))
- trackMetadataForUploadToSdk in adapters/track.ts sends collaborators as numeric user ids because the on-chain metadata carries ids and the ETL turns them into invites. ([L379](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/track.ts#L379))

### `api/tan-query/comments/useCommentReplies.ts`

- useCommentReplies starts pagination at startingLimit, not 0, because comments already load with their first 3 replies. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useCommentReplies.ts#L33))

### `api/tan-query/comments/useComments.ts`

- useComments' queryFn only reads the cache because individual comments are expected to be primed by the list/reply queries, not fetched individually. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useComments.ts#L25))

### `api/tan-query/comments/useEditComment.ts`

- useEditComment onError reverts only isEdited/message/mentions so another mutation that landed between start and error is not overwritten. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useEditComment.ts#L78))

### `api/tan-query/comments/useEventComments.ts`

- useEventComments returns one comment stream; whether a comment is a host post-update is decided at render time by comparing comment.userId to the event owner. ([L43](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useEventComments.ts#L43))

### `api/tan-query/comments/useMuteUser.ts`

- useMuteUser subtracts only the removed reply delta from replyCount because not all of the muted user's replies may be loaded due to pagination. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useMuteUser.ts#L70))
- useMuteUser resets the comment count query instead of computing it because the count is polled frequently anyway. ([L87](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useMuteUser.ts#L87))

### `api/tan-query/comments/usePostComment.ts`

- usePostComment generates the comment id in onMutate, which runs before mutationFn with the same args object, so the id set there is the one posted to the server. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostComment.ts#L61))
- usePostComment sets replies: [] on the optimistic comment to match commentFromSDK's shape so it renders identically to a real comment. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostComment.ts#L78))

### `api/tan-query/comments/usePostEventComment.ts`

- PostEventCommentArgs.videoUrl in usePostEventComment is only meaningful on owner post-updates but is sent on all comments so the backend can surface it later. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L19))
- usePostEventComment uses one mutation for owner post-updates and regular comments; the indexer and UI tell them apart by comparing user_id to the event owner. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L27))
- usePostEventComment must send the parent as metadata.parentId (not parentCommentId); otherwise the indexer gets no parent_comment_id and replies come back unthreaded and land in the Updates feed. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L40))
- usePostEventComment includes parentCommentId and videoUrl on the optimistic comment, or the Contest comments tile misclassifies replies as host post-updates and videos do not render until refetch. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L66))
- usePostEventComment prepends new top-level comments to every cached sort variant (top/newest/timestamp) so it appears regardless of the active tab. ([L93](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L93))
- usePostEventComment pushes optimistic replies into the parent's nested replies array and casts the result, because TS cannot prove the Comment shape satisfies CommentOrReply. ([L108](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L108))
- usePostEventComment (like usePostComment) does not invalidate on success, because an immediate refetch races the indexer and wipes the optimistic comment. ([L147](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/usePostEventComment.ts#L147))

### `api/tan-query/comments/useReactToComment.ts`

- useReactToComment onError reverts only the reaction fields so another mutation between start and error is not overwritten. ([L97](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useReactToComment.ts#L97))

### `api/tan-query/comments/useTimestampedComments.ts`

- useTimestampedComments fetches only one page of timestamp-sorted comments because the list drives waveform markers and bubbles, not the full thread. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useTimestampedComments.ts#L13))

### `api/tan-query/comments/useTrackCommentCount.ts`

- useTrackCommentCount keeps the first-loaded count as previousValue across refetches so the difference to currentValue shows new comments since load. ([L37](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useTrackCommentCount.ts#L37))
- useTrackCommentCount uses gcTime 1 because the count is only shown in the comments view and must be fetched fresh each time it opens. ([L47](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useTrackCommentCount.ts#L47))

### `api/tan-query/comments/useTrackComments.ts`

- useTrackCommentsQuery keeps a live observer on the comment-list query because it uses gcTime 0 and is evicted as soon as no observer is mounted. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useTrackComments.ts#L38))
- usePrefetchTrackComments warms the Top-sorted default page on track screen mount and keeps an observer so the gcTime 0 query survives until the comment section mounts. ([L98](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/comments/useTrackComments.ts#L98))

### `api/tan-query/events/useAllRemixContests.ts`

- useAllRemixContests' status defaults to 'all', which the backend returns as active contests (soonest end first) then ended contests (most recent first). ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L30))
- useAllRemixContests maps each contest to its parent track id (event.entityId) so ContestCard can take a trackId and resolve the event via useRemixContest. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useAllRemixContests.ts#L46))

### `api/tan-query/events/useCreateEvent.ts`

- useCreateEvent generates the event id in onMutate, which runs before mutationFn with the same args object, so that id is the one posted. ([L40](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useCreateEvent.ts#L40))

### `api/tan-query/events/useFollowEvent.ts`

- useEventFollowState must pass user_id to getEventFollowState; without it the API returns isFollowed=false for signed-in users. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useFollowEvent.ts#L48))
- useFollowEvent passes numeric ids so the SDK EventsApi override uses the client-signed entity-manager path; hashid strings would hit the HTTP endpoint that needs an OAuth header web lacks. ([L74](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useFollowEvent.ts#L74))

### `api/tan-query/events/useUserHasRemixContest.ts`

- useUserHasRemixContest queries the per-user contests endpoint with pageSize 1 so the answer is one small query rather than scanning the global contest list. ([L7](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserHasRemixContest.ts#L7))
- useUserHasRemixContest reports pending while the first page is unresolved so callers do not hide the contests tab and then flash it in late. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserHasRemixContest.ts#L25))

### `api/tan-query/events/useUserRemixContests.ts`

- useUserRemixContests' status defaults to 'all', returning active contests (soonest end first) then ended contests (most recent first). ([L31](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L31))
- useUserRemixContests maps each contest to its parent track id so ContestCard can take a trackId and resolve the event via useRemixContest. ([L50](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/events/useUserRemixContests.ts#L50))

### `api/tan-query/saga-utils/updatePlaylistLibrarySaga.ts`

- persistAccountPlaylistLibrarySaga reads the playlist library from the redux account slice after a local action (e.g. addAccountPlaylist) has updated it synchronously, then pushes it to the SDK and tan-query cache. ([L49](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/saga-utils/updatePlaylistLibrarySaga.ts#L49))

### `api/tan-query/tracks/bulkTrackEdit.ts`

- getBulkTrackEditChanges sets is_downloadable false when making a track free, because making it premium had turned downloads on. ([L119](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/bulkTrackEdit.ts#L119))

### `api/tan-query/tracks/useBulkUpdateTracks.ts`

- useBulkUpdateTracks sends the full track (like the edit form) so untouched fields aren't reset, but omits collaborators because the indexer reconciles invites whenever the list is sent. ([L115](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useBulkUpdateTracks.ts#L115))

### `api/tan-query/tracks/useDownloadTrackStems.ts`

- useDownloadTrackStems just builds a signed zip URL because the API streams the zip while fetching stems; callers hand it to the platform downloader rather than polling a job. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useDownloadTrackStems.ts#L11))
- useDownloadTrackStems checks both is_downloadable (artist offers the full file) and access.download (gating check, true for any ungated track) before bundling the parent track into the stems zip. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useDownloadTrackStems.ts#L20))

### `api/tan-query/tracks/useRejectTrackCollaboration.ts`

- useRejectTrackCollaboration handles both declining an invite and leaving an accepted collaboration because both map to the same on-chain Reject action signed by the current user. ([L15](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useRejectTrackCollaboration.ts#L15))

### `api/tan-query/tracks/useTrackCollaboratorsForEdit.ts`

- useTrackCollaboratorsForEdit fetches collaborators as the owner because pending invites only come back on owner requests; seeding an edit from the cached track would delete pending invites. ([L19](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useTrackCollaboratorsForEdit.ts#L19))

### `api/tan-query/tracks/useUpdateTrack.ts`

- useUpdateTrack passes the stems query (server view) to handleStemUpdates; the cached track's \_stems was never populated, which silently discarded every stem removal. ([L169](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/tracks/useUpdateTrack.ts#L169))

### `api/tan-query/upload/usePublishCollection.ts`

- combineMetadata in usePublishCollection sets is_playlist_upload on child tracks so the backend suppresses per-track follower create notifications. ([L258](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/usePublishCollection.ts#L258))

### `api/tan-query/upload/usePublishTracks.ts`

- usePublishTracks publishes the parent track first and stems sequentially after; running them concurrently made stem publishes reference a parent trackId not yet confirmed on-chain, so they all failed. ([L152](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/usePublishTracks.ts#L152))

### `api/tan-query/upload/useUpload.ts`

- useUpload requires the current user id because the validator attests on chain who the bytes were uploaded for, which makes the cids claimable on a track; missing account fails loudly instead of making an unclaimable upload. ([L172](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/useUpload.ts#L172))
- useUpload stores the track upload promise in a ref so file uploads start as soon as files are chosen and are only awaited at the finish step. ([L189](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/upload/useUpload.ts#L189))

### `api/tan-query/users/account/useAddToPlaylistFolder.ts`

- useAddToPlaylistFolder snapshots the playlist library before mutating because updatePlaylistLibrary overwrites the cache via setQueryData and later handlers need the prior state. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useAddToPlaylistFolder.ts#L56))

### `api/tan-query/users/account/useReorderLibrary.ts`

- useReorderLibrary snapshots the playlist library before mutating because updatePlaylistLibrary overwrites the cache via setQueryData and later handlers need the prior state. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/account/useReorderLibrary.ts#L57))

### `api/tan-query/utils/formatTrackData.ts`

- setFieldVisibility in formatTrackData.ts forces all field_visibility flags on for non-unlisted tracks, since only unlisted tracks may hide fields. ([L25](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/formatTrackData.ts#L25))
- formatTrackData must always be applied before a track is written to the cache so cached tracks have cosign, field visibility and default fields normalized. ([L64](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/formatTrackData.ts#L64))

### `api/tan-query/utils/handleStemUpdates.test.ts`

- handleStemUpdates treats metadata.stems undefined as no change, so partial updates (e.g. toggling downloadability) aren't read as removing all stems. ([L70](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/handleStemUpdates.test.ts#L70))
- handleStemUpdates skips deletions when the existing stem list is empty; that is the safe failure mode instead of guessing removals. ([L82](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/handleStemUpdates.test.ts#L82))

### `api/tan-query/utils/handleStemUpdates.ts`

- handleStemUpdates requires existingStems from the stems query (server view), not the submitted metadata; an empty list disables removal detection, which is the safe failure mode. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/handleStemUpdates.ts#L20))

### `api/tan-query/utils/primeTrackData.ts`

- setFieldVisibility in primeTrackData.ts forces all field_visibility flags on for non-unlisted tracks, since only unlisted tracks may hide fields. ([L39](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/primeTrackData.ts#L39))
- reformat in primeTrackData.ts must always be applied before a track is written to the cache so cached tracks have cosign, field visibility and default fields normalized. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/utils/primeTrackData.ts#L78))

### `context/comments/commentsContext.tsx`

- closeAndExitNowPlaying is threaded through CommentSectionContext instead of calling useCommentDrawer in CommentBlock because @gorhom/bottom-sheet portals content outside CommentDrawerContext.Provider. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/context/comments/commentsContext.tsx#L46))
- In ReplyingAndEditingState, replyingToCommentId can differ from replyingToComment.id when replying to a reply, since replies attach to the parent thread. ([L67](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/context/comments/commentsContext.tsx#L67))

### `hooks/useEnterContest.ts`

- useEnterContest is the single builder for the contest-entry upload initialMetadata (including remix_of shape) so it cannot drift from the remix flow; each platform fetches artwork itself because web File and RN blob shapes differ. ([L12](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useEnterContest.ts#L12))

### `models/Track.ts`

- Track.pending_collaborators is populated by the API only on the owner's own tracks so the edit form can preserve still-pending collaborator invites on save. ([L273](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/Track.ts#L273))

### `schemas/metadata.ts`

- In schemas/metadata.ts, remix_of is rebuilt last from the parent track id so extra remix_of fields from API responses are not carried into the new metadata. ([L92](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/metadata.ts#L92))

### `schemas/upload/uploadFormSchema.ts`

- In uploadFormSchema.ts, genre is a free string up to 100 chars like the SDK; the Genre enum only drives autocomplete, users may submit any value. ([L57](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/upload/uploadFormSchema.ts#L57))
- In uploadFormSchema.ts, createSdkSchema validates only part of what EditTrackForm submits: it is snake_case (except remixOf), uses numeric ids, and omits post-upload fields. ([L137](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/upload/uploadFormSchema.ts#L137))
- In uploadFormSchema.ts, collaborators hold full user objects in the form; the upload adapter maps them to numeric user ids for on-chain metadata. ([L156](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/upload/uploadFormSchema.ts#L156))
- In uploadFormSchema.ts, createCollectionSchema validates only track titles and artwork url, and allows a future release date, unlike the normal collection type. ([L247](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/upload/uploadFormSchema.ts#L247))
- In uploadFormSchema.ts, albumTrackPrice is optional in the zod type to avoid TS conflicts but is required via validation logic and prefilled by USDCPurchaseFields. ([L295](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/schemas/upload/uploadFormSchema.ts#L295))

### `store/pages/collection/types.ts`

- CollectionTrack.timeAdded (pages/collection/types.ts) is raw playlist_contents time in unix seconds; 0 means the server never wrote it. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/collection/types.ts#L6))

### `store/pages/library-page/utils.ts`

- In library-page/utils.ts, choosing "Purchased" on the tracks tab resets the collections tabs to "All" because collections have no Purchased category. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/library-page/utils.ts#L16))
- In library-page/utils.ts, if the tracks tab is on "Purchased", changing the collections category leaves tracks on "Purchased" until the user returns to it. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/library-page/utils.ts#L27))

### `store/playlist-library/helpers.ts`

- renamePlaylistFolderInLibrary (playlist-library/helpers.ts) assumes folders cannot be nested; it must change if nested folders are allowed. ([L218](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playlist-library/helpers.ts#L218))
- removePlaylistFolderInLibrary (playlist-library/helpers.ts) moves the folder's playlists out and assumes folders cannot be nested. ([L248](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playlist-library/helpers.ts#L248))
- reorderPlaylistLibrary (playlist-library/helpers.ts) assumes folders cannot contain folders; nesting support would require changing it. ([L341](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playlist-library/helpers.ts#L341))
- In reorderPlaylistLibrary, the folder drop path assumes the drop target is at most one folder deep because folders cannot be nested. ([L392](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/playlist-library/helpers.ts#L392))

### `store/stems-upload/slice.ts`

- The stemsUpload slice tracks stem uploads from the edit track modal only; the upload track flow does not use it. ([L20](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/stems-upload/slice.ts#L20))

### `store/upload/types.ts`

- TrackMetadataForUpload in store/upload/types.ts accepts mood as string (not only SDK Mood) so Track/TQTrack metadata with Nullable<string> mood stays assignable; it serves both Upload and Edit flows. ([L38](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/upload/types.ts#L38))
- TrackMetadataForUpload.track_id is optional because upload tracks usually lack an id, but tracks with stems get one assigned ahead of time so stems can reference the parent. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/upload/types.ts#L58))

### `utils/genres.ts`

- Use GenreString (any string up to 100 chars) for read-side track metadata types so custom-genre tracks do not cause TS errors; keep the Genre enum for write-side autocomplete and static lists. ([L6](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/genres.ts#L6))
- GENRES in utils/genres.ts are user-facing labels (e.g. with the Electronic prefix); convertGenreLabelToValue must be used to get the value stored as track genre. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/genres.ts#L56))
- toTrendingGenreValue accepts community genres outside the static GENRES list so the dynamic popular-genres filter can select long-tail genres, while toTrendingGenre only accepts known GENRES. ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/genres.ts#L124))
