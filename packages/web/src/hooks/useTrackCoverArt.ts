import { useEffect } from 'react'

import { useTrack } from '@audius/common/api'
import { imageBlank as imageEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes, ID } from '@audius/common/models'
import { getDominantColorsByTrack } from '@audius/common/src/store/average-color/selectors'
import { setDominantColors } from '@audius/common/src/store/average-color/slice'
import { CommonState } from '@audius/common/store'
import { Maybe } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { preload } from 'utils/image'
import { dominantColor } from 'utils/imageProcessingUtil'
import { useSelector } from 'utils/reducer'

export const useTrackCoverArt = ({
  trackId,
  size,
  defaultImage
}: {
  trackId?: ID
  size: SquareSizes
  defaultImage?: string
}) => {
  const { data: artwork } = useTrack(trackId, {
    select: (track) => track?.artwork
  })
  const image = useImageSize({
    artwork,
    targetSize: size,
    defaultImage: defaultImage ?? imageEmpty,
    preloadImageFn: preload
  })

  // Return edited artwork from this session, if it exists
  // TODO(PAY-3588) Update field once we've switched to another property name
  // for local changes to artwork
  // @ts-ignore
  if (artwork?.url) return artwork.url

  return image
}

export const useTrackCoverArtDominantColors = ({
  trackId
}: {
  trackId: Maybe<ID>
}) => {
  const dispatch = useDispatch()

  const trackCoverArtImage = useTrackCoverArt({
    trackId: trackId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const { data: track } = useTrack(trackId ?? undefined, {
    select: (track) => ({
      cover_art_sizes: track?.cover_art_sizes
    })
  })

  // Pull existing dominant colors from redux
  const coverArtDominantColors = useSelector((state: CommonState) => {
    return getDominantColorsByTrack(state, {
      track: trackId ? { cover_art_sizes: track?.cover_art_sizes } : undefined
    })
  })

  // Fetch dominant colors if we don't have them yet and set in redux
  useEffect(() => {
    if (
      !coverArtDominantColors &&
      track?.cover_art_sizes &&
      trackCoverArtImage?.includes(track.cover_art_sizes)
    ) {
      const work = async () => {
        if (trackCoverArtImage && track?.cover_art_sizes) {
          const dominantColors = await dominantColor(trackCoverArtImage)
          dispatch(
            setDominantColors({
              multihash: track.cover_art_sizes,
              colors: dominantColors
            })
          )
        }
      }
      work()
    }
  }, [
    trackCoverArtImage,
    dispatch,
    track?.cover_art_sizes,
    coverArtDominantColors,
    track
  ])

  if (!trackId || !trackCoverArtImage) {
    return null
  }

  return coverArtDominantColors
}

export const useTrackCoverArtDominantColor = ({
  trackId
}: {
  trackId: Maybe<ID>
}) => {
  return useTrackCoverArtDominantColors({ trackId })?.[0] ?? null
}
