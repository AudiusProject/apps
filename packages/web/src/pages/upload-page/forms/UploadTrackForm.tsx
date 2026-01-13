import { useCallback, useMemo } from 'react'

import {
  TrackFormState,
  TrackForUpload,
  TrackMetadataForUpload
} from '@audius/common/store'
import dayjs from 'dayjs'

import { EditTrackForm } from 'components/edit-track/EditTrackForm'
import { TrackEditFormValues } from 'components/edit-track/types'

type UploadTrackFormProps = {
  formState: TrackFormState
  onContinue: (formState: TrackFormState) => void
  initialMetadata?: Partial<TrackMetadataForUpload>
}

const defaultHiddenFields = {
  genre: true,
  mood: true,
  tags: true,
  share: false,
  play_count: false
  // REMIXES handled by a separate field
}

export const UploadTrackForm = (props: UploadTrackFormProps) => {
  const { formState, onContinue, initialMetadata } = props
  const { tracks } = formState

  const initialValues: TrackEditFormValues = useMemo(
    () => ({
      trackMetadatasIndex: 0,
      tracks: tracks as TrackForUpload[],
      trackMetadatas: tracks.map((track) => ({
        ...track.metadata,
        ...initialMetadata,
        description: initialMetadata?.description ?? '',
        releaseDate: initialMetadata?.release_date
          ? new Date(initialMetadata.release_date)
          : new Date(dayjs().toString()),
        tags: initialMetadata?.tags ?? '',
        field_visibility: {
          ...defaultHiddenFields,
          ...initialMetadata?.field_visibility,
          remixes: true
        },
        stems: initialMetadata?.stems ?? [],
        isrc: initialMetadata?.isrc ?? '',
        iswc: initialMetadata?.iswc ?? ''
      }))
    }),
    [tracks, initialMetadata]
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
