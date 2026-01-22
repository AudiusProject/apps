import { useCallback } from 'react'

import { trackMetadataForUploadToSdk } from '@audius/common/adapters'
import { useCurrentUserId, useUpdateTrack } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import {
  replaceTrackProgressModalActions,
  TrackMetadataForUpload,
  useReplaceTrackProgressModal
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

/**
 * Custom hook for replacing a track's audio file in the edit flow.
 * Uses the useUploadFiles hook for TUS-based uploads.
 */
export const useReplaceTrackAudio = () => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const { data: currentUserId } = useCurrentUserId()
  const {
    onOpen: openReplaceTrackProgress,
    onClose: closeReplaceTrackProgress
  } = useReplaceTrackProgressModal()

  const { mutateAsync: updateTrack } = useUpdateTrack()

  const replaceTrackAudio = useCallback(
    async ({
      trackId,
      file,
      metadata
    }: {
      trackId: ID
      file: File
      metadata: TrackMetadataForUpload
    }) => {
      try {
        if (!currentUserId) {
          throw new Error('No user id found. Not signed in?')
        }

        // Open progress modal
        openReplaceTrackProgress()

        // Prepare metadata for upload
        const uploadMetadata = trackMetadataForUploadToSdk(metadata)

        // Update the track using TanStack Query mutation
        await updateTrack({
          trackId,
          userId: currentUserId,
          audioFile: file,
          metadata: uploadMetadata,
          onProgress: (_, progress) => {
            dispatch(
              replaceTrackProgressModalActions.set({
                ...progress,
                error: false
              })
            )
          }
        })

        closeReplaceTrackProgress()

        // Navigate to track page
        if (metadata.permalink) {
          navigate(metadata.permalink)
        }
      } catch (e) {
        console.error('Error replacing track audio:', e)
        dispatch(
          replaceTrackProgressModalActions.set({
            loaded: 0,
            total: 0,
            transcode: 0,
            error: true
          })
        )
      }
    },
    [
      currentUserId,
      openReplaceTrackProgress,
      updateTrack,
      closeReplaceTrackProgress,
      dispatch,
      navigate
    ]
  )

  return { replaceTrackAudio }
}
