import { useCallback, useMemo } from 'react'

import {
  TrackFormState,
  TrackForUpload,
  TrackMetadataForUpload
} from '@audius/common/store'

import { EditTrackForm } from 'components/edit-track/EditTrackForm'
import {
  SingleTrackEditValues,
  TrackEditFormValues
} from 'components/edit-track/types'

type UploadTrackFormProps = {
  formState: TrackFormState
  onContinue: (formState: TrackFormState) => void
}

const defaultHiddenFields = {
  genre: true,
  mood: true,
  tags: true,
  share: false,
  play_count: false
  // REMIXES handled by a separate field
}

/**
 * Seeds the edit form for one track. EditTrackForm uses enableReinitialize and
 * formState.tracks is updated on every submit, so this must only read from
 * track.metadata (any initialMetadata seed is applied when the track is added).
 */
export const getTrackEditInitialMetadata = (
  metadata: TrackMetadataForUpload
): SingleTrackEditValues =>
  ({
    ...metadata,
    description: metadata.description ?? '',
    tags: metadata.tags ?? '',
    field_visibility: {
      ...defaultHiddenFields,
      ...metadata.field_visibility,
      remixes: metadata.field_visibility?.remixes ?? true
    },
    stems: metadata.stems ?? [],
    isrc: metadata.isrc ?? '',
    iswc: metadata.iswc ?? ''
  }) as SingleTrackEditValues

export const UploadTrackForm = (props: UploadTrackFormProps) => {
  const { formState, onContinue } = props
  const { tracks } = formState

  const initialValues: TrackEditFormValues = useMemo(
    () => ({
      trackMetadatasIndex: 0,
      tracks: tracks as TrackForUpload[],
      trackMetadatas: tracks.map((track) =>
        getTrackEditInitialMetadata(track.metadata)
      )
    }),
    [tracks]
  )

  const onSubmit = useCallback(
    (values: TrackEditFormValues) => {
      const tracksForUpload = values.tracks.map((track, i) => {
        const metadata = values.trackMetadatas[i]
        const file = 'file' in track ? track.file : tracks[i].file
        return { ...tracks[i], metadata, file }
      })

      onContinue({ ...formState, tracks: tracksForUpload })
    },
    [tracks, formState, onContinue]
  )

  return <EditTrackForm initialValues={initialValues} onSubmit={onSubmit} />
}
