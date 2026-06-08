import { useCallback, useState } from 'react'

import {
  getCommentQueryKey,
  QUERY_KEYS,
  useComment,
  useCurrentUserId,
  useDeleteComment,
  useEventComments,
  usePostEventComment,
  useReactToComment,
  useUser
} from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { Portal } from '@gorhom/portal'
import { useQueryClient } from '@tanstack/react-query'
import { View } from 'react-native'

import {
  Button,
  Divider,
  Flex,
  IconButton,
  IconHeart,
  IconKebabHorizontal,
  LoadingSpinner,
  Paper,
  PlainButton,
  SelectablePill,
  Text
} from '@audius/harmony-native'
import { VideoEmbed } from 'app/components/video-embed/VideoEmbed'

import { ActionDrawerWithoutRedux } from '../../components/action-drawer'
import { Timestamp } from '../../components/comments/Timestamp'
import { ComposerInput } from '../../components/composer-input'
import { ProfilePicture } from '../../components/core/ProfilePicture'
import { UserLink } from '../../components/user-link'

const messages = {
  commentsHeading: 'COMMENTS',
  updatesHeading: 'UPDATES',
  sortTop: 'Top',
  sortNewest: 'Newest',
  emptyTitle: 'Nothing here yet',
  emptyCommentsSub: 'Be the first to comment on this contest!',
  emptyUpdatesSub: 'The contest host will post announcements here.',
  composePlaceholder: 'Add a comment',
  composePostUpdatePlaceholder: 'Post an update to your contest followers…',
  composeReplyPlaceholder: 'Reply…',
  postUpdateBadge: 'Post Update',
  artistBadge: 'Artist',
  loadMore: 'Load more',
  signInToComment: 'Sign in to comment.',
  reply: 'Reply',
  delete: 'Delete',
  moreActions: 'More actions'
}

export type ContestCommentsMode = 'updates' | 'comments'

type ContestCommentsListProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
  /**
   * - `updates` surfaces only host-authored top-level posts. Composer is
   *   owner-only.
   * - `comments` surfaces everything that *isn't* a host post-update
   *   (community comments + replies). Composer is shown to every
   *   signed-in user.
   */
  mode: ContestCommentsMode
  /**
   * Hide the "COMMENTS (N)" / "UPDATES (N)" Paper header. The tab bar
   * already labels the screen on mobile, so callers that place this
   * list inside a tab body suppress the inner label to avoid a
   * double-title.
   */
  hideHeading?: boolean
}

/**
 * Native port of the web `ContestCommentsTile`. Wires
 * `useEventComments` + `usePostEventComment` directly rather than
 * routing through `CommentSectionProvider` (which is track-scoped and
 * assumes a real Track exists). The visual vocabulary mirrors the
 * web tile — avatar-led rows with Artist badges, sort pills on the
 * comments panel, composer at the top — so the two surfaces stay
 * recognizable as the same feature.
 *
 * Why we don't reuse `CommentBlock` / `CommentForm`: both components
 * consume `useCurrentCommentSection()` which hard-depends on track
 * state (`track.pinned_comment_id`, `track.permalink`, etc.). Events
 * are a different entity type and don't populate that context, so we
 * render a minimal row inline and call `ComposerInput` directly.
 */
