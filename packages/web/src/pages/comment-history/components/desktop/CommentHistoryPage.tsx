import { useCallback, useMemo } from 'react'

import {
  CommentOrReply,
  useTrack,
  useUserByParams,
  useUserComments
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import { profilePage } from '@audius/common/src/utils/route'
import {
  Box,
  Button,
  Flex,
  IconHeart,
  IconMessage,
  LoadingSpinner,
  Paper,
  Skeleton,
  Text,
  TextLink
} from '@audius/harmony'
import dayjs from 'dayjs'
import InfiniteScroll from 'react-infinite-scroller'
import { useNavigate } from 'react-router'

import { Avatar } from 'components/avatar'
import { CommentBlockSkeletons } from 'components/comments/CommentSkeletons'
import { CommentText } from 'components/comments/CommentText'
import { Timestamp } from 'components/comments/Timestamp'
import { Header } from 'components/header/desktop/Header'
import { TrackLink, UserLink } from 'components/link'
import Page from 'components/page/Page'
import { useMainContentRef } from 'pages/MainContentContext'
import { useProfileParams } from 'pages/profile-page/useProfileParams'
import { make, track as trackEvent } from 'services/analytics'
import { fullCommentHistoryPage } from 'utils/route'

const messages = {
  description: (userName: string | null) =>
    `Comment History${userName ? ` for ${userName}` : ''}`,
  by: ' by ',
  view: 'View Track',
  nothingToDisplay: 'Nothing to Display',
  noComments: "This user hasn't left any comments yet!",
  backToProfile: 'Back To Profile'
}

const UserComment = ({ comment }: { comment: CommentOrReply }) => {
  const navigate = useNavigate()

  const {
    id,
    entityId,
    message,
    createdAt,
    userId,
    isEdited,
    mentions = [],
    reactCount,
    isCurrentUserReacted
  } = comment

  const { data: track } = useTrack(entityId)
  const createdAtDate = useMemo(
    () => dayjs.utc(createdAt).toDate(),
    [createdAt]
  )

  const trackUserCommentClick = useCallback(() => {
    if (userId) {
      trackEvent(
        make({
          eventName: Name.COMMENTS_HISTORY_CLICK,
          commentId: id,
          userId
        })
      )
    }
  }, [id, userId])

  const goToTrackPage = useCallback(() => {
    if (track) {
      trackUserCommentClick()
      navigate(track.permalink)
    }
  }, [track, trackUserCommentClick, navigate])

  if (!comment || !userId) return null

  return (
    <Flex w='100%' gap='l'>
      <Avatar userId={userId} size='medium' popover alignSelf='flex-start' />
      <Flex column w='100%' gap='s' alignItems='flex-start'>
        <Flex column gap='xs' w='100%'>
          <Text variant='body' size='s' textAlign='left' color='subdued'>
            {track ? (
              <Flex gap='xs' alignItems='center'>
                <TrackLink
                  variant='visible'
                  trackId={track?.track_id}
                  onClick={trackUserCommentClick}
                />
                {messages.by}
                <UserLink variant='visible' userId={track?.owner_id} popover />
              </Flex>
            ) : (
              <Skeleton w={180} h={20} />
            )}
          </Text>
          <Flex gap='s' alignItems='center'>
            <UserLink userId={userId} popover size='l' strength='strong' />
            <Timestamp time={createdAtDate} />
          </Flex>
          <CommentText isEdited={isEdited} mentions={mentions} commentId={id}>
            {message}
          </CommentText>
        </Flex>
        <Flex gap='l' alignItems='center' onClick={goToTrackPage}>
          {reactCount > 0 ? (
            <Flex alignItems='center' gap='xs'>
              <IconHeart
                color={isCurrentUserReacted ? 'active' : 'subdued'}
                aria-label='Heart comment'
              />
              {reactCount > 0 ? <Text>{reactCount}</Text> : null}
            </Flex>
          ) : null}
          <TextLink variant='subdued'>{messages.view}</TextLink>
        </Flex>
      </Flex>
    </Flex>
  )
}

const NoComments = ({ handle }: { handle?: string }) => {
  const navigate = useNavigate()

  const goToProfile = useCallback(() => {
    if (handle) {
      navigate(profilePage(handle))
    }
  }, [handle, navigate])

  return (
    <Flex column gap='2xl' p='l'>
      <Flex column alignItems='center' gap='l'>
        <IconMessage size='3xl' color='subdued' />
        <Text variant='heading' size='s'>
          {messages.nothingToDisplay}
        </Text>
        <Text variant='body' size='l'>
          {messages.noComments}
        </Text>
      </Flex>
      <Box>
        <Button variant='secondary' size='small' onClick={goToProfile}>
          {messages.backToProfile}
        </Button>
      </Box>
    </Flex>
  )
}

export type CommentHistoryPageProps = {
  title: string
}

export const CommentHistoryPage = ({ title }: CommentHistoryPageProps) => {
  const profileParams = useProfileParams()
  const containerRef = useMainContentRef()
  const { data: user } = useUserByParams(profileParams ?? {})

  const {
    data: comments = [],
    hasNextPage,
    fetchNextPage,
    isPending,
    isFetchingNextPage
  } = useUserComments({ userId: user?.user_id ?? null })

  const renderHeader = () => <Header showBackButton primary={title} />
  const getScrollParent = useCallback(
    () => containerRef.current ?? null,
    [containerRef]
  )

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
    // TODO: Track Event here?
  }, [fetchNextPage])

  return (
    <Page
      title={title}
      description={messages.description(user?.name ?? null)}
      canonicalUrl={user ? fullCommentHistoryPage(user.handle) : ''}
      header={renderHeader()}
    >
      <Paper>
        <InfiniteScroll
          hasMore={hasNextPage}
          loadMore={handleLoadMore}
          getScrollParent={getScrollParent}
          useWindow={false}
          css={{ width: '100%' }}
          threshold={250}
        >
          <Flex direction='column' p='xl' gap='l'>
            {isPending ? (
              <CommentBlockSkeletons />
            ) : (
              <>
                {comments.length === 0 ? (
                  <NoComments handle={user?.handle} />
                ) : (
                  comments.map((comment) => (
                    <UserComment key={comment.id} comment={comment} />
                  ))
                )}
                {isFetchingNextPage ? (
                  <Flex justifyContent='center' mt='l'>
                    <LoadingSpinner h={20} w={20} />
                  </Flex>
                ) : null}
              </>
            )}
          </Flex>
        </InfiniteScroll>
      </Paper>
    </Page>
  )
}
