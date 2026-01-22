import { Id, type ProgressHandler } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useStore } from 'react-redux'

import { fileToSdk, trackMetadataForUploadToSdk } from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { UserTrackMetadata } from '~/models'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { CommonState } from '~/store/commonStore'
import { stemsUploadSelectors } from '~/store/stems-upload'
import { TrackMetadataForUpload } from '~/store/upload'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
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
  userId: ID
  metadata: Partial<TrackMetadataForUpload>
  audioFile?: File
  coverArtFile?: File
  onProgress?: ProgressHandler
}

export const useUpdateTrack = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const store = useStore()
  const { mutate: deleteTrack } = useDeleteTrack()

  return useMutation({
    mutationFn: async ({
      trackId,
      userId,
      metadata,
      audioFile,
      coverArtFile,
      onProgress
    }: UpdateTrackParams) => {
      const sdk = await audiusSdk()

      const previousMetadata = queryClient.getQueryData(
        getTrackQueryKey(trackId)
      )
      const sdkMetadata = trackMetadataForUploadToSdk(
        metadata as TrackMetadataForUpload
      )

      const response = await sdk.tracks.updateTrack({
        audioFile: audioFile ? fileToSdk(audioFile, 'audio') : undefined,
        imageFile: coverArtFile
          ? fileToSdk(coverArtFile, 'cover_art')
          : undefined,
        trackId: Id.parse(trackId),
        userId: Id.parse(userId),
        metadata: sdkMetadata,
        onProgress
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
    onMutate: async ({ trackId, metadata }): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getTrackQueryKey(trackId)
      })

      // Snapshot the previous values
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))

      // Optimistically update track
      if (previousTrack) {
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
    onError: (
      error,
      { trackId, userId, metadata },
      context?: MutationContext
    ) => {
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
    },
    onSettled: (_, __, { trackId }) => {
      // Always refetch after error or success to ensure cache is in sync with server
      // queryClient.invalidateQueries({ queryKey: getTrackQueryKey(trackId) })
    }
  })
}
