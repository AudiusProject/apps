import { useCallback } from 'react'

import { View } from 'react-native'

import { IconCloudUpload, Button } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

const messages = {
  uploadTrack: 'Upload a Track'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    marginTop: spacing(4)
  }
}))

export const UploadTrackButton = () => {
  const styles = useStyles()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    navigation.push('Upload')
  }, [navigation])

  return (
    <View pointerEvents='box-none' style={styles.root}>
      <Button
        variant='secondary'
        iconLeft={IconCloudUpload}
        fullWidth
        onPress={handlePress}
      >
        {messages.uploadTrack}
      </Button>
    </View>
  )
}
