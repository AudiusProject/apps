import { useCallback, useContext, useEffect, useState } from 'react'

import { TrackForUpload } from '@audius/common/store'
import { IconPause, IconPlay, PlainButton } from '@audius/harmony'
import { useField } from 'formik'

import { UploadPreviewContext } from '../utils/uploadPreviewContext'

const messages = {
  overrideLabel: 'Override details for this track',
  preview: 'Preview',
  delete: 'Delete'
}

type PreviewButtonProps = {
  index: number
  className?: string
}

export const PreviewButton = (props: PreviewButtonProps) => {
  const { index, className } = props
  const { playingPreviewIndex, togglePreview } =
    useContext(UploadPreviewContext)
  const [{ value: track }] = useField<TrackForUpload>(`tracks.${index}`)
  const isPreviewPlaying = playingPreviewIndex === index

  const [canPlayPreview, setCanPlayPreview] = useState(false)

  const canPlay = useCallback(() => {
    setCanPlayPreview(true)
  }, [setCanPlayPreview])

  useEffect(() => {
    if (!track.preview) return
    if (track.preview.readyState >= 2) {
      canPlay()
    } else {
      track.preview.addEventListener('canplay', canPlay)
      return () => {
        track.preview.removeEventListener('canplay', canPlay)
      }
    }
  }, [track.preview, canPlay])

  return canPlayPreview ? (
    <PlainButton
      className={className}
      variant='subdued'
      type='button'
      iconLeft={isPreviewPlaying ? IconPause : IconPlay}
      onClick={() => {
        togglePreview(track.preview, index)
      }}
    >
      {messages.preview}
    </PlainButton>
  ) : null
}
