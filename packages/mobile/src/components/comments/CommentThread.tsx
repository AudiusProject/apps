import { useCallback, useEffect, useState } from 'react'

import { useComment, useCommentReplies } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import {
  Name,
  type Comment,
  type ID,
  type ReplyComment
} from '@audius/common/models'
import type { LayoutChangeEvent } from 'react-native/types'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import {
  Box,
  Flex,
  IconCaretDown,
  IconCaretUp,
  PlainButton,
  useTheme
} from '@audius/harmony-native'
import { make, track } from 'app/services/analytics'

import LoadingSpinner from '../loading-spinner/LoadingSpinner'

import { CommentBlock } from './CommentBlock'

type CommentThreadProps = {
  commentId: ID
}

export const CommentThread = (props: CommentThreadProps) => {
  const { commentId } = props
  const { motion } = useTheme()
  const { entityId } = useCurrentCommentSection()
  const { data: rootCommentData } = useComment(commentId)
  const rootComment = rootCommentData as Comment // We can safely assume that this is a parent comment

  const [hiddenReplies, setHiddenReplies] = useState<{
    [parentCommentId: number]: boolean
  }>({})

  const toggleReplies = (commentId: ID) => {
    const newHiddenReplies = { ...hiddenReplies }
    newHiddenReplies[commentId] = !newHiddenReplies[commentId]
    setHiddenReplies(newHiddenReplies)

    track(
      make({
        eventName: newHiddenReplies[commentId]
          ? Name.COMMENTS_HIDE_REPLIES
          : Name.COMMENTS_SHOW_REPLIES,
        commentId,
        trackId: entityId
      })
    )
  }
  const [hasRequestedMore, setHasRequestedMore] = useState(false)
  const { isFetching: isFetchingReplies } = useCommentReplies(
    { commentId },
    { enabled: hasRequestedMore }
  )
  const handleLoadMoreReplies = () => {
    setHasRequestedMore(true)
  }

  const [repliesHeight, setRepliesHeight] = useState<number | null>(null)
  const repliesContainerHeight = useSharedValue<number | null>(null)

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: '100%',
      height:
        repliesContainerHeight.value !== null
          ? repliesContainerHeight.value
          : null,
      overflow: 'hidden'
    }
  })

  const handleRepliesLayoutChange = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height
      if (repliesHeight === null || height > repliesHeight) {
        setRepliesHeight(height)
        if (repliesContainerHeight.value) {
          repliesContainerHeight.value = withTiming(height, motion.expressive)
        }
      }
    },
    [motion.expressive, repliesContainerHeight, repliesHeight]
  )

  useEffect(() => {
    if (hiddenReplies[rootComment.id]) {
      repliesContainerHeight.value = withTiming(0, motion.expressive)
    } else if (rootComment.replies?.length) {
      if (repliesHeight) {
        repliesContainerHeight.value = withTiming(
          repliesHeight,
          motion.expressive
        )
      }
    }
  }, [
    hiddenReplies,
    rootComment,
    motion.expressive,
    repliesHeight,
    repliesContainerHeight
  ])

  if (!rootComment || !('id' in rootComment)) return null

  const { replyCount = 0 } = rootComment

  const replies = rootComment.replies ?? []

  const hasMoreReplies = replyCount >= 3 && replies.length < replyCount // note: hasNextPage is undefined when inactive - have to explicitly check for false

  return (
    <>
      <CommentBlock commentId={rootComment.id} />
      <Flex pl={40} direction='column' mv='s' gap='s' alignItems='flex-start'>
        {(replies.length ?? 0) > 0 ? (
          <Box mv='xs'>
            <PlainButton
              onPress={() => toggleReplies(rootComment.id)}
              variant='subdued'
              iconLeft={
                hiddenReplies[rootComment.id] ? IconCaretDown : IconCaretUp
              }
            >
              {hiddenReplies[rootComment.id]
                ? messages.showReplies(replyCount)
                : messages.hideReplies}
            </PlainButton>
          </Box>
        ) : null}
        <Animated.View style={animatedContainerStyle}>
          <Box onLayout={handleRepliesLayoutChange}>
            <Flex direction='column' gap='l'>
              {replies?.map((reply: ReplyComment) => (
                <Flex w='100%' key={reply.id}>
                  <CommentBlock
                    commentId={reply.id}
                    parentCommentId={rootComment.id}
                  />
                </Flex>
              ))}
            </Flex>

            {hasMoreReplies ? (
              <Flex direction='row' gap='s' mt='s' alignItems='center'>
                <PlainButton
                  onPress={handleLoadMoreReplies}
                  variant='subdued'
                  disabled={isFetchingReplies}
                >
                  {messages.showMoreReplies}
                </PlainButton>
                {isFetchingReplies ? (
                  <LoadingSpinner style={{ width: 20, height: 20 }} />
                ) : null}
              </Flex>
            ) : null}
          </Box>
        </Animated.View>
      </Flex>
    </>
  )
}
