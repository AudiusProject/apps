import { useCurrentUserId } from '@audius/common/api'
import { playbackPositionSelectors } from '@audius/common/store'
import { formatLineupTileDuration } from '@audius/common/utils'
import { StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import { IconCheck } from '@audius/harmony-native'
import Text from 'app/components/text'
import { useThemeColors } from 'app/utils/theme'

import { useStyles as useTrackTileStyles } from './styles'

const { getTrackPosition } = playbackPositionSelectors

const messages = {
  timeLeft: 'left',
  played: 'Played'
}

const styles = StyleSheet.create({
  topRight: {
    top: 8,
    marginRight: 8
  }
})

type Props = {
  /**
   * The duration of the track or tracks
   */
  duration?: number
  /**
   * The id of the track
   */
  trackId?: number
  /**
   * Whether or not the tile is for a collection
   */
  isCollection?: boolean
  /**
   * Whether or not the track is long-form content (podcast/audiobook/etc)
   */
  isLongFormContent?: boolean
}

export const LineupTileTopRight = ({
  duration,
  trackId,
  isCollection,
  isLongFormContent
}: Props) => {
  const { secondary } = useThemeColors()
  const trackTileStyles = useTrackTileStyles()
  const { data: currentUserId } = useCurrentUserId()
  const playbackPositionInfo = useSelector((state) =>
    getTrackPosition(state, { trackId, userId: currentUserId })
  )

  const isInProgress = playbackPositionInfo?.status === 'IN_PROGRESS'
  const isCompleted = playbackPositionInfo?.status === 'COMPLETED'

  const durationText = duration
    ? isInProgress
      ? `${formatLineupTileDuration(
          duration - playbackPositionInfo.playbackPosition,
          isLongFormContent,
          isCollection
        )} ${messages.timeLeft}`
      : formatLineupTileDuration(duration, isLongFormContent, isCollection)
    : null

  return (
    <View style={styles.topRight}>
      <View style={trackTileStyles.statTextContainer}>
        <Text
          style={[
            trackTileStyles.statText,
            isCompleted ? trackTileStyles.completeStatText : null
          ]}
        >
          {isCompleted ? messages.played : durationText}
          {isCompleted ? (
            <IconCheck height={12} width={14} fill={secondary} />
          ) : null}
        </Text>
      </View>
    </View>
  )
}
