import { useMemo, useState } from 'react'

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
import { ID, SquareSizes } from '@audius/common/models'
import { dayjs, parseVideoUrl } from '@audius/common/utils'
import {
  Avatar as HarmonyAvatar,
  Box,
  Button,
  Divider,
  Flex,
  IconHeart,
  IconKebabHorizontal,
  IconStar,
  LoadingSpinner,
  Paper,
  PlainButton,
  PopupMenu,
  SelectablePill,
  Text
} from '@audius/harmony'
import { EntityType } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'

import { ComposerInput } from 'components/composer-input/ComposerInput'
import { UserLink } from 'components/link/UserLink'
import { UserGeneratedTextV2 } from 'components/user-generated-text/UserGeneratedTextV2'
import { VideoEmbed } from 'components/video-embed/VideoEmbed'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

import { Timestamp } from '../../../components/comments/Timestamp'
import { AttachVideoModal } from '../../fan-club-detail-page/components/AttachVideoModal'

const messages = {
  commentsHeading: 'Comments',
  updatesHeading: 'Updates',
  sortTop: 'Top',
  sortNewest: 'Newest',
  empty: 'Nothing here yet',
  emptyCommentsSub: 'Be the first to comment on this contest!',
  emptyUpdatesSub: 'The contest host will post announcements here.',
  composePlaceholder: 'Add a comment',
  composePostUpdatePlaceholder: 'Post an update to your contest followers…',
  composeReplyPlaceholder: 'Reply…',
  postUpdate: 'Post Update',
  attachVideo: '+ Attach Video',
  postUpdateBadge: 'Post Update',
  hostBadge: 'Host',
  loadMore: 'Load more',
  signInToComment: 'Sign in to comment.',
  reply: 'Reply',
  delete: 'Delete',
  cancel: 'Cancel'
}

export type ContestCommentsMode = 'updates' | 'comments'

type ContestCommentsTileProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
  mode: ContestCommentsMode
  hideHeading?: boolean
  hideComposer?: boolean
  hideWhenEmpty?: boolean
}

