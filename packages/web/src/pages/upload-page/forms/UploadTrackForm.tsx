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

/**
 * Seeds the edit form for one track.
 *
 * `EditTrackForm` runs with `enableReinitialize`, so this value is not just the
 * first render's defaults — Formik resets the whole form to it whenever it
 * deep-changes. `formState.tracks` is rewritten with the user's edits every
 * time the form is submitted (see `onSubmit` below, and `EditPage.onContinue`,
 * which calls `setFormState` while still on the edit phase), so a recompute is
 * routine rather than exceptional.
 *
 * That makes it critical to prefer what's already on `track.metadata` over the
 * `initialMetadata` seed. Blanking `description`/`tags`/`stems` unconditionally
 * discarded whatever the user had typed on every reset, and publishing after
 * that point uploaded a track with an empty description and no tags.
 */
export const getTrackEditInitialMetadata = (
  metadata: TrackMetadataForUpload,
  initialMetadata?: Partial<TrackMetadataForUpload>
): SingleTrackEditValues =>
  ({
    ...metadata,
    ...initialMetadata,
    description: metadata.description ?? initialMetadata?.description ?? '',
    tags: metadata.tags ?? initialMetadata?.tags ?? '',
    field_visibility: {
      ...defaultHiddenFields,
      ...initialMetadata?.field_visibility,
      ...metadata.field_visibility,
      remixes: metadata.field_visibility?.remixes ?? true
    },
    stems: metadata.stems ?? initialMetadata?.stems ?? [],
    isrc: metadata.isrc ?? initialMetadata?.isrc ?? '',
    iswc: metadata.iswc ?? initialMetadata?.iswc ?? ''
  }) as SingleTrackEditValues

export const UploadTrackForm = (props: UploadTrackFormProps) => {
  const { formState, onContinue, initialMetadata } = props
  const { tracks } = formState

  const initialValues: TrackEditFormValues = useMemo(
    () => ({
      trackMetadatasIndex: 0,
      tracks: tracks as TrackForUpload[],
      trackMetadatas: tracks.map((track) =>
        getTrackEditInitialMetadata(track.metadata, initialMetadata)
      )
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
