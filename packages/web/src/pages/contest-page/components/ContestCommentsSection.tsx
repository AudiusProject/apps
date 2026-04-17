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
  LoadingSpinner,
  Paper,
  Text,
  TextInput
} from '@audius/harmony'

import { UserLink } from 'components/link/UserLink'

const messages = {
  heading: 'Contest Feed',
  subheading: 'Post updates from the artist and comments from the community.',
  empty: 'No posts yet. Be the first to start the conversation.',
  composePlaceholder: 'Add a comment…',
  composePostUpdatePlaceholder: 'Post an update to your contest followers…',
  post: 'Post',
  postUpdate: 'Post Update',
  postUpdateBadge: 'Post Update',
  loadMore: 'Load more',
  signInToComment: 'Sign in to comment.'
}

type ContestCommentsSectionProps = {
  eventId: ID
  eventOwnerUserId: ID | undefined
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
  eventOwnerUserId
}: ContestCommentsSectionProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isEventOwner =
    currentUserId !== null &&
    eventOwnerUserId !== undefined &&
    currentUserId === eventOwnerUserId

  const {
    data: feedItems,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useEventComments({ eventId, sortMethod: 'newest' })

  const { mutate: postComment, isPending: isPosting } = usePostEventComment()

  const [draft, setDraft] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const body = draft.trim()
      if (!body || !currentUserId) return
      postComment({
        userId: currentUserId,
        eventId,
        body
      })
      setDraft('')
    },
    [draft, currentUserId, eventId, postComment]
  )

  return (
    <Flex direction='column' gap='l'>
      <Flex direction='column' gap='xs'>
        <Text variant='heading' size='s'>
          {messages.heading}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {messages.subheading}
        </Text>
      </Flex>

      {/* Compose box — always visible when signed in. The same box
          serves both "post update" and "normal comment" — whether the
          result is tagged as a post update is decided server-side. */}
      {currentUserId ? (
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
                placeholder={
                  isEventOwner
                    ? messages.composePostUpdatePlaceholder
                    : messages.composePlaceholder
                }
              />
              <Flex justifyContent='flex-end'>
                <Button
                  type='submit'
                  variant='primary'
                  size='small'
                  disabled={!draft.trim() || isPosting}
                >
                  {isEventOwner ? messages.postUpdate : messages.post}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Paper>
      ) : (
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
        <Box p='l'>
          <Text variant='body' size='s' color='subdued'>
            {messages.empty}
          </Text>
        </Box>
      ) : (
        <Flex direction='column' gap='m'>
          {feedItems.map(({ commentId }) => (
            <ContestCommentRow
              key={commentId}
              commentId={commentId}
              eventOwnerUserId={eventOwnerUserId}
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
}

/**
 * A single comment card. If the author is the event owner AND this is a
 * top-level comment (parent_comment_id null), render a "Post Update" badge.
 * Replies (even by the event owner) are plain.
 */
const ContestCommentRow = ({
  commentId,
  eventOwnerUserId
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
    </Paper>
  )
}
