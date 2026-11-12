import { Id, type CrossPlatformFile } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import {
  getTrackCollaboratorsForEdit,
  trackMetadataForUploadToSdk
} from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { UserTrackMetadata } from '~/models'
import { ID } from '~/models/Identifiers'
import { TrackMetadataForUpload } from '~/store/upload'

import { addPremiumMetadata } from '../upload/usePublishTracks'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

import {
  BulkTrackEdit,
  BulkTrackEditPriceSkipReason,
  getBulkTrackEditChanges
} from './bulkTrackEdit'
import { getTrackQueryFn, getTrackQueryKey } from './useTrack'

const CONCURRENCY = 3

export type BulkUpdateTracksParams = {
  trackIds: ID[]
  edit: BulkTrackEdit
  /** Uploaded once and applied to every track. */
  imageFile?: CrossPlatformFile
  onProgress?: (completed: number, total: number) => void
}

export type BulkUpdateTracksResult = {
  updated: ID[]
  unchanged: ID[]
  failed: ID[]
  priceSkipped: { trackId: ID; reason: BulkTrackEditPriceSkipReason }[]
}

export const useBulkUpdateTracks = () => {
  const { audiusSdk, analytics } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: userId } = useCurrentUserId()
  const { data: accountUser } = useCurrentAccountUser()

  return useMutation({
    mutationFn: async ({
      trackIds,
      edit,
      imageFile,
      onProgress
    }: BulkUpdateTracksParams): Promise<BulkUpdateTracksResult> => {
      if (!userId) {
        throw new Error('useBulkUpdateTracks: missing current userId')
      }
      const sdk = await audiusSdk()

      let coverArtCid: string | undefined
      if (imageFile) {
        const { imageUploadResponse } = await sdk.tracks
          .uploadTrackFiles({ imageFile, userId: Id.parse(userId) })
          .start()
        coverArtCid = imageUploadResponse?.orig_file_cid
        if (!coverArtCid) {
          throw new Error('useBulkUpdateTracks: artwork upload failed')
        }
      }

      const ethAddress = accountUser?.wallet
      if (edit.price?.type === 'premium' && ethAddress) {
        import('~/services/audius-backend/solana')
          .then(({ createUserBankIfNeeded }) =>
            createUserBankIfNeeded(sdk, {
              mint: 'USDC',
              ethAddress,
              recordAnalytics: analytics.track
            })
          )
          .catch((error) => {
            console.error(error)
          })
      }

      const result: BulkUpdateTracksResult = {
        updated: [],
        unchanged: [],
        failed: [],
        priceSkipped: []
      }
      let completed = 0

      const updateOne = async (trackId: ID) => {
        try {
          const track =
            queryClient.getQueryData(getTrackQueryKey(trackId)) ??
            (await getTrackQueryFn(trackId, userId, queryClient, sdk, dispatch))
          if (!track || track.owner_id !== userId) {
            result.failed.push(trackId)
            return
          }

          const { changes, priceSkipReason } = getBulkTrackEditChanges(
            track,
            edit
          )
          if (priceSkipReason) {
            result.priceSkipped.push({ trackId, reason: priceSkipReason })
          }
          if (!coverArtCid && Object.keys(changes).length === 0) {
            result.unchanged.push(trackId)
            return
          }

          // Send the full track like the edit form does, so the update can't
          // reset fields this edit doesn't touch.
          const metadata = addPremiumMetadata(userId, {
            ...track,
            collaborators: getTrackCollaboratorsForEdit(track),
            ...changes
          } as TrackMetadataForUpload)
          const sdkMetadata = trackMetadataForUploadToSdk(metadata)
          if (coverArtCid) {
            sdkMetadata.coverArtSizes = coverArtCid
          }

          const generatePreview =
            metadata.preview_start_seconds != null &&
            metadata.preview_start_seconds !== track.preview_start_seconds

          await sdk.tracks.updateTrack({
            trackId: Id.parse(trackId),
            userId: Id.parse(userId),
            generatePreview,
            metadata: sdkMetadata
          })

          primeTrackData({
            tracks: [{ ...track, ...changes }] as UserTrackMetadata[],
            queryClient,
            forceReplace: true
          })
          result.updated.push(trackId)
        } catch (error) {
          console.error(error)
          result.failed.push(trackId)
        } finally {
          completed += 1
          onProgress?.(completed, trackIds.length)
        }
      }

      const queue = [...trackIds]
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, queue.length) },
        async () => {
          while (queue.length) {
            await updateOne(queue.shift()!)
          }
        }
      )
      await Promise.all(workers)

      return result
    },
    onSuccess: (result) => {
      result.updated.forEach((trackId) => {
        queryClient.invalidateQueries({ queryKey: getTrackQueryKey(trackId) })
      })
    }
  })
}
