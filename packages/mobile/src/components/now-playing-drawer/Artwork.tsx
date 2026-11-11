import {
  useDownloadableContentAccess,
  useGatedContentAccess
} from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import type { Track } from '@audius/common/models'
import { averageColorSelectors, playbackSelectors } from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { Dimensions, View } from 'react-native'
import { useSelector } from 'react-redux'

import { makeStyles } from 'app/styles'

import { TrackImage } from '../image/TrackImage'
import { TrackDogEar } from '../track/TrackDogEar'

import { mostSaturated } from './useDominantArtworkColors'
const { getPreviewing } = playbackSelectors
const { getDominantColorsByTrack } = averageColorSelectors

const dimensions = Dimensions.get('window')
const spacing = 24

const useStyles = makeStyles(({ palette }) => ({
  root: {
    marginLeft: spacing,
    marginRight: spacing,
    maxHeight: dimensions.width - spacing * 2,
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderRadius: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  glow: {
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 }
  },
  image: {
    alignSelf: 'center',
    borderRadius: 8,
    borderColor: palette.white,
    borderWidth: 2,
    overflow: 'hidden',
    height: '100%',
    width: '100%',
    aspectRatio: 1
  }
}))

type ArtworkProps = {
  track: Nullable<Track>
  /** Whether the Now Playing drawer is open, so the artwork is visible */
  isOpen: boolean
}

export const Artwork = ({ track, isOpen }: ArtworkProps) => {
  const styles = useStyles()

  const dominantColors = useSelector((state: CommonState) =>
    getDominantColorsByTrack(state, {
      track
    })
  )

  // With the artwork's colors, a wide soft glow in its most colorful one;
  // without, the plain drop shadow.
  let shadowStyle = { shadowColor: 'rgb(0,0,0)' }
  if (dominantColors?.length) {
    const { r, g, b } = mostSaturated(dominantColors)
    shadowStyle = {
      ...styles.glow,
      shadowColor: `rgb(${r.toFixed()},${g.toFixed()},${b.toFixed()})`
    }
  }

  const { hasStreamAccess } = useGatedContentAccess(track)
  const isPreviewing = useSelector(getPreviewing)
  const canPurchase =
    track?.stream_conditions &&
    'usdc_purchase' in track.stream_conditions &&
    !hasStreamAccess
  const { shouldDisplayPremiumDownloadLocked } = useDownloadableContentAccess({
    trackId: track?.track_id ?? 0
  })
  const shouldShowDogEar =
    isPreviewing || canPurchase || shouldDisplayPremiumDownloadLocked

  return (
    <View style={[styles.root, shadowStyle]}>
      <TrackImage
        key={track?.track_id}
        trackId={track?.track_id}
        style={styles.image}
        // The collapsed drawer hides the artwork, so don't load the full
        // size for every track until the drawer opens
        size={
          isOpen ? SquareSizes.SIZE_1000_BY_1000 : SquareSizes.SIZE_480_BY_480
        }
      />
      {shouldShowDogEar ? (
        <TrackDogEar trackId={track?.track_id ?? 0} borderOffset={2} />
      ) : null}
    </View>
  )
}
