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

export const AvatarViewer = ({
  userId,
  isOpen,
  onClose
}: AvatarViewerProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  const { source } = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

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
