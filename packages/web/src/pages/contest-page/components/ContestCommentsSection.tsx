import { useCallback, useState } from 'react'

import {
  useComment,
  useCurrentUserId,
  useEventComments,
  usePostEventComment,
  useUser
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconCamera,
  LoadingSpinner,
  Paper,
  PlainButton,
  SelectablePill,
  Text,
  TextInput
} from '@audius/harmony'

import { UserLink } from 'components/link/UserLink'

const messages = {
  heading: 'Contest Feed',
  commentsHeading: 'Comments',
  updatesHeading: 'Updates',
  sortTop: 'Top',
  sortNewest: 'Newest',
  subheading: 'Post updates from the artist and comments from the community.',
  empty: 'Nothing here yet',
  emptySub: 'Be the first to start the conversation on this contest!',
  emptyUpdates: 'No updates yet',
  emptyUpdatesSub: 'The contest host will post announcements here.',
  emptyComments: 'Nothing here yet',
  emptyCommentsSub: 'Be the first to comment on this contest!',
  composePlaceholder: 'Add a comment…',
  composePostUpdatePlaceholder: 'Post an update to your contest followers…',
  post: 'Post',
  postUpdate: 'Post Update',
  attachVideo: 'Attach Video',
  videoUrlPlaceholder: 'Paste a video URL (MP4 or HLS)',
  postUpdateBadge: 'Post Update',
  loadMore: 'Load more',
  signInToComment: 'Sign in to comment.'
}

/**
 * - `feed` is the legacy single-pane layout (updates + comments together).
 *   Kept for the mobile contest page which hasn't been redesigned yet.
 * - `updates` renders only host-authored top-level posts; composer shown
 *   only to the host.
 * - `comments` renders everything that *isn't* a host post-update
 *   (community comments + replies). Composer shown to every signed-in user.
 */
type ContestCommentsSectionMode = 'feed' | 'updates' | 'comments'

type ContestCommentsSectionProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
  mode?: ContestCommentsSectionMode
}

/**
 * A Paper-wrapped comment stream for a remix-contest event.
 *
 * Two types of content share the same feed:
 *  - **Post updates**: top-level comments authored by the event owner. These
 *    are rendered with a "Post Update" badge and, in the backend indexer,
 *    fan out a notification to every follower of the event.
 *  - **User comments**: anyone else's top-level comments (no badge).
 *
 * Artist *replies* to user comments are NOT post updates — they render as
 * regular comments. This is enforced server-side (only root-level comments
 * by the event owner trigger the notification fanout) and mirrored here.
 */
