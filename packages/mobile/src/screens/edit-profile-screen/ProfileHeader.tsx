import { View } from 'react-native'

import { useTheme } from '@audius/harmony-native'
import { ImageField, TextField } from 'app/components/fields'

export const ProfileHeader = () => {
  const { color, cornerRadius } = useTheme()

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: color.background.white,
        borderRadius: cornerRadius.m,
        borderWidth: 1,
        borderColor: color.border.default,
        overflow: 'visible' // Changed to visible so avatar can overflow
      }}
    >
      <View
        style={{
          overflow: 'hidden',
          borderRadius: cornerRadius.m
        }}
      >
        {/* Cover Photo */}
        <View
          style={{
            height: 96,
            width: '100%',
            position: 'relative'
          }}
        >
          <ImageField
            name='cover_photo'
            styles={{
              root: {
                marginHorizontal: 0,
                height: 96,
                width: '100%'
              },
              imageContainer: {
                height: 96,
                width: '100%',
                borderTopLeftRadius: cornerRadius.m,
                borderTopRightRadius: cornerRadius.m,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                aspectRatio: undefined
              }
            }}
            pickerOptions={{
              height: 500,
              width: 2000,
              freeStyleCropEnabled: true
            }}
          />
        </View>

        {/* Profile Picture - Positioned absolutely to overlap cover photo */}
        <View
          style={{
            position: 'absolute',
            left: 16,
            top: 40, // 96px (cover height) - 56px (overlap) = 40px from container top
            zIndex: 100
          }}
        >
          <ImageField
            name='profile_picture'
            styles={{
              root: {
                marginHorizontal: 0
              },
              imageContainer: {
                height: 80,
                width: 80,
                borderRadius: 40
              },
              image: {
                height: 80,
                width: 80,
                borderRadius: 40
              }
            }}
            pickerOptions={{
              height: 1000,
              width: 1000,
              cropperCircleOverlay: true
            }}
          />
        </View>

        {/* Bottom Container with Display Name */}
        <View
          style={{
            paddingTop: 40, // Space for avatar (80px height - 56px overlap = 24px visible + 16px padding)
            paddingHorizontal: 16,
            paddingBottom: 16,
            backgroundColor: color.background.white,
            borderBottomLeftRadius: cornerRadius.m,
            borderBottomRightRadius: cornerRadius.m
          }}
        >
          <TextField
            name='name'
            label='Display Name'
            placeholder='Name'
            noGutter
          />
        </View>
      </View>
    </View>
  )
}
