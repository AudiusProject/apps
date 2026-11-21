import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { useUser } from '@audius/common/api'
import type { TimestampedComment } from '@audius/common/api'
import { FlatList, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Flex,
  IconButton,
  IconClose,
  Text,
  useTheme
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { Artwork } from 'app/components/now-playing-drawer/Artwork'
import { AudioControls } from 'app/components/now-playing-drawer/AudioControls'
import { usePlaybackPosition } from 'app/components/now-playing-drawer/CommentBubble'
import { TrackInfo } from 'app/components/now-playing-drawer/TrackInfo'
import { WaveformScrubber } from 'app/components/now-playing-drawer/WaveformScrubber'
import { useNowPlayingControls } from 'app/components/now-playing-drawer/useNowPlayingControls'
import { Scrubber } from 'app/components/scrubber'
import { ContentWidthContext } from 'app/hooks/useContentWidth'
import { useNavigation } from 'app/hooks/useNavigation'
import { AppTabNavigationContext } from 'app/screens/app-screen/AppTabNavigationProvider'

import { UpNext } from './NowPlayingPanel'

const HINGE_GUTTER = 32
const COMMENT_ROW_HEIGHT = 64

const messages = {
  comments: 'Comments',
  commentsHint: 'Moments listeners called out, in time with the music',
  upNextHint: 'No timed comments on this track yet',
  close: 'Back to browsing'
}

const formatTimestamp = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

type GatefoldProps = {
  width: number
  onClose: () => void
}

export const Gatefold = ({ width, onClose }: GatefoldProps) => {
  const { color, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const {
    track,
    trackId,
    user,
    trackDuration,
    mediaKey,
    isPlaying,
    isBuffering,
    isLongFormContent,
    isWaveformEnabled,
    timestampedComments,
    onNext,
    onPrevious,
    onSeek
  } = useNowPlayingControls(true)
  const { navigation: tabNavigation } = useContext(AppTabNavigationContext)
  const navigation = useNavigation({ customNavigation: tabNavigation })
  const pageWidth = width / 2

  const handlePressTitle = useCallback(() => {
    if (!trackId) return
    onClose()
    navigation?.push('Track', { trackId })
  }, [navigation, onClose, trackId])

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: color.background.default
      }}
    >
      <ContentWidthContext.Provider value={pageWidth}>
        <View
          style={{
            width: pageWidth,
            paddingTop: insets.top + spacing.l,
            paddingBottom: insets.bottom + spacing.l,
            paddingLeft: spacing.xl,
            paddingRight: HINGE_GUTTER,
            justifyContent: 'center',
            backgroundColor: color.background.surface1
          }}
        >
          <Pressable onPress={handlePressTitle}>
            <Artwork
              track={track}
              isOpen
              maxSize={pageWidth - spacing.xl - HINGE_GUTTER}
            />
          </Pressable>
          <Flex pt='xl' pb='m'>
            <TrackInfo
              onPressTitle={handlePressTitle}
              track={track}
              user={user}
            />
          </Flex>
          {isWaveformEnabled && trackId ? (
            <WaveformScrubber
              trackId={trackId}
              duration={trackDuration}
              mediaKey={mediaKey}
              isOpen
              isPlaying={isPlaying && !isBuffering}
              comments={timestampedComments}
              onPressIn={noop}
              onPressOut={noop}
            />
          ) : (
            <Scrubber
              mediaKey={mediaKey}
              isPlaying={isPlaying && !isBuffering}
              onPressIn={noop}
              onPressOut={noop}
              duration={trackDuration}
            />
          )}
          <View style={{ height: spacing.l }} />
          <AudioControls
            onNext={onNext}
            onPrevious={onPrevious}
            isLongFormContent={isLongFormContent}
          />
        </View>
        <View
          style={{
            width: pageWidth,
            paddingTop: insets.top + spacing.l,
            paddingLeft: HINGE_GUTTER,
            paddingRight: spacing.xl
          }}
        >
          <Flex row alignItems='flex-start' justifyContent='space-between'>
            <Flex gap='xs' style={{ flexShrink: 1 }}>
              <Text variant='heading' size='s'>
                {messages.comments}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {timestampedComments.length > 0
                  ? messages.commentsHint
                  : messages.upNextHint}
              </Text>
            </Flex>
            <IconButton
              icon={IconClose}
              color='subdued'
              size='m'
              onPress={onClose}
              accessibilityLabel={messages.close}
            />
          </Flex>
          {timestampedComments.length > 0 && trackId ? (
            <SyncedComments
              comments={timestampedComments}
              isActive={isPlaying && !isBuffering}
              mediaKey={mediaKey}
              onSeek={onSeek}
              bottomInset={insets.bottom}
            />
          ) : (
            <UpNext />
          )}
        </View>
      </ContentWidthContext.Provider>
    </View>
  )
}

const noop = () => {}

type SyncedCommentsProps = {
  comments: TimestampedComment[]
  isActive: boolean
  mediaKey: string
  onSeek: (seconds: number) => void
  bottomInset: number
}

const SyncedComments = (props: SyncedCommentsProps) => {
  const { comments, isActive, mediaKey, onSeek, bottomInset } = props
  const { spacing } = useTheme()
  const position = usePlaybackPosition(isActive, mediaKey)
  const listRef = useRef<FlatList<TimestampedComment>>(null)

  const activeIndex = useMemo(() => {
    let found = -1
    comments.forEach((comment, i) => {
      if (comment.trackTimestampS <= position) found = i
    })
    return found
  }, [comments, position])

  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current?.scrollToIndex({
      index: activeIndex,
      viewPosition: 0.35,
      animated: true
    })
  }, [activeIndex])

  const getItemLayout = useCallback(
    (_: ArrayLike<TimestampedComment> | null | undefined, index: number) => ({
      length: COMMENT_ROW_HEIGHT,
      offset: COMMENT_ROW_HEIGHT * index,
      index
    }),
    []
  )

  return (
    <FlatList
      ref={listRef}
      data={comments}
      keyExtractor={(comment) => `${comment.id}`}
      getItemLayout={getItemLayout}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: spacing.xl,
        paddingBottom: bottomInset + spacing['4xl']
      }}
      renderItem={({ item, index }) => (
        <SyncedCommentRow
          comment={item}
          state={
            index === activeIndex
              ? 'active'
              : index < activeIndex
                ? 'past'
                : 'upcoming'
          }
          onPress={() => onSeek(item.trackTimestampS)}
        />
      )}
    />
  )
}

type SyncedCommentRowProps = {
  comment: TimestampedComment
  state: 'past' | 'active' | 'upcoming'
  onPress: () => void
}

const SyncedCommentRow = ({
  comment,
  state,
  onPress
}: SyncedCommentRowProps) => {
  const { data: name } = useUser(comment.userId, {
    select: (user) => user.name
  })
  const isActive = state === 'active'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      style={{
        height: COMMENT_ROW_HEIGHT,
        justifyContent: 'center',
        opacity: isActive ? 1 : state === 'past' ? 0.4 : 0.65
      }}
    >
      <Flex row alignItems='center' gap='m'>
        <ProfilePicture userId={comment.userId} size='small' />
        <Flex style={{ flex: 1 }}>
          <Text variant='body' size='xs' color='subdued'>
            {formatTimestamp(comment.trackTimestampS)}
            {name ? ` · ${name}` : ''}
          </Text>
          <Text
            variant={isActive ? 'title' : 'body'}
            size={isActive ? 'm' : 's'}
            numberOfLines={2}
          >
            {comment.message}
          </Text>
        </Flex>
      </Flex>
    </Pressable>
  )
}
