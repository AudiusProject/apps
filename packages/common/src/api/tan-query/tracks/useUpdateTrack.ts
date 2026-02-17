import { type UpdateTrackRequestBody, Id, type CrossPlatformFile } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useStore } from 'react-redux'

import { trackMetadataForUploadToSdk } from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { UserTrackMetadata } from '~/models'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { CommonState } from '~/store/commonStore'
import { stemsUploadSelectors } from '~/store/stems-upload'
import { replaceTrackProgressModalActions } from '~/store/ui/modals/replace-track-progress-modal'
import { TrackMetadataForUpload } from '~/store/upload'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { handleStemUpdates } from '../utils/handleStemUpdates'
import { primeTrackData } from '../utils/primeTrackData'

import { useDeleteTrack } from './useDeleteTrack'
import { getTrackQueryKey } from './useTrack'

const { getCurrentUploads } = stemsUploadSelectors

type MutationContext = {
  previousTrack: TQTrack | undefined
}

export type UpdateTrackParams = {
  trackId: ID
  metadata: Partial<TrackMetadataForUpload>
  audioFile?: CrossPlatformFile
  imageFile?: CrossPlatformFile
}

export const useUpdateTrack = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const store = useStore()
  const { mutate: deleteTrack } = useDeleteTrack()
  const { data: userId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({
      trackId,
      metadata,
      audioFile,
      imageFile
    }: UpdateTrackParams) => {
      const sdk = await audiusSdk()

      const previousMetadata = queryClient.getQueryData(
        getTrackQueryKey(trackId)
      )
      const sdkMetadata = trackMetadataForUploadToSdk(
        metadata as TrackMetadataForUpload
      )

      const response = await sdk.tracks.updateTrack({
        audioFile,
        imageFile,
        trackId: Id.parse(trackId),
        userId: Id.parse(userId),
        metadata: sdkMetadata as UpdateTrackRequestBody,
        onProgress: (_, progress) => {
          if (progress.key === 'audio') {
            dispatch(
              replaceTrackProgressModalActions.set({
                ...progress,
                error: false
              })
            )
          }
        }
      })

      // TODO: migrate stem uploads to use tan-query
      const inProgressStemUploads = getCurrentUploads(
        store.getState() as CommonState,
        trackId
      )
      if (previousMetadata) {
        handleStemUpdates(
          metadata,
          previousMetadata as any,
          inProgressStemUploads,
          (trackId: ID) => deleteTrack({ trackId }),
          dispatch
        )
      }

      // TODO: remixOf event tracking, see trackNewRemixEvent saga

      return response
    },
    onMutate: async ({
      trackId,
      metadata,
      audioFile,
      imageFile
    }): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getTrackQueryKey(trackId)
      })

      dispatch(
        replaceTrackProgressModalActions.set({
          error: false,
          loaded: 0,
          total: 0,
          transcode: 0
        })
      )

      // Snapshot the previous values
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))

      // Only perform optimistic update if we're not uploading files
      // When files are being uploaded, we can't accurately represent the new state
      // until the upload completes
      if (previousTrack && !audioFile && !imageFile) {
        primeTrackData({
          tracks: [{ ...previousTrack, ...metadata }] as UserTrackMetadata[],
          queryClient,
          forceReplace: true
        })
      }

      // Return context with the previous track and metadata
      return { previousTrack }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: getTrackQueryKey(params.trackId)
      })
    },
    onError: (error, { trackId, metadata }, context?: MutationContext) => {
      // If the mutation fails, roll back track data
      if (context?.previousTrack) {
        primeTrackData({
          tracks: [context.previousTrack],
          queryClient,
          forceReplace: true
        })
      }

      // Roll back all collections that contain this track
      queryClient.setQueriesData(
        { queryKey: [QUERY_KEYS.collection] },
        (oldData: any) => {
          if (!oldData?.tracks?.some((track: any) => track.id === trackId)) {
            return oldData
          }

          return {
            ...oldData,
            tracks: oldData.tracks.map((track: any) =>
              track.id === trackId ? context?.previousTrack : track
            )
          }
        }
      )

      dispatch(
        replaceTrackProgressModalActions.set({
          error: true,
          loaded: 0,
          total: 0,
          transcode: 0
        })
      )

      reportToSentry({
        error,
        additionalInfo: {
          trackId,
          userId,
          metadata
        },
        feature: Feature.Edit,
        name: 'Edit Track'
      })
    }
  })
}
