import { View } from 'react-native'

import { useTheme } from '@audius/harmony-native'
import { ImageField } from 'app/components/fields'

const COVER_HEIGHT = 116
const AVATAR_SIZE = 84
const AVATAR_RING = 4
/** How far the avatar hangs below the cover. */
const AVATAR_OVERHANG = 36

/** Cover photo with the profile picture overlapping its bottom-left corner. */
export const ProfileHeader = () => {
  const { color, cornerRadius, spacing } = useTheme()
  const avatarOuter = AVATAR_SIZE + AVATAR_RING * 2

  return (
    <View style={{ width: '100%', paddingBottom: AVATAR_OVERHANG }}>
      <ImageField
        name='cover_photo'
        label='cover photo'
        styles={{
          root: { marginHorizontal: 0 },
          imageContainer: {
            height: COVER_HEIGHT,
            width: '100%',
            aspectRatio: undefined,
            borderRadius: cornerRadius.xl
          },
          image: { borderRadius: cornerRadius.xl }
        }}
        pickerOptions={{
          height: 500,
          width: 2000,
          freeStyleCropEnabled: true
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: spacing.l,
          bottom: 0,
          width: avatarOuter,
          height: avatarOuter,
          borderRadius: avatarOuter / 2,
          padding: AVATAR_RING,
          backgroundColor: color.background.default
        }}
      >
        <ImageField
          name='profile_picture'
          label='profile picture'
          styles={{
            root: { marginHorizontal: 0 },
            imageContainer: {
              height: AVATAR_SIZE,
              width: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2
            },
            image: {
              height: AVATAR_SIZE,
              width: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2
            }
          }}
          pickerOptions={{
            height: 1000,
            width: 1000,
            cropperCircleOverlay: true
          }}
        />
      </View>
    </View>
  )
}
