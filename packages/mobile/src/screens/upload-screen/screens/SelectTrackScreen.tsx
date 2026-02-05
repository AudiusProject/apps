import { useCallback, useEffect, useState } from 'react'

import { Name } from '@audius/common/models'
import { UploadType } from '@audius/common/store'
import { useFocusEffect, useRoute } from '@react-navigation/native'

import { IconClose, IconCloudUpload, Button } from '@audius/harmony-native'
import {
  ErrorText,
  Screen,
  ScreenContent,
  Text,
  Tile
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useTrackFileSelector } from 'app/hooks/useTrackFileSelector'
import { make, track as trackAnalytcs } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'

import { TopBarIconButton } from '../../app-screen'
import { useUploadContext } from '../contexts/UploadContext'
import type { UploadParamList, UploadRouteProp } from '../types'

const messages = {
  screenTitle: 'Upload',
  title: 'Upload a Track',
  description: 'Select an Audio File to Upload',
  browse: 'Browse Files'
}

const useStyles = makeStyles(({ spacing }) => ({
  tile: {
    margin: spacing(3)
  },
  tileContent: {
    padding: spacing(4),
    alignItems: 'center'
  },
  title: {
    marginBottom: spacing(4)
  },
  description: {
    marginBottom: spacing(4)
  },
  errorText: {
    marginTop: spacing(4)
  }
}))

export const SelectTrackScreen = () => {
  const styles = useStyles()
  const { neutralLight4 } = useThemeColors()
  const navigation = useNavigation<UploadParamList>()
  const { params } = useRoute<UploadRouteProp<'SelectTrack'>>()
  const [navigatedBack, setNavigatedBack] = useState(false)
  const { track, loading, error, selectFile } = useTrackFileSelector()
  const { startUpload } = useUploadContext()

  useEffect(() => {
    if (track) {
      // If we have initialMetadata, merge it with the track metadata
      if (params?.initialMetadata) {
        track.metadata = {
          ...track.metadata,
          ...params.initialMetadata
        }
      }

      // Start uploading the track files immediately
      startUpload({
        tracks: [track],
        uploadType: UploadType.INDIVIDUAL_TRACK
      })

      navigation.push('CompleteTrack', {
        track,
        initialMetadata: params?.initialMetadata
      })
    }
  }, [track, navigation, params?.initialMetadata, startUpload])

  useFocusEffect(
    useCallback(() => {
      if (track) {
        setNavigatedBack(true)
      } else {
        trackAnalytcs(
          make({ eventName: Name.TRACK_UPLOAD_OPEN, source: 'nav' })
        )
      }
    }, [track])
  )

  useEffect(() => {
    if (loading) {
      setNavigatedBack(false)
    }
  }, [loading])

  const isLoading = loading || (track && !navigatedBack)

  return (
    <Screen
      title={messages.title}
      icon={IconCloudUpload}
      variant='secondary'
      topbarLeft={
        <TopBarIconButton icon={IconClose} onPress={navigation.goBack} />
      }
      url='/select-track'
    >
      <ScreenContent>
        <Tile styles={{ root: styles.tile, content: styles.tileContent }}>
          <IconCloudUpload
            fill={neutralLight4}
            height={spacing(20)}
            width={spacing(20)}
          />
          <Text fontSize='xxl' weight='bold' style={styles.title}>
            {messages.title}
          </Text>
          <Text variant='h4' style={styles.description}>
            {messages.description}
          </Text>
          <Button
            fullWidth
            variant='primary'
            isLoading={!!isLoading}
            onPress={selectFile}
          >
            {messages.browse}
          </Button>
          {error && !loading ? (
            <ErrorText style={styles.errorText}>{error.message}</ErrorText>
          ) : null}
        </Tile>
      </ScreenContent>
    </Screen>
  )
}
