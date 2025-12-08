import { useEffect, useState } from 'react'

import type { TrackForUpload } from '@audius/common/store'
import {
  uploadActions,
  uploadSelectors,
  UploadType
} from '@audius/common/store'
import { useRoute } from '@react-navigation/native'
import { useKeepAwake } from '@thehale/react-native-keep-awake'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useEffectOnce } from 'react-use'

import { IconCloudUpload } from '@audius/harmony-native'
import { Screen, ScreenContent, Text, Tile } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { UploadingTrackTile } from '../components'
import type { UploadRouteProp } from '../types'
const { uploadTracks, reset } = uploadActions
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
  useKeepAwake()
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
  const [timeoutSuccess, setTimeoutSuccess] = useState(false)
  const { toast } = useToast()

  useEffectOnce(() => {
    dispatch(uploadTracks({ tracks, uploadType: UploadType.INDIVIDUAL_TRACK }))
  })

  const trackUploadProgress = useSelector(getCombinedUploadPercentage)
  // NOTE: We've observed a bug where the upload saga stalls out sometimes. The user gets stuck at 100% in this case
  // So this is intentionally not a saga to avoid this timer getting stuck in the saga loop as well
  useEffect(() => {
    if (trackUploadProgress === 100) {
      const timeout = setTimeout(
        () => {
          // TODO: For now just passing user through
          // We need to figure out how to resolve this
          setTimeoutSuccess(true)
        },
        1000 * 10 // 10 seconds
      )
      return () => clearTimeout(timeout)
    }
  }, [trackUploadProgress, navigation, params])
  const uploadSuccess = useSelector(getUploadSuccess)
  const uploadError = useSelector(getUploadError)
  const isUploading = useSelector(getIsUploading)

  useEffect(() => {
    if (!uploadSuccess) {
      navigation.setOptions({ gestureEnabled: false })
    }
    if (uploadSuccess || timeoutSuccess) {
      navigation.setOptions({ gestureEnabled: true })
      navigation.navigate('UploadComplete')
    }
  }, [uploadSuccess, navigation, timeoutSuccess])

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
