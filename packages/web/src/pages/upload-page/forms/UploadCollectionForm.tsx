import { useCallback } from 'react'

import { CollectionValues } from '@audius/common/schemas'
import { TrackForUpload, UploadType } from '@audius/common/store'
import moment from 'moment'

import { EditCollectionForm } from 'components/edit-collection/EditCollectionForm'

import { CollectionFormState } from '../types'

type UploadCollectionFormProps = {
  formState: CollectionFormState
  onContinue: (formState: CollectionFormState) => void
}

export const UploadCollectionForm = (props: UploadCollectionFormProps) => {
  const { formState, onContinue } = props
  const { tracks, uploadType, metadata } = formState
  const isAlbum = uploadType === UploadType.ALBUM

  const initialValues: CollectionValues = {
    ...metadata,
    is_album: isAlbum,
    is_downloadable: false,
    artwork: null,
    playlist_name: '',
    description: '',
    release_date: moment().toString(),
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
    />
  )
}
