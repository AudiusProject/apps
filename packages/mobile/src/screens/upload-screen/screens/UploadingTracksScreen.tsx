import { useEffect, useState } from 'react'

import type { TrackForUpload } from '@audius/common/store'
import { uploadActions, uploadSelectors } from '@audius/common/store'
import { useRoute } from '@react-navigation/native'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconCloudUpload } from '@audius/harmony-native'
import { Screen, ScreenContent, Text, Tile } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { UploadingTrackTile } from '../components'
import type { UploadRouteProp } from '../types'
const { reset } = uploadActions
const {
  getIsUploading,
  getUploadSuccess,
  getUploadError,
  getCombinedUploadPercentage
} = uploadSelectors

const useStyles = makeStyles(({ spacing }) => ({
  root: { marginHorizontal: spacing(3) },
  tile: {
    marginTop: spacing(6),
    marginBottom: spacing(4)
  },
  tileContent: {
    alignItems: 'center',
    padding: spacing(4)
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(4)
  },
  description: {
    textAlign: 'center'
  },
  tileIcon: {
    marginRight: spacing(2)
  }
}))

const messages = {
  uploading: 'Uploading',
  uploadError: 'Something went wrong with your upload.',
  uploadTitle: 'Upload in Progress',
  uploadDescription:
    'Please make sure the screen stays on and keep the app open until the upload is complete.'
}

export type UploadingTracksParams = {
  tracks: TrackForUpload[]
  uploadAttempt?: number
}

export const UploadingTracksScreen = () => {
  const { params } = useRoute<UploadRouteProp<'UploadingTracks'>>()
  const { tracks } = params
  const styles = useStyles()
  const { neutralLight4 } = useThemeColors()
  const navigation = useNavigation()
  const dispatch = useDispatch()
  // Upload error is reset asynchronously after this component mounts.
  // This is used for logic below to detect that we got an error *after*
  // this upload attempt started
  const [uploadStarted, setUploadStarted] = useState(false)
  const { toast } = useToast()

  const trackUploadProgress = useSelector(getCombinedUploadPercentage)
  const uploadSuccess = useSelector(getUploadSuccess)
  const uploadError = useSelector(getUploadError)
  const isUploading = useSelector(getIsUploading)

  useEffect(() => {
    if (!uploadSuccess) {
      navigation.setOptions({ gestureEnabled: false })
    }
    if (uploadSuccess) {
      navigation.setOptions({ gestureEnabled: true })
      navigation.navigate('UploadComplete')
    }
  }, [uploadSuccess, navigation])

  useEffect(() => {
    if (isUploading) {
      setUploadStarted(true)
    } else if (uploadError) {
      toast({ content: messages.uploadError, type: 'error' })
      dispatch(reset())
      navigation.pop()
    }
  }, [isUploading, uploadError, uploadStarted, dispatch, toast, navigation])

  return (
    <Screen
      title={messages.uploading}
      icon={IconCloudUpload}
      style={styles.root}
      topbarLeft={null}
      url='/uploading-track'
    >
      <ScreenContent>
        <Tile styles={{ root: styles.tile, content: styles.tileContent }}>
          <View style={styles.title}>
            <IconCloudUpload
              fill={neutralLight4}
              width={24}
              height={24}
              style={styles.tileIcon}
            />
            <Text fontSize='xxl' weight='bold' color='neutralLight4'>
              {messages.uploadTitle}
            </Text>
          </View>
          <Text variant='body' style={styles.description}>
            {messages.uploadDescription}
          </Text>
        </Tile>
        {tracks.map((track) => (
          <UploadingTrackTile
            key={track.metadata.title}
            track={track}
            uploadProgress={trackUploadProgress}
          />
        ))}
      </ScreenContent>
    </Screen>
  )
}
