import { useCallback } from 'react'

import { CollectionValues } from '@audius/common/schemas'
import {
  CollectionFormState,
  TrackForUpload,
  UploadType
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'

import { EditCollectionForm } from 'components/edit-collection/EditCollectionForm'

import { UploadDraftAutosave } from '../components/UploadDraftAutosave'

type UploadCollectionFormProps = {
  formState: CollectionFormState
  onContinue: (formState: CollectionFormState) => void
}

export const UploadCollectionForm = (props: UploadCollectionFormProps) => {
  const { formState, onContinue } = props
  const { tracks, uploadType, metadata } = formState
  const isAlbum = uploadType === UploadType.ALBUM

  // A restored draft (or a cancelled publish) already has form values.
  const initialValues: CollectionValues = metadata?.isUpload
    ? {
        ...metadata,
        tracks: tracks.map((track) => ({ override: false, ...track }))
      }
    : {
        ...metadata,
        is_album: isAlbum,
        is_downloadable: false,
        artwork: null,
        playlist_name: '',
        description: '',
        release_date: dayjs().toString(),
        is_private: false,
        trackDetails: {
          genre: null,
          mood: null,
          tags: ''
        },
        tracks: tracks.map((track) => ({ ...track, override: false })),
        isUpload: true
      }

  const handleSubmit = useCallback(
    (values: CollectionValues) => {
      onContinue({
        uploadType,
        tracks: values.tracks as TrackForUpload[],
        metadata: values
      })
    },
    [onContinue, uploadType]
  )

  return (
    <EditCollectionForm
      isAlbum={isAlbum}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      isUpload
    >
      <UploadDraftAutosave uploadType={uploadType} />
    </EditCollectionForm>
  )
}
