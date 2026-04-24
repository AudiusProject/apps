import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image, View } from 'react-native'

import { useTrackImage } from 'app/components/image/TrackImage'

/**
 * Contest hero banner. Renders a raw `<Image>` rather than the
 * shared `TrackImage` component because `TrackImage` wraps its
 * artwork in the `Artwork` layout, which forces a 1:1 aspect ratio
 * (via `pt='100%'`). The Figma contest hero is a wide cropped
 * banner, not a square thumbnail — so we pull the source via
 * `useTrackImage` and size the image ourselves.
 *
 * The back control used to live in the hero as a dark translucent
 * disc. That moved into `ContestNavOverlay`, which floats above the
 * hero with a profile-style white/neutral icon that fades on scroll
 * — so the hero now only renders the cover image.
 */
export const CONTEST_HERO_HEIGHT = 220

type ContestHeroProps = {
  trackId: ID
}

export const ContestHero = ({ trackId }: ContestHeroProps) => {
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const src =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined

  // `pointerEvents='none'` on the outer View — the hero is purely
  // decorative now that the back button lives in the overlay, so
  // any touches should pass through to the underlying collapsible
  // scroll view instead of being swallowed.
  return (
    <View
      pointerEvents='none'
      style={{ width: '100%', height: CONTEST_HERO_HEIGHT }}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={{ width: '100%', height: '100%' }}
          resizeMode='cover'
        />
      ) : null}
    </View>
  )
}
