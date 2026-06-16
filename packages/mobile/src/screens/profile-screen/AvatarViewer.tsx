import type { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native'

import { useProfilePicture } from 'app/components/image/UserImage'

import { FullscreenImageViewer } from './FullscreenImageViewer'

const CIRCLE_PADDING = 24

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%'
  }
})

type AvatarViewerProps = {
  userId: ID | null | undefined
  isOpen: boolean
  onClose: () => void
}

/**
 * Full-screen viewer for the profile-screen avatar. The image is clipped to
 * a circle so the on-tile shape carries through to the viewer; the
 * surrounding backdrop, fade, swipe-to-dismiss, and close button live in
 * the shared {@link FullscreenImageViewer}.
 */
export const AvatarViewer = ({
  userId,
  isOpen,
  onClose
}: AvatarViewerProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  // Use the largest cached size the image API serves so the full-screen
  // render isn't a blurry upscale of the 150-px tile shown in the header.
  const { source } = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  // Circle fits the smaller of the two window dimensions (after a little
  // padding so it doesn't touch the edges on landscape phones).
  const circleSize = Math.min(windowWidth, windowHeight) - CIRCLE_PADDING * 2

  return (
    <FullscreenImageViewer
      isOpen={isOpen}
      onClose={onClose}
      closeAccessibilityLabel='Close avatar viewer'
    >
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          overflow: 'hidden'
        }}
      >
        <Image
          source={source}
          style={styles.image}
          resizeMode='cover'
          accessibilityIgnoresInvertColors
        />
      </View>
    </FullscreenImageViewer>
  )
}
