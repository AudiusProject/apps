import { useCallback, useState } from 'react'

import {
  getCommentQueryKey,
  useComment,
  useCurrentUserId,
  useEventComments,
  usePostEventComment,
  useUser
} from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import {
  Avatar as HarmonyAvatar,
  Box,
  Button,
  Divider,
  Flex,
  IconCamera,
  IconHeart,
  LoadingSpinner,
  Paper,
  PlainButton,
  SelectablePill,
  Text,
  TextInput
} from '@audius/harmony'
import { EntityType } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'

import { ComposerInput } from 'components/composer-input/ComposerInput'
import { UserLink } from 'components/link/UserLink'
import { useProfilePicture } from 'hooks/useProfilePicture'

import { Timestamp } from '../../../components/comments/Timestamp'

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
  postUpdate: 'Post Update',
  attachVideo: 'Attach Video',
  videoUrlPlaceholder: 'Paste a video URL (MP4 or HLS)',
  postUpdateBadge: 'Post Update',
  artistBadge: 'Artist',
  loadMore: 'Load more',
  signInToComment: 'Sign in to comment.'
}

/**
 * - `updates` renders only host-authored top-level posts. Composer shown
 *   only to the host; composer exposes an Attach Video affordance.
 * - `comments` renders everything that *isn't* a host post-update
 *   (community comments + replies). Composer shown to every signed-in
 *   user. No video attach — that's host-only.
 */
export type ContestCommentsMode = 'updates' | 'comments'

type ContestCommentsTileProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
  mode: ContestCommentsMode
}

/**
 * A tile-wrapped comments feed for a remix-contest event. Visually
 * mirrors the track-page `CommentPreview` so the contest page reads
 * like the rest of Audius: IconMessage + title header, elevated Paper
 * tile around a rich composer (avatar + ComposerInput + send button),
 * sort pills, and avatar-led comment rows with an Artist badge for the
 * event host.
 *
 * We don't route through `CommentSectionProvider` because that provider
 * is track-scoped (requires `useTrack`, `useGatedContentAccess`, a
 * lineup UID for `playTrack`, etc.). Events are a new entity type for
 * comments; rather than bend the track provider to pretend to have a
 * track, this component wires up the event-comment hooks directly and
 * composes a few of the same building blocks (ComposerInput, UserLink,
 * Timestamp). The visual vocabulary matches — that's what the user
 * sees — and the provider can be generalised later as coins/other
 * entities join comments.
 */
