import { useCallback, useLayoutEffect, useState } from 'react'

import { ErrorLevel, Feature } from '@audius/common/models'
import { newCollectionMetadata } from '@audius/common/schemas'
import {
  TrackMetadataForUpload,
  UploadFormState,
  UploadType
} from '@audius/common/store'
import { removeNullable, Nullable } from '@audius/common/utils'
import cn from 'classnames'

import { AudioQuality } from 'components/upload/AudioQuality'
import { Dropzone } from 'components/upload/Dropzone'
import { InvalidFileType } from 'components/upload/InvalidFileType'
import { reportToSentry } from 'store/errors/reportToSentry'

import { TracksPreview } from '../components/TracksPreview'
import { processFiles } from '../store/utils/processFiles'

import styles from './SelectPage.module.css'

type ErrorType = { reason: 'corrupted' | 'size' | 'type' } | null

type SelectPageProps = {
  formState: UploadFormState
  onContinue: (formState: UploadFormState) => void
  initialMetadata?: Partial<TrackMetadataForUpload>
}

const SelectPage = (props: SelectPageProps) => {
  const { formState, onContinue, initialMetadata } = props

  const [tracks, setTracks] = useState(formState.tracks ?? [])
  const [uploadType, setUploadType] = useState(
    formState.uploadType ?? UploadType.INDIVIDUAL_TRACK
  )
  const [uploadTrackError, setUploadTrackError] =
    useState<Nullable<ErrorType>>(null)

  const [isFirstUpload, setIsFirstUpload] = useState(true)

  const handleContinue = useCallback(() => {
    if (uploadType !== undefined && tracks) {
      switch (uploadType) {
        case UploadType.INDIVIDUAL_TRACK:
        case UploadType.INDIVIDUAL_TRACKS:
          onContinue({ tracks, uploadType })
          break
        case UploadType.ALBUM:
        case UploadType.PLAYLIST:
          onContinue({ tracks, uploadType, metadata: newCollectionMetadata() })
          break
      }
    }
  }, [onContinue, tracks, uploadType])

  const onSelectTracks = useCallback(
    async (selectedFiles: File[]) => {
      const existing = new Set(
        tracks.map(({ file }) => `${file!.name}-${(file as File).lastModified}`)
      )
      selectedFiles = selectedFiles.filter(({ name, lastModified }) => {
        const id = `${name}-${lastModified}`
        if (existing.has(id)) return false
        existing.add(id)
        return true
      })

      const processedFiles = processFiles(selectedFiles, (name, reason) => {
        reportToSentry({
          name: 'UploadProcessFiles',
          error: new Error(`${reason} error for file ${name}`),
          feature: Feature.Upload,
          level: ErrorLevel.Warning,
          additionalInfo: {
            selectedFiles
          }
        })
        return setUploadTrackError({ reason })
      })
      const processedTracks = (await Promise.all(processedFiles)).filter(
        removeNullable
      )
      if (processedTracks.length === processedFiles.length) {
        setUploadTrackError(null)
      }

      if (
        uploadType === UploadType.INDIVIDUAL_TRACK &&
        tracks.length + processedTracks.length > 1
      ) {
        setUploadType(UploadType.INDIVIDUAL_TRACKS)
      }

      setTracks([...tracks, ...processedTracks])
    },
    [tracks, uploadType]
  )

  useLayoutEffect(() => {
    if (tracks.length === 0) return

    if (isFirstUpload && tracks.length === 1 && initialMetadata?.remix_of) {
      handleContinue()
    }
    setIsFirstUpload(false)
  }, [initialMetadata?.remix_of, handleContinue, isFirstUpload, tracks])

  const onRemoveTrack = useCallback(
    (index: number) => {
      setTracks(tracks.filter((_, i) => i !== index))
      setUploadType(
        tracks.length === 2 ? UploadType.INDIVIDUAL_TRACK : uploadType
      )
    },
    [setTracks, setUploadType, tracks, uploadType]
  )

  const textAboveIcon = tracks.length > 0 ? 'More to Upload?' : undefined
  return (
    <div>
      <div className={styles.select}>
        <div className={styles.dropzone}>
          <Dropzone
            textAboveIcon={textAboveIcon}
            onDropAccepted={onSelectTracks}
            onDropRejected={onSelectTracks}
          >
            <AudioQuality />
          </Dropzone>
          {uploadTrackError ? (
            <InvalidFileType
              reason={uploadTrackError.reason}
              className={styles.invalidFileType}
            />
          ) : null}
        </div>
        <div
          className={cn(styles.uploaded, {
            [styles.hide]: tracks.length === 0
          })}
        >
          {tracks.length > 0 ? (
            <TracksPreview
              tracks={tracks}
              uploadType={uploadType}
              onRemove={onRemoveTrack}
              setUploadType={setUploadType}
              onContinue={handleContinue}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default SelectPage
