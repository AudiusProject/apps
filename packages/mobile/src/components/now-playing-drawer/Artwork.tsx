import {
  useDownloadableContentAccess,
  useGatedContentAccess
} from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import type { Track } from '@audius/common/models'
import { averageColorSelectors, playbackSelectors } from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { useContentWidth } from 'app/hooks/useContentWidth'
import { makeStyles } from 'app/styles'

import { TrackImage } from '../image/TrackImage'
import { TrackDogEar } from '../track/TrackDogEar'

import { mostSaturated } from './useDominantArtworkColors'
const { getPreviewing } = playbackSelectors
const { getDominantColorsByTrack } = averageColorSelectors

const spacing = 24

const useStyles = makeStyles(({ palette }) => ({
  root: {
    marginLeft: spacing,
    marginRight: spacing,
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
  isOpen: boolean
  maxSize?: number
}

export const Artwork = ({ track, isOpen, maxSize }: ArtworkProps) => {
  const styles = useStyles()
  const contentWidth = useContentWidth()

  const dominantColors = useSelector((state: CommonState) =>
    getDominantColorsByTrack(state, {
      track
    })
  )

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
    <View
      style={[
        styles.root,
        { maxHeight: maxSize ?? contentWidth - spacing * 2 },
        shadowStyle
      ]}
    >
      <TrackImage
        key={track?.track_id}
        trackId={track?.track_id}
        style={styles.image}
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