export const ContestCommentsTile = ({
  eventId,
  eventOwnerUserId,
  mode
}: ContestCommentsTileProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId

  // Sort toggle lives on the Comments panel only. Updates is host-curated
  // and always pinned to newest-first.
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
    currentUserId !== null && (mode === 'comments' || isEventOwner)
  const composerPlaceholder =
    mode === 'updates'
      ? messages.composePostUpdatePlaceholder
      : messages.composePlaceholder
  const showAttachVideo = mode === 'updates'

  // Composer local state. videoUrl is owner-only (Updates mode).
  const [videoUrlOpen, setVideoUrlOpen] = useState(false)
  const [videoUrlDraft, setVideoUrlDraft] = useState('')

  // Incrementing messageId "clears" the ComposerInput after submit — the
  // track page uses the same pattern.
  const [messageId, setMessageId] = useState(0)

  const handleComposerSubmit = useCallback(
    (value: string) => {
      const body = value.trim()
      if (!body || !currentUserId) return
      const trimmedVideoUrl = videoUrlDraft.trim()
      postComment({
        userId: currentUserId,
        eventId,
        body,
        videoUrl: trimmedVideoUrl.length > 0 ? trimmedVideoUrl : undefined
      })
      setVideoUrlDraft('')
      setVideoUrlOpen(false)
      setMessageId((prev) => prev + 1)
    },
    [currentUserId, eventId, postComment, videoUrlDraft]
  )

  const profileImage = useProfilePicture({
    userId: currentUserId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  // `useEventComments` primes each comment into the React Query cache
  // via `primeCommentData` when the page fetch resolves, so each
  // `useComment(commentId)` hit would be synchronous. We use the same
  // cache here at parent level to pre-filter feedItems by mode — that
  // way the empty-state renders when a mixed feed contains no host
  // post-updates (Updates mode) or is entirely host post-updates
  // (Comments mode), instead of showing a blank Paper interior.
  const queryClient = useQueryClient()
  const allItems = feedItems ?? []
  const filteredItems = allItems.filter(({ commentId }) => {
    const comment = queryClient.getQueryData(getCommentQueryKey(commentId))
    if (!comment) {
      // Cache miss (e.g. comment still loading) — keep the row; the
      // per-row filter in ContestCommentRow will hide it once the
      // author data arrives. This is rare because primeCommentData
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
          right-column tile uses just the label. */}
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

      {/* Composer */}
      {showComposer ? (
        <Flex direction='column' gap='m' w='100%'>
          <Flex w='100%' gap='s' alignItems='center'>
            <HarmonyAvatar
              size='auto'
              isLoading={false}
              src={profileImage}
              css={{ width: 32, height: 32, flexShrink: 0 }}
            />
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
                onSubmit={(value) => handleComposerSubmit(value)}
                disabled={isPosting}
                blurOnSubmit
              />
            </Box>
          </Flex>

          {showAttachVideo ? (
            <Flex direction='column' gap='s' w='100%'>
              <PlainButton
                type='button'
                variant='subdued'
                iconLeft={IconCamera}
                onClick={() => setVideoUrlOpen((v) => !v)}
                css={{ alignSelf: 'flex-start' }}
              >
                {messages.attachVideo}
              </PlainButton>
              {videoUrlOpen ? (
                <TextInput
                  label=''
                  value={videoUrlDraft}
                  onChange={(e) => setVideoUrlDraft(e.target.value)}
                  placeholder={messages.videoUrlPlaceholder}
                />
              ) : null}
            </Flex>
          ) : null}
        </Flex>
      ) : currentUserId ? null : (
        <Box p='m'>
          <Text variant='body' size='s' color='subdued'>
            {messages.signInToComment}
          </Text>
        </Box>
      )}

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
    </Paper>
  )
}

type ContestCommentRowProps = {
  commentId: ID
  eventOwnerUserId: ID | undefined
  mode: ContestCommentsMode
}

/**
 * Row renderer. Visually mirrors the track-page `CommentBlock` — avatar
 * on the left, then the content column with user link + Artist badge
 * + relative timestamp, then the message body, optional video, and
 * placeholder reaction affordances.
 *
 * Mode-based filtering is applied here (not at the parent) because we
 * only know each comment's author + parentCommentId after the
 * `useComment` fetch resolves. Non-matching rows return null.
 */
const ContestCommentRow = ({
  commentId,
  eventOwnerUserId,
  mode
}: ContestCommentRowProps) => {
  const { data: comment } = useComment(commentId)
  const { data: author } = useUser(comment?.userId)

  if (!comment || !author) return null

  const parentCommentId: ID | undefined =
    'parentCommentId' in comment
      ? ((comment as any).parentCommentId ?? undefined)
      : undefined

  const isPostUpdate =
    eventOwnerUserId !== undefined &&
    comment.userId === eventOwnerUserId &&
    !parentCommentId

  // Client-side mode filter. See parent comment re: placement.
  if (mode === 'updates' && !isPostUpdate) return null
  if (mode === 'comments' && isPostUpdate) return null

  const isAuthorEventOwner =
    eventOwnerUserId !== undefined && comment.userId === eventOwnerUserId

  const videoUrl: string | undefined =
    'videoUrl' in comment ? ((comment as any).videoUrl ?? undefined) : undefined

  const createdAt: Date | undefined =
    'createdAt' in comment && (comment as any).createdAt
      ? dayjs((comment as any).createdAt).toDate()
      : undefined

  return (
    <Flex direction='row' gap='m' alignItems='flex-start' w='100%'>
      <UserAvatar userId={author.user_id} />
      <Flex direction='column' gap='xs' css={{ flex: 1, minWidth: 0 }}>
        <Flex gap='s' alignItems='center' wrap='wrap'>
          <UserLink userId={author.user_id} />
          {isAuthorEventOwner ? (
            <Text variant='label' size='xs' color='accent' strength='strong'>
              {isPostUpdate ? messages.postUpdateBadge : messages.artistBadge}
            </Text>
          ) : null}
          {createdAt ? <Timestamp time={createdAt} /> : null}
        </Flex>
        <Text variant='body' size='s'>
          {comment.message}
        </Text>
        {videoUrl ? (
          <Box mt='xs'>
            <video
              controls
              src={videoUrl}
              style={{
                width: '100%',
                maxHeight: 340,
                borderRadius: 8,
                backgroundColor: '#000'
              }}
            />
          </Box>
        ) : null}
        {/* Reaction placeholder. The track-page `CommentActionBar`
            hard-depends on track context (pinned_comment_id,
            track.permalink, etc.), so we render a visual-only
            heart stub for now. Wiring event comment reactions is a
            separate server feature. */}
        <Flex gap='m' alignItems='center' pt='xs'>
          <Flex gap='xs' alignItems='center'>
            <IconHeart color='subdued' size='s' />
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}

type UserAvatarProps = {
  userId: ID
}

/**
 * Small 40x40 avatar disc backed by the user's profile picture.
 * Mirrors what `CommentBlock` uses for the leading avatar column.
 */
const UserAvatar = ({ userId }: UserAvatarProps) => {
  const src = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_150_BY_150
  })
  return (
    <HarmonyAvatar src={src} css={{ width: 40, height: 40, flexShrink: 0 }} />
  )
}
