import { useCallback, useEffect, useMemo, useState } from 'react'

import { useUser } from '@audius/common/api'
import type { TimestampedComment } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import { Dimensions, Pressable, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'

import { Flex, Text, useTheme } from '@audius/harmony-native'
import { useCommentDrawer } from 'app/components/comments/CommentDrawerContext'
import { ProfilePicture } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

const { getSeek, getSeekCounter } = playbackSelectors

const messages = {
  openComment: (name: string) => `Open comment by ${name}`
}

// How long a comment stays up after its timestamp plays.
const BUBBLE_WINDOW_S = 6
const POLL_MS = 500
const BUBBLE_MAX_WIDTH = Dimensions.get('window').width * 0.85

/**
 * Whole-second playback position, polled while active. Cheap enough to run
 * twice a second, and it follows seeks and the native player directly instead
 * of the scrubber's own timer.
 */
const usePlaybackPosition = (isActive: boolean, mediaKey: string) => {
  const [position, setPosition] = useState(0)
  const seek = useSelector(getSeek)
  const seekCounter = useSelector(getSeekCounter)

  useEffect(() => {
    setPosition(0)
  }, [mediaKey])

  useEffect(() => {
    if (seek !== null) setPosition(Math.floor(seek))
  }, [seek, seekCounter])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    const tick = async () => {
      const { position } = await TrackPlayer.getProgress()
      if (cancelled) return
      const whole = Math.floor(position)
      setPosition((current) => (current === whole ? current : whole))
    }
    tick()
    const interval = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isActive])

  return position
}

type CommentBubbleProps = {
  trackId: ID
  comments: TimestampedComment[]
  /** Poll playback only while the player is open and playing. */
  isActive: boolean
  mediaKey: string
}

/**
 * Shows the comment whose timestamp just played, SoundCloud style, in the gap
 * under the scrubber. Zero height in the layout; the bubble floats.
 */
export const CommentBubble = (props: CommentBubbleProps) => {
  const { trackId, comments, isActive, mediaKey } = props
  const { spacing } = useTheme()
  const position = usePlaybackPosition(isActive, mediaKey)

  // Most recent comment inside the window; most reacted on a tie.
  const comment = useMemo(() => {
    let best: TimestampedComment | null = null
    for (const candidate of comments) {
      const t = candidate.trackTimestampS
      if (t > position) break
      if (position - t >= BUBBLE_WINDOW_S) continue
      if (
        !best ||
        t > best.trackTimestampS ||
        (t === best.trackTimestampS && candidate.reactCount > best.reactCount)
      ) {
        best = candidate
      }
    }
    return best
  }, [comments, position])

  return (
    <View style={{ height: 0, zIndex: 1 }}>
      <View
        pointerEvents='box-none'
        style={{
          position: 'absolute',
          top: spacing.xs,
          left: 0,
          right: 0,
          alignItems: 'center'
        }}
      >
        {comment ? (
          <Animated.View
            key={comment.id}
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(180)}
          >
            <Bubble trackId={trackId} comment={comment} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  )
}

const Bubble = ({
  trackId,
  comment
}: {
  trackId: ID
  comment: TimestampedComment
}) => {
  const navigation = useNavigation()
  const { open } = useCommentDrawer()
  const { data: name } = useUser(comment.userId, {
    select: (user) => user.name
  })

  const handlePress = useCallback(() => {
    open({
      entityId: trackId,
      navigation,
      playbackSource: 'comments',
      highlightedComment: comment
    })
  }, [open, trackId, navigation, comment])

  if (!name) return null

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole='button'
      accessibilityLabel={messages.openComment(name)}
    >
      <Flex
        row
        alignItems='center'
        gap='s'
        pl='xs'
        pr='m'
        backgroundColor='surface2'
        // 28px tall: clears the play button that overhangs the controls row
        style={{
          paddingVertical: 2,
          borderRadius: 999,
          maxWidth: BUBBLE_MAX_WIDTH
        }}
      >
        <ProfilePicture userId={comment.userId} size='small' />
        <Text
          variant='body'
          size='s'
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          <Text variant='body' size='s' strength='strong'>
            {name}
          </Text>{' '}
          {comment.message}
        </Text>
      </Flex>
    </Pressable>
  )
}