export const ContestCommentsTile = ({
  eventId,
  eventOwnerUserId,
  mode,
  hideHeading = false,
  hideComposer = false,
  hideWhenEmpty = false
}: ContestCommentsTileProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    currentUserId !== undefined &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId
  const isLoggedIn = currentUserId !== null && currentUserId !== undefined

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
  const showComposer =
    !hideComposer && (mode === 'comments' ? !isEventOwner : isEventOwner)
  const showSignInStub = !hideComposer
  const composerPlaceholder =
    mode === 'updates'
      ? messages.composePostUpdatePlaceholder
      : messages.composePlaceholder
  const showAttachVideo = mode === 'updates'

  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [showAttachVideoModal, setShowAttachVideoModal] = useState(false)

  const [messageId, setMessageId] = useState(0)

  const handleComposerClick = useRequiresAccountCallback(
    () => {},
    [],
    undefined,
    undefined,
    'account'
  )

  const handleComposerSubmit = useRequiresAccountCallback(
    (value: string) => {
      const body = value.trim()
      if (!body || !currentUserId) return
      postComment({
        userId: currentUserId,
        eventId,
        body,
        videoUrl: videoUrl && videoUrl.trim().length > 0 ? videoUrl : undefined
      })
      setVideoUrl(undefined)
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, eventId, postComment, videoUrl]
  )

  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const queryClient = useQueryClient()
  const allItems = feedItems ?? []
  const filteredItems = allItems.filter(({ commentId }) => {
    const comment = queryClient.getQueryData(getCommentQueryKey(commentId))
    if (!comment) {
      return true
    }
    const parentCommentId = (comment as any).parentCommentId
    const isPostUpdate =
      eventOwnerUserId !== undefined &&
      (comment as any).userId === eventOwnerUserId &&
      !parentCommentId
    return mode === 'updates' ? isPostUpdate : !isPostUpdate
  })

  if (
    hideWhenEmpty &&
    !isPending &&
    filteredItems.length === 0 &&
    (hideComposer || !showComposer)
  ) {
    return null
  }

  return (
    <Paper
      w='100%'
      direction='column'
      gap='m'
      p='l'
      borderRadius='m'
      border='default'
      backgroundColor='white'
      shadow='flat'
    >
      {/* Title line — "COMMENTS (N)" uppercase label, mirrors FOLLOWERS
          and STEMS & DOWNLOADS treatment. No IconMessage: the Figma
          right-column tile uses just the label. Hidden when the caller
          already provides a title (e.g. mobile Updates tab, where the
          tab itself is labeled "Updates"). */}
      {hideHeading ? null : (
        <Flex gap='xs' alignItems='baseline'>
          <Text variant='label' size='m' color='subdued'>
            {heading.toUpperCase()}
          </Text>
          {filteredItems.length > 0 ? (
            <Text variant='label' size='m' color='subdued'>
              ({filteredItems.length})
            </Text>
          ) : null}
        </Flex>
      )}

      {/* Composer */}
      {showComposer ? (
        <Flex direction='column' gap='m' w='100%'>
          <Flex w='100%' gap='s' alignItems='center'>
            {isLoggedIn ? (
              <HarmonyAvatar
                size='auto'
                borderWidth='thin'
                isLoading={false}
                src={profileImage}
                css={{ width: 32, height: 32, flexShrink: 0 }}
              />
            ) : null}
            <Box css={{ flex: 1, minWidth: 0 }}>
              {/* ComposerInput renders its own send affordance + Enter
                  submit, so no external send button is needed. Matches
                  the track-page CommentForm. */}
              <ComposerInput
                messageId={messageId}
                entityId={eventId}
                entityType={EntityType.EVENT}
                placeholder={composerPlaceholder}
                maxLength={400}
                maxMentions={10}
                onClick={handleComposerClick}
                onSubmit={(value) => handleComposerSubmit(value)}
                disabled={isPosting}
                readOnly={!isLoggedIn}
                blurOnSubmit
              />
            </Box>
          </Flex>

          {showAttachVideo ? (
            <AttachVideoComposerRow
              videoUrl={videoUrl}
              onClear={() => setVideoUrl(undefined)}
              onOpen={() => setShowAttachVideoModal(true)}
            />
          ) : null}
        </Flex>
      ) : showSignInStub && !currentUserId ? (
        <Box p='m'>
          <Text variant='body' size='s' color='subdued'>
            {messages.signInToComment}
          </Text>
        </Box>
      ) : null}

      {/* Divider between composer and feed — matches the thin
          separator in Figma node 2857-99394. Only shown when there's
          a composer above; otherwise the feed runs straight under the
          title. */}
      {showComposer ? <Divider /> : null}

      {/* Sort pills (comments panel only, and only once there are items
          worth sorting — Figma empty-state has no pills). */}
      {showSortTabs && filteredItems.length > 0 ? (
        <Flex gap='s'>
          <SelectablePill
            type='button'
            size='small'
            isSelected={sortMethod === 'top'}
            label={messages.sortTop}
            onClick={() => setSortMethod('top')}
          />
          <SelectablePill
            type='button'
            size='small'
            isSelected={sortMethod === 'newest'}
            label={messages.sortNewest}
            onClick={() => setSortMethod('newest')}
          />
        </Flex>
      ) : null}

      {/* Feed */}
      {isPending ? (
        <Flex justifyContent='center' p='xl'>
          <LoadingSpinner />
        </Flex>
      ) : !filteredItems.length ? (
        <Flex direction='column' alignItems='center' gap='xs' pv='2xl' ph='l'>
          <Text variant='body' size='m' color='default'>
            {messages.empty}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {mode === 'updates'
              ? messages.emptyUpdatesSub
              : messages.emptyCommentsSub}
          </Text>
        </Flex>
      ) : (
        <Flex direction='column' gap='l' w='100%'>
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
            <Flex justifyContent='center' pt='s'>
              <Button
                variant='secondary'
                size='small'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {messages.loadMore}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      )}

      {showAttachVideo ? (
        <AttachVideoModal
          isOpen={showAttachVideoModal}
          onClose={() => setShowAttachVideoModal(false)}
          onAttach={(url) => setVideoUrl(url)}
        />
      ) : null}
    </Paper>
  )
}

