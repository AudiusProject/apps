import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image, Pressable, View } from 'react-native'

import { IconArrowLeft } from '@audius/harmony-native'
import { useTrackImage } from 'app/components/image/TrackImage'

/**
 * Contest hero banner. Renders a raw `<Image>` rather than the
 * shared `TrackImage` component because `TrackImage` wraps its
 * artwork in the `Artwork` layout, which forces a 1:1 aspect ratio
 * (via `pt='100%'`). The Figma contest hero is a wide cropped
 * banner, not a square thumbnail — so we pull the source via
 * `useTrackImage` and size the image ourselves.
 */
export const CONTEST_HERO_HEIGHT = 220

type ContestHeroProps = {
  trackId: ID
  onBack: () => void
}

export const ContestHero = ({ trackId, onBack }: ContestHeroProps) => {
  const { source } = useTrackImage({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const src =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined

  // `pointerEvents='box-none'` on the outer View — scroll gestures
  // on the hero propagate up to the collapsible scroll view, but
  // the back-button `Pressable` still captures its own tap. The
  // cover `Image` is additionally wrapped in a
  // `pointerEvents='none'` View so the image itself doesn't catch
  // pans — `Image` in React Native is a touch target by default.
  // Matches the `ProfileCoverPhoto` pattern.
  return (
    <View
      pointerEvents='box-none'
      style={{ width: '100%', height: CONTEST_HERO_HEIGHT }}
    >
      {src ? (
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <Image
            source={{ uri: src }}
            style={{ width: '100%', height: '100%' }}
            resizeMode='cover'
          />
        </View>
      ) : null}
      <Pressable
        onPress={onBack}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(0,0,0,0.35)'
        }}
      >
        <IconArrowLeft size='m' color='staticWhite' />
      </Pressable>
    </View>
  )
}
