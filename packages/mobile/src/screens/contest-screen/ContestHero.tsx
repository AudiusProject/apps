import { useRemixContest } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image, View } from 'react-native'
import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import Animated, {
  interpolate,
  useAnimatedStyle
} from 'react-native-reanimated'

import { useTrackImage } from 'app/components/image/TrackImage'

const AnimatedImage = Animated.createAnimatedComponent(Image)

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
 *
 * On pull-to-refresh / over-scroll the cover photo stretches to fill
 * the revealed gap (mirrors `ProfileCoverPhoto`'s scale + translate
 * interpolation). Without this the collapsible header showed a flat
 * white gap above the hero when the user dragged the contest scroll
 * view downward — visually the image needs to follow the gesture.
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
  const trackImageUri =
    source && typeof source === 'object' && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined
  // Prefer the contest's own cover photo (Edit Contest "Cover Photo"
  // field) over the parent track's artwork — same fallback ordering
  // used by the contest header on web and the contest cards.
  const { data: remixContest } = useRemixContest(trackId)
  const contestCoverPhotoUrl = (remixContest?.eventData as any)
    ?.coverPhotoUrl as string | undefined
  const src = contestCoverPhotoUrl || trackImageUri

  // Active-tab scroll position. Negative when the user over-scrolls /
  // pulls down. We don't read from `ContestScrollContext` here because
  // this component lives inside `Tabs.Container`, where the per-tab
  // hook is the source of truth — the bridge writes to the outer
  // context for siblings (like the floating nav overlay) that need
  // it but can't call the hook themselves.
  const scrollY = useCurrentTabScrollY()

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        // Same scale + translate ratios `ProfileCoverPhoto` uses so
        // both screens feel identical on overdrag.
        scale: interpolate(scrollY.value, [-200, 0], [4, 1], {
          extrapolateLeft: 'extend',
          extrapolateRight: 'clamp'
        })
      },
      {
        translateY: interpolate(scrollY.value, [-200, 0], [-40, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      }
    ]
  }))

  // No `overflow: 'hidden'` here — on pull-to-refresh the scaled
  // image needs to bleed *upward* past the hero's layout box to fill
  // the gap above, exactly the way `ProfileCoverPhoto` does. Downward
  // bleed into the body is hidden by the next sibling's own
  // `backgroundColor='white'`, mirroring the profile header's pattern
  // where the bio section's solid bg covers the cover-photo bleed.
  // `pointerEvents='none'` keeps touches falling through to the
  // underlying scroll view.
  return (
    <View
      pointerEvents='none'
      style={{
        width: '100%',
        height: CONTEST_HERO_HEIGHT
      }}
    >
      {src ? (
        <AnimatedImage
          source={{ uri: src }}
          style={[{ width: '100%', height: '100%' }, animatedImageStyle]}
          resizeMode='cover'
        />
      ) : null}
    </View>
  )
}