export const ContestCommentsSection = ({
  eventId,
  eventOwnerUserId,
  mode = 'feed'
}: ContestCommentsSectionProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId

  const showComposer =
    currentUserId !== null &&
    (mode === 'feed' || mode === 'comments' || isEventOwner)
  // The Top/Newest sort toggle only makes sense on the Comments panel.
  // Updates is owner-curated and Feed is the legacy single-pane mobile
  // view; both pin to newest-first.
  const showSortTabs = mode === 'comments'
  const composerLabel =
    mode === 'updates' || (mode === 'feed' && isEventOwner)
      ? messages.postUpdate
      : messages.post
  const composerPlaceholder =
    mode === 'updates' || (mode === 'feed' && isEventOwner)
      ? messages.composePostUpdatePlaceholder
      : messages.composePlaceholder
  const heading =
    mode === 'updates'
      ? messages.updatesHeading
      : mode === 'comments'
        ? messages.commentsHeading
        : messages.heading
  const showSubheading = mode === 'feed'
  const emptyMessage =
    mode === 'updates'
      ? messages.emptyUpdates
      : mode === 'comments'
        ? messages.emptyComments
        : messages.empty
  const emptySubMessage =
    mode === 'updates'
      ? messages.emptyUpdatesSub
      : mode === 'comments'
        ? messages.emptyCommentsSub
        : messages.emptySub

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

  const [draft, setDraft] = useState('')
  const [videoUrlOpen, setVideoUrlOpen] = useState(false)
  const [videoUrlDraft, setVideoUrlDraft] = useState('')

  // Attach-video is only meaningful on the Updates feed (host-authored
  // post-updates). Hide the affordance on plain community comments.
  const showAttachVideo =
    mode === 'updates' || (mode === 'feed' && isEventOwner)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const body = draft.trim()
      if (!body || !currentUserId) return
      const videoUrl = videoUrlDraft.trim()
      postComment({
        userId: currentUserId,
        eventId,
        body,
        videoUrl: videoUrl.length > 0 ? videoUrl : undefined
      })
      setDraft('')
      setVideoUrlDraft('')
      setVideoUrlOpen(false)
    },
    [draft, currentUserId, eventId, postComment, videoUrlDraft]
  )

  return (
    <Flex direction='column' gap='l'>
      <Flex direction='column' gap='xs'>
        <Text variant='heading' size='s'>
          {heading}
        </Text>
        {showSubheading ? (
          <Text variant='body' size='s' color='subdued'>
            {messages.subheading}
          </Text>
        ) : null}
      </Flex>

      {showSortTabs ? (
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

      {/* Compose box. In "updates" mode only the host sees it; in
          "comments"/"feed" every signed-in user sees it. */}
      {showComposer ? (
        <Paper
          direction='column'
          p='l'
          gap='s'
          borderRadius='m'
          border='default'
          css={{ backgroundColor: 'var(--harmony-white)' }}
        >
          <form onSubmit={handleSubmit}>
            <Flex direction='column' gap='m'>
              <TextInput
                label=''
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={composerPlaceholder}
              />
              {videoUrlOpen ? (
                <TextInput
                  label=''
                  value={videoUrlDraft}
                  onChange={(e) => setVideoUrlDraft(e.target.value)}
                  placeholder={messages.videoUrlPlaceholder}
                />
              ) : null}
              <Flex justifyContent='space-between' alignItems='center'>
                {showAttachVideo ? (
                  <PlainButton
                    type='button'
                    variant='subdued'
                    iconLeft={IconCamera}
                    onClick={() => setVideoUrlOpen((v) => !v)}
                  >
                    {messages.attachVideo}
                  </PlainButton>
                ) : (
                  <Box />
                )}
                <Button
                  type='submit'
                  variant='primary'
                  size='small'
                  disabled={!draft.trim() || isPosting}
                >
                  {composerLabel}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Paper>
      ) : currentUserId ? null : (
        <Box p='m'>
          <Text variant='body' size='s' color='subdued'>
            {messages.signInToComment}
          </Text>
        </Box>
      )}

      <Divider />

      {/* Feed */}
      {isPending ? (
        <Flex justifyContent='center' p='xl'>
          <LoadingSpinner />
        </Flex>
      ) : !feedItems || feedItems.length === 0 ? (
        <Flex direction='column' alignItems='center' gap='xs' p='xl'>
          <Text variant='body' size='m' color='default' strength='strong'>
            {emptyMessage}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {emptySubMessage}
          </Text>
        </Flex>
      ) : (
        <Flex direction='column' gap='m'>
          {feedItems.map(({ commentId }) => (
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
    </Flex>
  )
}

type ContestCommentRowProps = {
  commentId: ID
  eventOwnerUserId: ID | undefined
  mode: ContestCommentsSectionMode
}

/**
 * A single comment card. If the author is the event owner AND this is a
 * top-level comment (parent_comment_id null), render a "Post Update" badge.
 * Replies (even by the event owner) are plain.
 *
 * Honors `mode` so the same feed can be filtered down to "updates only"
 * (host top-level posts) or "comments only" (everything else).
 */
const ContestCommentRow = ({
  commentId,
  eventOwnerUserId,
  mode
}: ContestCommentRowProps) => {
  const { data: comment } = useComment(commentId)
  const { data: author } = useUser(comment?.userId)

  if (!comment || !author) return null

  const isPostUpdate =
    eventOwnerUserId !== undefined &&
    comment.userId === eventOwnerUserId &&
    // Parent id is unset on top-level comments. Replies authored by the
    // artist are *not* post updates.
    !('parentCommentId' in comment && comment.parentCommentId)

  // Client-side filter: updates-only panel drops non-updates, and the
  // comments panel drops updates so they don't double-appear alongside
  // the dedicated Updates feed.
  if (mode === 'updates' && !isPostUpdate) return null
  if (mode === 'comments' && isPostUpdate) return null

  const videoUrl: string | undefined =
    'videoUrl' in comment ? ((comment as any).videoUrl ?? undefined) : undefined

  return (
    <Paper
      direction='column'
      p='l'
      gap='s'
      borderRadius='m'
      border='default'
      css={{ backgroundColor: 'var(--harmony-white)' }}
    >
      <Flex justifyContent='space-between' alignItems='center'>
        <UserLink userId={author.user_id} />
        {isPostUpdate ? (
          <Text variant='label' size='s' color='accent'>
            {messages.postUpdateBadge}
          </Text>
        ) : null}
      </Flex>
      <Text variant='body' size='m'>
        {comment.message}
      </Text>
      {videoUrl ? (
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
      ) : null}
    </Paper>
  )
}
