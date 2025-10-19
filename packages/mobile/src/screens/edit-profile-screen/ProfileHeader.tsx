import { View } from 'react-native'

import { ImageField } from 'app/components/fields'
import { makeStyles } from 'app/styles'

import { ProfileInput } from './ProfileInput'

const useStyles = makeStyles(({ palette }) => ({
  container: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    overflow: 'visible' // Changed to visible so avatar can overflow
  },
  innerContainer: {
    overflow: 'hidden',
    borderRadius: 8
  },
  coverPhotoContainer: {
    height: 96,
    width: '100%',
    position: 'relative'
  },
  coverPhoto: {
    height: 96,
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    aspectRatio: undefined
  },
  coverPhotoImageContainer: {
    marginHorizontal: 0,
    height: 96,
    width: '100%'
  },
  profilePictureContainer: {
    position: 'absolute',
    left: 16,
    top: 40, // 96px (cover height) - 56px (overlap) = 40px from container top
    zIndex: 100
  },
  profilePicture: {
    height: 80,
    width: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: palette.white,
    backgroundColor: palette.neutralLight4,
    overflow: 'hidden'
  },
  profilePictureRoot: {
    marginHorizontal: 0
  },
  profilePictureImageContainer: {
    height: 80,
    width: 80,
    borderRadius: 40
  },
  profilePictureImage: {
    height: 80,
    width: 80,
    borderRadius: 40
  },
  bottomContainer: {
    paddingTop: 40, // Space for avatar (80px height - 56px overlap = 24px visible + 16px padding)
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: palette.white,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  }
}))

export const ProfileHeader = () => {
  const styles = useStyles()

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        {/* Cover Photo */}
        <View style={styles.coverPhotoContainer}>
          <ImageField
            name='cover_photo'
            styles={{
              root: styles.coverPhotoImageContainer,
              imageContainer: styles.coverPhoto
            }}
            pickerOptions={{
              height: 500,
              width: 2000,
              freeStyleCropEnabled: true
            }}
          />
        </View>

        {/* Profile Picture - Positioned absolutely to overlap cover photo */}
        <View style={styles.profilePictureContainer}>
          <ImageField
            name='profile_picture'
            styles={{
              root: styles.profilePictureRoot,
              imageContainer: styles.profilePictureImageContainer,
              image: styles.profilePictureImage
            }}
            pickerOptions={{
              height: 1000,
              width: 1000,
              cropperCircleOverlay: true
            }}
          />
        </View>

        {/* Bottom Container with Display Name */}
        <View style={styles.bottomContainer}>
          <ProfileInput name='name' label='Display Name' placeholder='Name' />
        </View>
      </View>
    </View>
  )
}
