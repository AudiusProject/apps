import type { ID } from '@audius/common/models'
import { WidthSizes } from '@audius/common/models'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'

import { useCoverPhoto } from 'app/components/image/CoverPhoto'

import { FullscreenImageViewer } from './FullscreenImageViewer'

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%'
  }
})

type BannerViewerProps = {
  userId: ID | undefined
  isOpen: boolean
  onClose: () => void
}

export const BannerViewer = ({
  userId,
  isOpen,
  onClose
}: BannerViewerProps) => {
  const { width: windowWidth } = useWindowDimensions()

  const { source } = useCoverPhoto({
    userId,
    size: WidthSizes.SIZE_2000
  })

  return (
    <FullscreenImageViewer
      isOpen={isOpen}
      onClose={onClose}
      closeAccessibilityLabel='Close banner viewer'
    >
      <Image
        source={source}
        style={[styles.image, { maxWidth: windowWidth }]}
        resizeMode='contain'
        accessibilityIgnoresInvertColors
      />
    </FullscreenImageViewer>
  )
}
