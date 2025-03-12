import { useCallback } from 'react'

import { useUpdateTrack } from '@audius/common/api'
import type { Track } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import type { TrackMetadataForUpload } from '@audius/common/store'
import { cacheTracksSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { ModalScreen } from 'app/components/core'
import { useTrackImage } from 'app/components/image/TrackImage'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'
import { isImageUriSource } from 'app/utils/image'

import { UploadFileContextProvider } from '../upload-screen/screens/UploadFileContext'

import { EditTrackScreen } from './EditTrackScreen'

const { getTrack } = cacheTracksSelectors

const messages = {
  title: 'Edit Track',
  save: 'Save'
}

export const EditTrackModalScreen = () => {
  const { params } = useRoute<'EditTrack'>()
  const { id } = params
  const navigation = useNavigation()
  const { mutate: updateTrack } = useUpdateTrack()

  const track = useSelector((state) => getTrack(state, { id }))

  const trackImage = useTrackImage({
    trackId: track?.track_id,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const handleSubmit = useCallback(
    (metadata: TrackMetadataForUpload) => {
      updateTrack({
        trackId: track?.track_id,
        metadata: metadata as Partial<Track & TrackMetadataForUpload>
      })
      navigation.navigate('Track', { id })
    },
    [id, navigation, track?.track_id, updateTrack]
  )

  if (!track) return null

  const initialValues = {
    ...track,
    artwork: null,
    trackArtwork:
      trackImage && trackImage.source && isImageUriSource(trackImage.source)
        ? trackImage.source.uri
        : undefined,
    isUpload: false,
    isCover:
      track.cover_original_artist != null ||
      track.cover_original_song_title != null
  }

  return (
    <ModalScreen>
      <UploadFileContextProvider>
        <EditTrackScreen
          initialValues={initialValues}
          onSubmit={handleSubmit}
          title={messages.title}
          doneText={messages.save}
        />
      </UploadFileContextProvider>
    </ModalScreen>
  )
}
