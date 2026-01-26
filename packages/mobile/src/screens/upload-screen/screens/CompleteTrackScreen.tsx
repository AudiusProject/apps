import { useCallback, useState } from 'react'

import type { TrackForUpload } from '@audius/common/store'
import { UploadType } from '@audius/common/store'
import { useRoute } from '@react-navigation/native'

import { useNavigation } from 'app/hooks/useNavigation'

import { EditTrackScreen } from '../../edit-track-screen'
import { useUploadContext } from '../contexts/UploadContext'
import type { UploadParamList, UploadRouteProp } from '../types'

export const messages = {
  title: 'Complete Track',
  done: 'Upload Track'
}

export type CompleteTrackParams = {
  track: TrackForUpload
  initialMetadata?: any
}

export const CompleteTrackScreen = () => {
  const { params } = useRoute<UploadRouteProp<'CompleteTrack'>>()
  const { track } = params
  const [uploadAttempt, setUploadAttempt] = useState(1)
  const navigation = useNavigation<UploadParamList>()
  const { finishUpload } = useUploadContext()

  const handleSubmit = useCallback(
    (metadata: any) => {
      if (track) {
        const updatedTrack = {
          file: track.file,
          preview: null,
          metadata,
          clientId: track.clientId
        }

        // Finish upload with updated metadata
        finishUpload({
          tracks: [updatedTrack],
          uploadType: UploadType.INDIVIDUAL_TRACK
        })

        navigation.push('UploadingTracks', {
          tracks: [updatedTrack],
          uploadAttempt
        })

        // Increment attempt count in case we get sent back here after an error
        setUploadAttempt(uploadAttempt + 1)
      }
    },
    [navigation, track, uploadAttempt, finishUpload]
  )

  if (!track) return null
  const { metadata } = track

  return (
    <EditTrackScreen
      initialValues={{ ...metadata, isUpload: true }}
      onSubmit={handleSubmit}
      title={messages.title}
      url='/complete-track'
      doneText={messages.done}
    />
  )
}
