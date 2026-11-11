import { useEffect } from 'react'

import { useTrack } from '@audius/common/api'
import type { Color, ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { averageColorActions } from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { useTrackImage } from 'app/components/image/TrackImage'
import { getDominantRgb } from 'app/utils/dominantColors'
import { isImageUriSource } from 'app/utils/image'

const { setDominantColors } = averageColorActions

/**
 * Computes the artwork's dominant colors from the small artwork and stores
 * them by CID, where `getDominantColorsByTrack` reads them. Nothing else on
 * mobile fills that store.
 */
export const useDominantArtworkColors = (
  trackId: ID | undefined,
  enabled: boolean
) => {
  const dispatch = useDispatch()
  const { data: multihash } = useTrack(trackId, {
    select: (track) => track.cover_art_sizes ?? track.cover_art
  })
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  const uri = source && isImageUriSource(source) ? source.uri : undefined
  const hasColors = useSelector(
    (state: CommonState) =>
      !!multihash && !!state.ui.averageColor.dominantColors[multihash]
  )

  useEffect(() => {
    if (!enabled || !uri || !multihash || hasColors) return
    let cancelled = false
    getDominantRgb(uri).then((result) => {
      // A string result is the fallback for an image it couldn't read.
      if (cancelled || typeof result === 'string' || !result.length) return
      dispatch(setDominantColors({ multihash, colors: result }))
    })
    return () => {
      cancelled = true
    }
  }, [enabled, uri, multihash, hasColors, dispatch])
}

/** The most colorful of the dominant colors, so dark art still glows. */
export const mostSaturated = (colors: Color[]) => {
  let best = colors[0]
  let bestChroma = -1
  for (const color of colors) {
    const chroma =
      Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)
    if (chroma > bestChroma) {
      best = color
      bestChroma = chroma
    }
  }
  return best
}
