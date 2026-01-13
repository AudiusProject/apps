import { USDC } from '@audius/fixed-decimal'
import { HashId, Id } from '@audius/sdk'
import {
  mutationOptions,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { trackMetadataForUploadToSdk } from '~/adapters'
import {
  isContentUSDCPurchaseGated,
  type StemUploadWithCids,
  type USDCPurchaseConditions
} from '~/models'
import { ProgressStatus } from '~/store'
import type { Progress, TrackMetadataForUpload } from '~/store'

import { getTracksBatcher } from '../batchers/getTracksBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentAccount } from '../users/account/useCurrentAccount'
import { getUserQueryKey } from '../users/useUser'
import { useQueryContext, type QueryContextType } from '../utils'

type PublishTracksContext = Pick<QueryContextType, 'audiusSdk'> & {
  userId?: number
  wallet?: string
}

type PublishTracksParams = {
  clientId: string
  metadata: TrackMetadataForUpload
  onProgress: (
    clientId: string,
    stemIndex: number | null,
    progress: Progress
  ) => void
}[]

export const publishTracks = async (
  context: PublishTracksContext,
  params: PublishTracksParams
) => {
  if (!context.userId || !context.wallet) {
    throw new Error('User ID and wallet are required to publish tracks')
  }
  const { userId, wallet } = context
  const sdk = await context.audiusSdk()
  const userBank = await sdk.services.claimableTokensClient.deriveUserBank({
    ethWallet: wallet,
    mint: 'USDC'
  })
  return await Promise.all(
    params.map(async (param) => {
      try {
        const snakeMetadata = addPremiumMetadata(
          userBank.toString(),
          param.metadata
        )
        const camelMetadata = trackMetadataForUploadToSdk(snakeMetadata)
        const res = await sdk.tracks.writeTrackToChain(
          Id.parse(userId),
          camelMetadata
        )
        param.onProgress(param.clientId, null, {
          status: ProgressStatus.COMPLETE
        })

        await Promise.all(
          (param.metadata.stems ?? []).map(async (s, index) => {
            const stem = s as StemUploadWithCids
            stem.stem_of.parent_track_id = HashId.parse(res.trackId)
            const metadata = {
              ...snakeMetadata,
              ...stem
            }
            console.log({ trackId: res.trackId, snakeMetadata, stem, metadata })
            const stemRes = await sdk.tracks.writeTrackToChain(
              Id.parse(userId),
              trackMetadataForUploadToSdk(metadata)
            )
            param.onProgress(param.clientId, index, {
              status: ProgressStatus.COMPLETE
            })
            return stemRes
          })
        )

        return { clientId: param.clientId, trackId: res.trackId }
      } catch (e) {
        param.onProgress(param.clientId, null, {
          status: ProgressStatus.ERROR
        })
        console.error('Error publishing track:', e)
        return { clientId: param.clientId, error: e }
      }
    })
  )
}

const getPublishTracksOptions = (context: PublishTracksContext) =>
  mutationOptions({
    mutationFn: async (params: PublishTracksParams) =>
      publishTracks(context, params)
  })

export const usePublishTracks = (
  options?: Partial<ReturnType<typeof getPublishTracksOptions>>
) => {
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { data: account } = useCurrentAccount()
  const { data: accountUser } = useCurrentAccountUser()
  const userId = account?.userId ?? undefined
  const wallet = account?.walletAddresses.currentUser ?? undefined

  return useMutation({
    ...options,
    ...getPublishTracksOptions({
      audiusSdk,
      userId,
      wallet
    }),
    onSuccess: async (data) => {
      const sdk = await audiusSdk()
      const batchGetTracks = getTracksBatcher({
        sdk,
        currentUserId: userId,
        queryClient,
        dispatch
      })
      // Prefetch the published tracks into the cache
      await Promise.all(
        data.map((res) => batchGetTracks.fetch(HashId.parse(res.trackId)))
      )

      // Invalidate the user's data to update track count
      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(userId)
      })

      // Invalidate the uploader's profile tracks cache
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.profileTracks, accountUser?.handle]
      })
    }
  })
}

/*
 * Given a user's bank and USDC purchase conditions,
 * returns updated conditions with price in WEI and splits added.
 *
 * TODO: Update this to use the new user ID + percentages format.
 */
export function getUSDCMetadata(
  userBank: string,
  stream_conditions: USDCPurchaseConditions
) {
  const priceCents = stream_conditions.usdc_purchase.price
  const priceWei = Number(USDC(priceCents / 100).value.toString())
  const conditionsWithMetadata: USDCPurchaseConditions = {
    usdc_purchase: {
      price: priceCents,
      splits: {
        [userBank?.toString() ?? '']: priceWei
      }
    }
  }
  return conditionsWithMetadata
}

/**
 * Adds relevant premium metadata
 * Converts prices to WEI and adds splits for USDC purchasable content.
 */
export function addPremiumMetadata<T extends TrackMetadataForUpload>(
  userBank: string,
  track: T
) {
  // download_conditions could be set separately from stream_conditions, so we check for them first
  if (isContentUSDCPurchaseGated(track.download_conditions)) {
    track.download_conditions = getUSDCMetadata(
      userBank,
      track.download_conditions
    )
  }

  if (isContentUSDCPurchaseGated(track.stream_conditions)) {
    track.stream_conditions = getUSDCMetadata(userBank, track.stream_conditions)
    // If stream_conditions are set, download_conditions should always match
    track.download_conditions = getUSDCMetadata(
      userBank,
      track.stream_conditions
    )
  }

  return track
}