type AttachVideoComposerRowProps = {
  videoUrl: string | undefined
  onClear: () => void
  onOpen: () => void
}

const AttachVideoComposerRow = ({
  videoUrl,
  onClear,
  onOpen
}: AttachVideoComposerRowProps) => {
  const parsed = useMemo(
    () => (videoUrl ? parseVideoUrl(videoUrl) : null),
    [videoUrl]
  )
  return (
    <Flex direction='row' alignItems='center' gap='m' w='100%'>
      {videoUrl && parsed ? (
        <Flex
          alignItems='center'
          gap='s'
          css={(theme) => ({
            position: 'relative',
            border: `1px solid ${theme.color.border.default}`,
            borderRadius: theme.cornerRadius.s,
            paddingInline: theme.spacing.s,
            paddingBlock: theme.spacing.xs
          })}
        >
          <Text variant='body' size='s' color='subdued'>
            {parsed.platform === 'youtube' ? 'YouTube' : 'Vimeo'} video attached
          </Text>
          <Button size='xs' variant='secondary' onClick={onClear}>
            {messages.cancel}
          </Button>
        </Flex>
      ) : (
        <PlainButton
          type='button'
          variant='subdued'
          onClick={onOpen}
          css={{ alignSelf: 'flex-start' }}
        >
          {messages.attachVideo}
        </PlainButton>
      )}
    </Flex>
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
  const { mutate: reactToComment } = useReactToComment()
  const { mutate: deleteComment } = useDeleteComment()
  const { mutate: postComment } = usePostEventComment()
  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const [isReplying, setIsReplying] = useState(false)
  const [replyMessageId, setReplyMessageId] = useState(0)

  if (!comment || !author) return null

  const parentCommentId: ID | undefined =
    'parentCommentId' in comment
      ? ((comment as any).parentCommentId ?? undefined)
      : undefined

  const isPostUpdate =
    eventOwnerUserId !== undefined &&
    comment.userId === eventOwnerUserId &&
    !parentCommentId

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
  const canReply = currentUserId !== null && !isPostUpdate

  const videoUrl: string | undefined =
    'videoUrl' in comment ? ((comment as any).videoUrl ?? undefined) : undefined

  const createdAt: Date | undefined =
    'createdAt' in comment && (comment as any).createdAt
      ? dayjs((comment as any).createdAt).toDate()
      : undefined

  const handleDelete = () => {
    if (!currentUserId) return
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
      trackId: eventId,
      currentSort: undefined,
      parentCommentId
    })
  }

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

  return (
    <Flex direction='row' gap='m' alignItems='flex-start' w='100%'>
      <UserAvatar userId={author.user_id} />
      <Flex direction='column' gap='xs' css={{ flex: 1, minWidth: 0 }}>
        {/* Header row mirrors the track-page CommentBlock layout —
            user link + timestamp on the left, Host badge on the
            right. Overflow kebab moved out of this row and into the
            action bar below so it sits next to Reply (matches the
            track-page CommentActionBar). */}
        <Flex
          justifyContent='space-between'
          alignItems='center'
          gap='s'
          w='100%'
        >
          <Flex
            gap='s'
            alignItems='center'
            css={{ minWidth: 0, flexWrap: 'wrap' }}
          >
            <UserLink userId={author.user_id} />
            {createdAt ? <Timestamp time={createdAt} /> : null}
          </Flex>
          {/* Host badge: shown when the contest owner comments in the
              Comments feed. Suppressed in the Updates feed because
              every row there is already a host update — the label
              would be redundant. Visual treatment matches the
              track-page CommentBadge (IconStar + accent text). */}
          {isAuthorEventOwner && !isPostUpdate ? (
            <Box css={{ flexShrink: 0 }}>
              <Flex gap='xs' alignItems='center'>
                <IconStar color='accent' size='2xs' />
                <Text color='accent' variant='body' size='s'>
                  {messages.hostBadge}
                </Text>
              </Flex>
            </Box>
          ) : null}
        </Flex>
        <UserGeneratedTextV2
          variant='body'
          size='s'
          mentions={comment.mentions ?? []}
        >
          {comment.message}
        </UserGeneratedTextV2>
        {videoUrl ? (
          <Box mt='xs'>
            {/* Updates only accept YouTube / Vimeo URLs (set via the
                AttachVideoModal), so the right primitive is the same
                iframe-based `VideoEmbed` we use elsewhere. The previous
                `<video src>` tag tried to play these as raw HTML5
                media, which fails on YouTube — the platform serves a
                webpage, not a media stream — and rendered as a black
                player with a zero-second duration. */}
            <VideoEmbed url={videoUrl} />
          </Box>
        ) : null}
        {/* Action bar: heart, Reply, overflow kebab. Same shape as the
            track-page CommentActionBar so contest comments read like
            normal comments. The overflow kebab used to sit in the
            header; moving it here stops the row from wrapping when the
            user link + timestamp + badge are wide. */}
        <Flex gap='m' alignItems='center' pt='xs'>
          <Flex
            gap='xs'
            alignItems='center'
            onClick={() => {
              if (!currentUserId) return
              const nextIsLiked = !(comment as any).isCurrentUserReacted
              reactToComment({
                commentId,
                userId: currentUserId,
                isLiked: nextIsLiked,
                trackId: eventId,
                entityType: 'Event',
                isEntityOwner:
                  eventOwnerUserId !== undefined &&
                  currentUserId === eventOwnerUserId,
                currentSort: undefined
              })
            }}
            css={{ cursor: currentUserId ? 'pointer' : 'default' }}
          >
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
          {canReply ? (
            <PlainButton
              type='button'
              variant='subdued'
              onClick={() => setIsReplying((v) => !v)}
            >
              {messages.reply}
            </PlainButton>
          ) : null}
          {canDelete ? (
            <PopupMenu
              items={[{ text: messages.delete, onClick: handleDelete }]}
              renderTrigger={(anchorRef, triggerPopup) => (
                <Box
                  ref={anchorRef as any}
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerPopup()
                  }}
                  css={{ cursor: 'pointer', lineHeight: 0 }}
                >
                  <IconKebabHorizontal size='s' color='subdued' />
                </Box>
              )}
            />
          ) : null}
        </Flex>
        {isReplying && currentUserId ? (
          <Flex direction='row' gap='s' alignItems='center' pt='xs' w='100%'>
            <HarmonyAvatar
              size='auto'
              borderWidth='thin'
              isLoading={false}
              src={profileImage}
              css={{ width: 28, height: 28, flexShrink: 0 }}
            />
            <Box css={{ flex: 1, minWidth: 0 }}>
              <ComposerInput
                messageId={replyMessageId}
                entityId={eventId}
                entityType={EntityType.EVENT}
                placeholder={messages.composeReplyPlaceholder}
                maxLength={400}
                maxMentions={10}
                onSubmit={(value) => handleReplySubmit(value)}
                blurOnSubmit
              />
            </Box>
          </Flex>
        ) : null}
        {/* Nested replies. The API returns top-level comments with each
            reply nested in `comment.replies`; render those inline below
            the parent so users can see the conversation. Skipped in
            Updates mode because Updates can't be replied to. */}
        {!isPostUpdate &&
        (comment as any).replies &&
        (comment as any).replies.length > 0 ? (
          <Flex direction='column' gap='m' pt='xs' w='100%'>
            {((comment as any).replies as any[]).map((reply) => (
              <ContestCommentReplyRow
                key={reply.id}
                reply={reply}
                eventId={eventId}
                eventOwnerUserId={eventOwnerUserId}
                parentCommentId={commentId}
              />
            ))}
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}

type ContestCommentReplyRowProps = {
  reply: any
  eventId: ID
  eventOwnerUserId: ID | undefined
  parentCommentId: ID
}

const ContestCommentReplyRow = ({
  reply,
  eventId,
  eventOwnerUserId,
  parentCommentId
}: ContestCommentReplyRowProps) => {
  const queryClient = useQueryClient()
  const { data: author } = useUser(reply.userId)
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: reactToComment } = useReactToComment()
  const { mutate: deleteComment } = useDeleteComment()

  if (!author) return null

  const isAuthorEventOwner =
    eventOwnerUserId !== undefined && reply.userId === eventOwnerUserId
  const isCurrentUserHost =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId
  const isCurrentUserAuthor =
    currentUserId !== null && reply.userId === currentUserId
  const canDelete = isCurrentUserHost || isCurrentUserAuthor
  const createdAt: Date | undefined = reply.createdAt
    ? dayjs(reply.createdAt).toDate()
    : undefined

  const handleDelete = () => {
    if (!currentUserId) return
    queryClient.setQueryData(getCommentQueryKey(parentCommentId), (prev) => {
      if (!prev) return prev
      const parent = prev as any
      return {
        ...parent,
        replies: (parent.replies ?? []).filter((r: any) => r.id !== reply.id),
        replyCount: Math.max(0, (parent.replyCount ?? 0) - 1)
      }
    })
    deleteComment({
      commentId: reply.id,
      userId: currentUserId,
      trackId: eventId,
      currentSort: undefined,
      parentCommentId
    })
  }

  return (
    <Flex direction='row' gap='m' alignItems='flex-start' w='100%'>
      <UserAvatar userId={author.user_id} />
      <Flex direction='column' gap='xs' css={{ flex: 1, minWidth: 0 }}>
        <Flex
          gap='s'
          alignItems='center'
          wrap='wrap'
          justifyContent='space-between'
        >
          <Flex gap='s' alignItems='center' wrap='wrap'>
            <UserLink userId={author.user_id} />
            {createdAt ? <Timestamp time={createdAt} /> : null}
          </Flex>
          <Flex gap='s' alignItems='center' css={{ flexShrink: 0 }}>
            {isAuthorEventOwner ? (
              <Text variant='label' size='xs' color='accent' strength='strong'>
                {messages.hostBadge}
              </Text>
            ) : null}
            {canDelete ? (
              <PopupMenu
                items={[{ text: messages.delete, onClick: handleDelete }]}
                renderTrigger={(anchorRef, triggerPopup) => (
                  <Box
                    ref={anchorRef as any}
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerPopup()
                    }}
                    css={{ cursor: 'pointer', lineHeight: 0 }}
                  >
                    <IconKebabHorizontal size='s' color='subdued' />
                  </Box>
                )}
              />
            ) : null}
          </Flex>
        </Flex>
        <UserGeneratedTextV2
          variant='body'
          size='s'
          mentions={reply.mentions ?? []}
        >
          {reply.message}
        </UserGeneratedTextV2>
        <Flex gap='m' alignItems='center' pt='xs'>
          <Flex
            gap='xs'
            alignItems='center'
            onClick={() => {
              if (!currentUserId) return
              const nextIsLiked = !reply.isCurrentUserReacted
              reactToComment({
                commentId: reply.id,
                userId: currentUserId,
                isLiked: nextIsLiked,
                trackId: eventId,
                entityType: 'Event',
                isEntityOwner:
                  eventOwnerUserId !== undefined &&
                  currentUserId === eventOwnerUserId,
                currentSort: undefined
              })
            }}
            css={{ cursor: currentUserId ? 'pointer' : 'default' }}
          >
            <IconHeart
              color={reply.isCurrentUserReacted ? 'active' : 'subdued'}
              size='s'
            />
            {reply.reactCount > 0 ? (
              <Text variant='body' size='s' color='subdued'>
                {reply.reactCount}
              </Text>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

type UserAvatarProps = {
  userId: ID
}

const UserAvatar = ({ userId }: UserAvatarProps) => {
  const src = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })
  return (
    <HarmonyAvatar
      src={src}
      borderWidth='thin'
      css={{ width: 40, height: 40, flexShrink: 0 }}
    />
  )
}
