import { useCallback, useContext } from 'react'

import { playbackActions, playbackSelectors } from '@audius/common/store'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text, useTheme } from '@audius/harmony-native'
import { ActionsBar } from 'app/components/now-playing-drawer/ActionsBar'
import { Artwork } from 'app/components/now-playing-drawer/Artwork'
import { AudioControls } from 'app/components/now-playing-drawer/AudioControls'
import { CommentBubble } from 'app/components/now-playing-drawer/CommentBubble'
import { TrackInfo } from 'app/components/now-playing-drawer/TrackInfo'
import { WaveformScrubber } from 'app/components/now-playing-drawer/WaveformScrubber'
import { useNowPlayingControls } from 'app/components/now-playing-drawer/useNowPlayingControls'
import { MiniTrackRow } from 'app/components/queue-drawer/QueueDrawer'
import { Scrubber } from 'app/components/scrubber'
import { ContentWidthContext } from 'app/hooks/useContentWidth'
import { useNavigation } from 'app/hooks/useNavigation'
import { AppTabNavigationContext } from 'app/screens/app-screen/AppTabNavigationProvider'

const { getPlaybackQueue, getPlaybackIndex } = playbackSelectors
const { playTrackAt } = playbackActions

const UP_NEXT_LIMIT = 8
const ARTWORK_GUTTER = 48

const messages = {
  nowPlaying: 'Now Playing',
  upNext: 'Up Next'
}

type NowPlayingPanelProps = {
  width: number
}

export const NowPlayingPanel = ({ width }: NowPlayingPanelProps) => {
  const { color, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const controls = useNowPlayingControls(true)
  const {
    track,
    trackId,
    user,
    trackDuration,
    mediaKey,
    isPlaying,
    isBuffering,
    isLongFormContent,
    isNowPlayingCommentsEnabled,
    isWaveformEnabled,
    timestampedComments,
    onNext,
    onPrevious
  } = controls
  const { navigation: tabNavigation } = useContext(AppTabNavigationContext)
  const navigation = useNavigation({ customNavigation: tabNavigation })

  const handlePressTitle = useCallback(() => {
    if (trackId) navigation?.push('Track', { trackId })
  }, [navigation, trackId])

  return (
    <ContentWidthContext.Provider value={width}>
      <View
        style={{
          width,
          borderLeftWidth: 1,
          borderColor: color.border.default,
          backgroundColor: color.background.surface1
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + spacing.l,
            paddingBottom: insets.bottom + spacing.xl
          }}
          showsVerticalScrollIndicator={false}
        >
          <Flex ph='xl' pb='l'>
            <Text variant='label' size='s' color='subdued'>
              {messages.nowPlaying}
            </Text>
          </Flex>
          <Pressable onPress={handlePressTitle}>
            <Artwork track={track} isOpen maxSize={width - ARTWORK_GUTTER} />
          </Pressable>
          <Flex ph='xl' pt='xl' pb='m'>
            <TrackInfo
              onPressTitle={handlePressTitle}
              track={track}
              user={user}
            />
          </Flex>
          <View style={{ marginHorizontal: spacing.xl }}>
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
          </View>
          {isNowPlayingCommentsEnabled && trackId ? (
            <CommentBubble
              trackId={trackId}
              comments={timestampedComments}
              isActive={isPlaying && !isBuffering}
              mediaKey={mediaKey}
            />
          ) : null}
          <View style={{ height: spacing.xl }} />
          <View style={{ marginHorizontal: spacing.xl }}>
            <AudioControls
              onNext={onNext}
              onPrevious={onPrevious}
              isLongFormContent={isLongFormContent}
            />
            <ActionsBar track={track} />
          </View>
          <UpNext />
        </ScrollView>
      </View>
    </ContentWidthContext.Provider>
  )
}

const noop = () => {}

export const UpNext = ({ limit = UP_NEXT_LIMIT }: { limit?: number }) => {
  const dispatch = useDispatch()
  const queue = useSelector(getPlaybackQueue)
  const index = useSelector(getPlaybackIndex)
  const upcoming = queue
    .map((item, queueIndex) => ({ trackId: item.trackId, queueIndex }))
    .slice(index + 1, index + 1 + limit)

  if (upcoming.length === 0) return null

  return (
    <Flex pt='2xl' ph='s' gap='xs'>
      <Flex ph='l' pb='s'>
        <Text variant='title' size='m'>
          {messages.upNext}
        </Text>
      </Flex>
      {upcoming.map(({ trackId, queueIndex }) => (
        <MiniTrackRow
          key={`${queueIndex}-${trackId}`}
          trackId={trackId}
          variant='upcoming'
          onPlay={() => dispatch(playTrackAt({ index: queueIndex }))}
        />
      ))}
    </Flex>
  )
}
