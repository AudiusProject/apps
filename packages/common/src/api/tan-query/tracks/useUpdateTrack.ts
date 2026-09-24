import {
  type UpdateTrackRequestBody,
  Id,
  type CrossPlatformFile
} from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useStore } from 'react-redux'

import { trackMetadataForUploadToSdk } from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { Track, UserTrackMetadata } from '~/models'
import { ID } from '~/models/Identifiers'
import { isContentUSDCPurchaseGated } from '~/models/Track'
import { createUserBankIfNeeded } from '~/services/audius-backend'
import { CommonState } from '~/store/commonStore'
import { stemsUploadSelectors } from '~/store/stems-upload'
import { replaceTrackProgressModalActions } from '~/store/ui/modals/replace-track-progress-modal'
import { toast } from '~/store/ui/toast/slice'
import { TrackMetadataForUpload } from '~/store/upload'
import { squashNewLines } from '~/utils/formatUtil'
import { formatMusicalKey } from '~/utils/musicalKeys'

import { TQTrack } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { addPremiumMetadata } from '../upload/usePublishTracks'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { handleStemUpdates } from '../utils/handleStemUpdates'
import { primeTrackData } from '../utils/primeTrackData'

import { useDeleteTrack } from './useDeleteTrack'
import { getStemsQueryKey } from './useStems'
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

/**
 * Edit-track formatting that lived in the legacy `editTrackAsync` saga:
 * normalize description, format musical key, coerce bpm, and recompute the
 * "is custom" flags. Mutates the metadata in place.
 */
const applyEditTrackFormatting = (
  metadata: Partial<TrackMetadataForUpload>,
  previousTrack: Partial<Track> | undefined
) => {
  if (metadata.description !== undefined) {
    metadata.description = squashNewLines(metadata.description) ?? null
  }
  if (metadata.musical_key !== undefined) {
    metadata.musical_key =
      formatMusicalKey(metadata.musical_key || undefined) ?? null
  }
  if (metadata.bpm !== undefined) {
    metadata.bpm = metadata.bpm ? Number(metadata.bpm) : null
  }
  if (previousTrack) {
    if ('bpm' in metadata) {
      metadata.is_custom_bpm =
        previousTrack.is_custom_bpm ||
        (!!metadata.bpm && metadata.bpm !== previousTrack.bpm)
    }
    if ('musical_key' in metadata) {
      metadata.is_custom_musical_key =
        previousTrack.is_custom_musical_key ||
        (!!metadata.musical_key &&
          metadata.musical_key !== previousTrack.musical_key)
    }
  }
}

export const useUpdateTrack = () => {
  const { audiusSdk, analytics } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const store = useStore()
  const { mutate: deleteTrack } = useDeleteTrack()
  const { data: userId } = useCurrentUserId()
  const { data: accountUser } = useCurrentAccountUser()

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
      if (!userId) {
        throw new Error('useUpdateTrack: missing current userId')
      }
      // Apply legacy edit-track formatting (squash newlines, format musical
      // key, coerce bpm, recompute is_custom flags). Replaces
      // `editTrackAsync` saga preprocessing.
      applyEditTrackFormatting(metadata, previousMetadata)

      const metadataWithSplits = addPremiumMetadata(
        userId,
        metadata as TrackMetadataForUpload
      )
      const sdkMetadata = trackMetadataForUploadToSdk(metadataWithSplits)

      const ethAddress = accountUser?.wallet
      if (
        ethAddress &&
        (isContentUSDCPurchaseGated(metadataWithSplits.stream_conditions) ||
          isContentUSDCPurchaseGated(metadataWithSplits.download_conditions))
      ) {
        createUserBankIfNeeded(sdk, {
          mint: 'USDC',
          ethAddress,
          recordAnalytics: analytics.track
        }).catch((error) => {
          console.error(error)
        })
      }

      // A changed preview start needs a freshly sliced preview clip. The SDK
      // only regenerates when asked (and skips it when a new audio file is
      // uploaded, since transcoding produces the preview then); without this
      // flag an edit updates preview_start_seconds in metadata while the
      // track keeps streaming the old preview_cid's clip.
      const generatePreview =
        metadataWithSplits.preview_start_seconds != null &&
        metadataWithSplits.preview_start_seconds !==
          previousMetadata?.preview_start_seconds

      const response = await sdk.tracks.updateTrack({
        audioFile,
        imageFile,
        trackId: Id.parse(trackId),
        userId: Id.parse(userId),
        generatePreview,
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
      // Server view of the track's stems. Anything not represented in the
      // submitted metadata is treated as removed, so this has to come from the
      // stems query rather than the cached track — the track's `_stems` field
      // was never populated, which silently discarded every stem removal.
      const existingStems =
        queryClient.getQueryData(getStemsQueryKey(trackId)) ?? []
      handleStemUpdates(
        metadata,
        trackId,
        existingStems,
        inProgressStemUploads,
        (trackId: ID) => deleteTrack({ trackId }),
        dispatch
      )

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
      dispatch(toast({ content: 'Changes saved!' }))
    },
    onError: (error, { trackId }, context?: MutationContext) => {
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

      console.error(error)
    }
  })
}
