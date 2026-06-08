import type { Track } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { View } from 'react-native'

import { IconVisibilityHidden, IconPlay } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { TrackImage } from '../image/TrackImage'

import { AnimatedEqBars } from './AnimatedEqBars'

type TrackArtworkProps = {
  track: Track
  isActive?: boolean
  isUnlisted?: boolean
  isPlaying: boolean
}

const useStyles = makeStyles(({ spacing }) => ({
  image: {
    borderRadius: 4,
    height: 52,
    width: 52,
    marginRight: spacing(4)
  },
  artworkIcon: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  nowPlayingOverlay: {
    height: '100%',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)'
  }
}))

export const TrackArtwork = (props: TrackArtworkProps) => {
  const { isPlaying, isActive, track, isUnlisted } = props
  const styles = useStyles()
  const { staticWhite } = useThemeColors()

  return (
    <TrackImage
      trackId={track.track_id}
      size={SquareSizes.SIZE_150_BY_150}
      style={styles.image}
    >
      {isUnlisted && !isActive ? (
        <View style={styles.artworkIcon}>
          <IconVisibilityHidden fill={staticWhite} />
        </View>
      ) : null}
      {isActive && isPlaying ? (
        <View style={styles.nowPlayingOverlay}>
          <AnimatedEqBars isPlaying={isPlaying} />
        </View>
      ) : isActive ? (
        <View style={styles.artworkIcon}>
          <IconPlay color='white' style={{ opacity: 0.8 }} />
        </View>
      ) : null}
    </TrackImage>
  )
}