export const ContestCommentsList = ({
  eventId,
  eventOwnerUserId,
  mode,
  hideHeading = false
}: ContestCommentsListProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId

  // Comments get a Top/Newest sort toggle; Updates is host-curated
  // and always pinned to newest-first — same policy as the web tile.
  const showSortTabs = mode === 'comments'
  const [sortMethod, setSortMethod] = useState<'top' | 'newest'>(
    mode === 'comments' ? 'top' : 'newest'
  )

  const {
    data: feedItems,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useEventComments({ eventId, sortMethod })

  const { mutate: postComment, isPending: isPosting } = usePostEventComment()

  const heading =
    mode === 'updates' ? messages.updatesHeading : messages.commentsHeading
  // In `comments` mode the host should NOT see the top-level composer —
  // they participate via replies (and via the Updates tab for
  // announcements). Viewers see the top-level composer.
  // In `updates` mode only the host can compose.
  const showComposer =
    currentUserId !== null &&
    (mode === 'comments' ? !isEventOwner : isEventOwner)
  const composerPlaceholder =
    mode === 'updates'
      ? messages.composePostUpdatePlaceholder
      : messages.composePlaceholder

  // Incrementing messageId clears the ComposerInput after submit —
  // same pattern the track-page comment form uses.
  const [messageId, setMessageId] = useState(0)

  const handleComposerSubmit = useCallback(
    (value: string) => {
      const body = value.trim()
      if (!body || !currentUserId) return
      postComment({
        userId: currentUserId,
        eventId,
        body
      })
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, eventId, postComment]
  )

  // useEventComments primes each commentId into the React Query
  // cache, so `useComment(id)` reads are synchronous. We pre-filter
  // the feed by mode at this level so the empty-state condition is
  // accurate — if every row would be filtered out, we want to
  // render the empty-state Paper rather than zero rows with a
  // composer floating on top.
  const queryClient = useQueryClient()
  const allItems = feedItems ?? []
  const filteredItems = allItems.filter(({ commentId }) => {
    const comment = queryClient.getQueryData(getCommentQueryKey(commentId))
    if (!comment) {
      // Cache miss (e.g. comment still being hydrated) — keep the
      // row; the per-row filter in ContestCommentRow hides it once
      // the author resolves. This is rare because primeCommentData
      // runs synchronously inside useEventComments' queryFn.
      return true
    }
    const parentCommentId = (comment as any).parentCommentId
    const isPostUpdate =
      eventOwnerUserId !== undefined &&
      (comment as any).userId === eventOwnerUserId &&
      !parentCommentId
    return mode === 'updates' ? isPostUpdate : !isPostUpdate
  })

  return (
    <Paper direction='column' gap='m' p='l' borderRadius='m' shadow='flat'>
      {hideHeading ? null : (
        <Flex direction='row' alignItems='baseline' gap='xs'>
          <Text variant='label' size='m' color='subdued'>
            {heading}
          </Text>
          {filteredItems.length > 0 ? (
            <Text variant='label' size='m' color='subdued'>
              ({filteredItems.length})
            </Text>
          ) : null}
        </Flex>
      )}

      {showComposer ? (
        <Flex direction='row' gap='s' alignItems='center'>
          {currentUserId ? (
            <ProfilePicture
              userId={currentUserId}
              style={{ width: 32, height: 32, flexShrink: 0 }}
            />
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <ComposerInput
              messageId={messageId}
              // Intentionally omit entityId/entityType — the native
              // ComposerInput hard-depends on the entity being a track
              // (it reads `track.access.stream` inside a memo to wire
              // up timestamp-linking). Passing an eventId routes
              // through `useTrack(eventId)`, which returns partial
              // data without `access`, and the memo crashes with
              // "Cannot read property 'stream' of undefined".
              // Without entityId the composer becomes a plain
              // mentions/text input, which is exactly what the
              // contest comments stream wants today.
              placeholder={composerPlaceholder}
              maxLength={400}
              maxMentions={10}
              onSubmit={(value) => handleComposerSubmit(value)}
              isLoading={isPosting}
            />
          </View>
        </Flex>
      ) : currentUserId ? null : (
        <Text variant='body' size='s' color='subdued'>
          {messages.signInToComment}
        </Text>
      )}

      {showComposer ? <Divider /> : null}

      {showSortTabs && filteredItems.length > 0 ? (
        <Flex direction='row' gap='s'>
          <SelectablePill
            type='button'
            size='small'
            isSelected={sortMethod === 'top'}
            label={messages.sortTop}
            onPress={() => setSortMethod('top')}
          />
          <SelectablePill
            type='button'
            size='small'
            isSelected={sortMethod === 'newest'}
            label={messages.sortNewest}
            onPress={() => setSortMethod('newest')}
          />
        </Flex>
      ) : null}

      {isPending ? (
        <Flex direction='row' justifyContent='center' p='l'>
          <LoadingSpinner />
        </Flex>
      ) : !filteredItems.length ? (
        <Flex direction='column' alignItems='center' gap='xs' pv='xl' ph='m'>
          <Text variant='body' size='m'>
            {messages.emptyTitle}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {mode === 'updates'
              ? messages.emptyUpdatesSub
              : messages.emptyCommentsSub}
          </Text>
        </Flex>
      ) : (
        <Flex direction='column' gap='l'>
          {filteredItems.map(({ commentId }) => (
            <ContestCommentRow
              key={commentId}
              commentId={commentId}
              eventId={eventId}
              eventOwnerUserId={eventOwnerUserId}
              mode={mode}
            />
          ))}
          {hasNextPage ? (
            <Flex direction='row' justifyContent='center' pt='s'>
              <Button
                variant='secondary'
                size='small'
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {messages.loadMore}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      )}
    </Paper>
  )
}

type ContestCommentRowProps = {
  commentId: ID
  eventId: ID
  eventOwnerUserId: ID | undefined
  mode: ContestCommentsMode
}

const ContestCommentRow = ({
  commentId,
  eventId,
  eventOwnerUserId,
  mode
}: ContestCommentRowProps) => {
  const queryClient = useQueryClient()
  const { data: comment } = useComment(commentId)
  const { data: author } = useUser(comment?.userId)
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: postComment } = usePostEventComment()
  const { mutate: deleteComment } = useDeleteComment()
  const { mutate: reactToComment } = useReactToComment()

  const [isReplying, setIsReplying] = useState(false)
  const [replyMessageId, setReplyMessageId] = useState(0)
  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [isOverflowVisible, setIsOverflowVisible] = useState(false)

  if (!comment || !author) return null

  const parentCommentId: ID | undefined =
    'parentCommentId' in comment
      ? ((comment as any).parentCommentId ?? undefined)
      : undefined

  const isPostUpdate =
    eventOwnerUserId !== undefined &&
    comment.userId === eventOwnerUserId &&
    !parentCommentId

  // Client-side mode filter — see ContestCommentsList for why.
  if (mode === 'updates' && !isPostUpdate) return null
  if (mode === 'comments' && isPostUpdate) return null

  const isAuthorEventOwner =
    eventOwnerUserId !== undefined && comment.userId === eventOwnerUserId
  const isCurrentUserHost =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId
  const isCurrentUserAuthor =
    currentUserId !== null && comment.userId === currentUserId
  const canDelete = isCurrentUserHost || isCurrentUserAuthor
  // Replies allowed on regular comments only — nobody can reply to an
  // artist's contest update (those are announcements, not threads).
  const canReply = currentUserId !== null && !isPostUpdate

  const videoUrl: string | undefined =
    'videoUrl' in comment ? ((comment as any).videoUrl ?? undefined) : undefined

  const createdAt: Date | undefined =
    'createdAt' in comment && (comment as any).createdAt
      ? dayjs((comment as any).createdAt).toDate()
      : undefined

  const handleReplySubmit = (value: string) => {
    if (!currentUserId) return
    const body = value.trim()
    if (!body) return
    postComment({
      userId: currentUserId,
      eventId,
      body,
      parentCommentId: commentId
    })
    setReplyMessageId((prev) => prev + 1)
    setIsReplying(false)
  }

  const handleDelete = () => {
    if (!currentUserId) return
    // Optimistic cleanup against the *event* comment caches —
    // useDeleteComment's onMutate runs against track caches, so without
    // this the deleted row reappears until the next refetch (the bug
    // the contest QA pass flagged: "deleting a comment makes it
    // reappear immediately").
    if (parentCommentId) {
      queryClient.setQueryData(getCommentQueryKey(parentCommentId), (prev) => {
        if (!prev) return prev
        const parent = prev as any
        return {
          ...parent,
          replies: (parent.replies ?? []).filter(
            (r: any) => r.id !== commentId
          ),
          replyCount: Math.max(0, (parent.replyCount ?? 0) - 1)
        }
      })
    } else {
      queryClient.setQueriesData<any>(
        { queryKey: [QUERY_KEYS.eventComments, eventId] },
        (prevData: any) => {
          if (!prevData) return prevData
          const next = structuredClone(prevData)
          next.pages = (next.pages ?? []).map((page: any[]) =>
            (page ?? []).filter((item) => item?.commentId !== commentId)
          )
          return next
        }
      )
      queryClient.removeQueries({
        queryKey: getCommentQueryKey(commentId),
        exact: true
      })
    }
    deleteComment({
      commentId,
      userId: currentUserId,
      // useDeleteComment is track-typed but the SDK only consumes
      // commentId/userId — pass eventId to keep cache helpers happy.
      trackId: eventId,
      currentSort: undefined,
      parentCommentId
    })
  }

  const handleToggleLike = () => {
    if (!currentUserId) return
    const nextIsLiked = !(comment as any).isCurrentUserReacted
    reactToComment({
      commentId,
      userId: currentUserId,
      isLiked: nextIsLiked,
      trackId: eventId,
      entityType: 'Event',
      isEntityOwner:
        eventOwnerUserId !== undefined && currentUserId === eventOwnerUserId,
      currentSort: undefined
    })
  }

  return (
    <Flex direction='row' gap='m' alignItems='flex-start'>
      <ProfilePicture
        userId={author.user_id}
        style={{ width: 40, height: 40, flexShrink: 0 }}
      />
      <Flex direction='column' gap='xs' flex={1}>
        <Flex
          direction='row'
          gap='s'
          alignItems='center'
          wrap='wrap'
          justifyContent='space-between'
        >
          <Flex direction='row' gap='s' alignItems='center' wrap='wrap'>
            <UserLink userId={author.user_id} />
            {/* Show Artist badge only when the host is commenting in
                the Comments feed; suppress the Post Update badge in
                the Updates feed (every row there is already a host
                update — the badge was redundant). */}
            {isAuthorEventOwner && !isPostUpdate ? (
              <Text variant='label' size='xs' color='accent' strength='strong'>
                {messages.artistBadge}
              </Text>
            ) : null}
            {createdAt ? <Timestamp time={createdAt} /> : null}
          </Flex>
          {canDelete ? (
            <IconButton
              aria-label={messages.moreActions}
              icon={IconKebabHorizontal}
              size='s'
              color='subdued'
              onPress={() => {
                setIsOverflowOpen(true)
                setIsOverflowVisible(true)
              }}
            />
          ) : null}
        </Flex>
        <Text variant='body' size='s'>
          {comment.message}
        </Text>
        {videoUrl ? (
          <View style={{ marginTop: 4 }}>
            {/* Updates store YouTube / Vimeo URLs (set via the
                AttachVideoModal). VideoEmbed renders these as a
                proper iframe inside a WebView — the previous version
                of this row didn't render videos at all on mobile. */}
            <VideoEmbed url={videoUrl} />
          </View>
        ) : null}
        <Flex direction='row' gap='m' alignItems='center' pt='xs'>
          {/* Wire the heart up to useReactToComment + show the live
              count. Previously this row rendered a static IconHeart
              with no onPress and no count, which is why "favorite
              count on comments isn't working" was reported. */}
          <PlainButton
            variant='subdued'
            onPress={handleToggleLike}
            disabled={!currentUserId}
          >
            <Flex direction='row' alignItems='center' gap='xs'>
              <IconHeart
                color={
                  (comment as any).isCurrentUserReacted ? 'active' : 'subdued'
                }
                size='s'
              />
              {(comment as any).reactCount > 0 ? (
                <Text variant='body' size='s' color='subdued'>
                  {(comment as any).reactCount}
                </Text>
              ) : null}
            </Flex>
          </PlainButton>
          {canReply ? (
            <PlainButton
              variant='subdued'
              onPress={() => setIsReplying((v) => !v)}
            >
              {messages.reply}
            </PlainButton>
          ) : null}
        </Flex>
        {isReplying && currentUserId ? (
          <Flex
            direction='row'
            gap='s'
            alignItems='center'
            pt='xs'
            style={{ width: '100%' }}
          >
            <ProfilePicture
              userId={currentUserId}
              style={{ width: 28, height: 28, flexShrink: 0 }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <ComposerInput
                messageId={replyMessageId}
                placeholder={messages.composeReplyPlaceholder}
                maxLength={400}
                maxMentions={10}
                onSubmit={(value) => handleReplySubmit(value)}
              />
            </View>
          </Flex>
        ) : null}
      </Flex>
      {isOverflowVisible ? (
        <Portal hostName='DrawerPortal'>
          <ActionDrawerWithoutRedux
            rows={[
              {
                text: messages.delete,
                callback: handleDelete,
                isDestructive: true
              }
            ]}
            isOpen={isOverflowOpen}
            onClose={() => setIsOverflowOpen(false)}
            onClosed={() => setIsOverflowVisible(false)}
          />
        </Portal>
      ) : null}
    </Flex>
  )
}
