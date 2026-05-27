import { ComponentProps, useCallback, useState } from 'react'

import {
  useUserComments,
  useTrack,
  useUser,
  CommentOrReply
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import {
  Flex,
  IconMessage,
  Divider,
  Text,
  PlainButton,
  IconArrowRight,
  Skeleton,
  useTheme,
  Box
} from '@audius/harmony'
import { animated, useSpring, useTrail } from '@react-spring/web'
import { useDispatch } from 'react-redux'

import { TrackLink } from 'components/link'
import { make, track as trackEvent } from 'services/analytics'
import { push } from 'utils/navigation'
import { fullCommentHistoryPage } from 'utils/route'

import { ProfilePageNavSectionItem } from './ProfilePageNavSectionItem'
import { ProfilePageNavSectionTitle } from './ProfilePageNavSectionTitle'

const AnimatedFlex = animated(Flex)
const AnimatedBox = animated(Box)

const messages = {
  recentComments: 'Recent Comments',
  viewAll: 'View All'
}

const CommentListItem = ({
  comment,
  style
}: {
  comment: CommentOrReply
  style: ComponentProps<typeof AnimatedFlex>['style']
}) => {
  const dispatch = useDispatch()
  const theme = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const { data: track } = useTrack(comment?.entityId)

  const trackCommentItemClick = useCallback(() => {
    if (comment && comment.userId) {
      trackEvent(
        make({
          eventName: Name.RECENT_COMMENTS_CLICK,
          commentId: comment.id,
          userId: comment.userId
        })
      )
    }
  }, [comment])

  const handleClick = () => {
    if (track) {
      trackCommentItemClick()
      dispatch(push(track.permalink))
    }
  }

  if (!comment) return null

  return (
    <AnimatedFlex
      style={style}
      column
      gap='m'
      w='100%'
      css={{ cursor: 'pointer' }}
      onClick={handleClick}
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
    >
      <Flex column gap='2xs' w='100%'>
        <Flex w='100%' css={{ minWidth: 0 }}>
          {track ? (
            <TrackLink
              css={{ display: 'block' }}
              size='s'
              variant='subdued'
              showUnderline={isHovered}
              trackId={track?.track_id}
              ellipses
              onClick={trackCommentItemClick}
            />
          ) : (
            <Skeleton w='80%' h={theme.typography.lineHeight.m} />
          )}
        </Flex>

        <Text variant='body' size='s' ellipses>
          {comment.message}
        </Text>
      </Flex>
      <Divider orientation='horizontal' />
    </AnimatedFlex>
  )
}

export const RecentComments = ({ userId }: { userId: number }) => {
  const dispatch = useDispatch()
  const { data: user } = useUser(userId)
  const { data: comments = [], isLoading } = useUserComments({
    userId,
    pageSize: 3
  })

  // Only animate if comments are not immediately visible
  const [shouldAnimate] = useState(isLoading)

  const onClickViewAll = useCallback(() => {
    if (user?.handle) {
      dispatch(push(fullCommentHistoryPage(user.handle)))
    }
  }, [dispatch, user?.handle])

  const { spring } = useTheme()

  // Main container animation - fade in and expand from top
  const containerSpring = useSpring({
    from: shouldAnimate
      ? { opacity: 0, height: 0, transform: 'translateY(-20px)' }
      : { opacity: 1, height: 'auto', transform: 'translateY(0)' },
    to: { opacity: 1, height: 'auto', transform: 'translateY(0)' },
    config: spring.standard
  })

  // Trail animation for comment items - staggered fade in
  const trail = useTrail(comments.length, {
    from: shouldAnimate
      ? { opacity: 0, transform: 'translateY(-10px)' }
      : { opacity: 1, transform: 'translateY(0)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: spring.fast
  })

  // View all button animation
  const viewAllSpring = useSpring({
    from: shouldAnimate
      ? { opacity: 0, transform: 'translateY(-5px)' }
      : { opacity: 1, transform: 'translateY(0)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: spring.standard,
    delay: shouldAnimate ? 300 : 0 // Only delay on initial render
  })

  if (comments.length === 0) return null

  return (
    <ProfilePageNavSectionItem>
      <ProfilePageNavSectionTitle
        title={messages.recentComments}
        Icon={IconMessage}
      />
      <AnimatedFlex
        style={containerSpring}
        alignItems='flex-start'
        w='100%'
        column
        gap='m'
        borderRadius='m'
        shadow='mid'
        p='l'
        backgroundColor='white'
      >
        {trail.map((style, index) => (
          <CommentListItem
            key={comments[index].id}
            comment={comments[index]}
            style={style}
          />
        ))}
        <AnimatedBox style={viewAllSpring} w='100%' onClick={onClickViewAll}>
          <PlainButton variant='subdued' iconRight={IconArrowRight}>
            {messages.viewAll}
          </PlainButton>
        </AnimatedBox>
      </AnimatedFlex>
    </ProfilePageNavSectionItem>
  )
}
