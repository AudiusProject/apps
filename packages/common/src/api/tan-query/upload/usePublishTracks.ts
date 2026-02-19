import { USDC } from '@audius/fixed-decimal'
import { HashId, Id, type UploadResponse } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { trackMetadataForUploadToSdk } from '~/adapters'
import {
  isContentUSDCPurchaseGated,
  type USDCPurchaseConditions,
  Name,
  Feature
} from '~/models'
import { ProgressStatus, uploadActions } from '~/store'
import type { TrackMetadataForUpload } from '~/store'

import { getTracksBatcher } from '../batchers/getTracksBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentAccount } from '../users/account/useCurrentAccount'
import { getUserQueryKey } from '../users/useUser'
import { useQueryContext, type QueryContextType } from '../utils'

import { mutationOptions } from './mutationOptions'
import { publishStems } from './usePublishStems'

const { updateProgress } = uploadActions

type PublishTracksContext = Pick<
  QueryContextType,
  'audiusSdk' | 'analytics' | 'dispatch' | 'reportToSentry'
> & {
  userId: number
  wallet: string
  kind?: 'tracks' | 'album' | 'playlist'
}

type PublishTracksParams = {
  clientId: string
  metadata: TrackMetadataForUpload
  audioUploadResponse: UploadResponse
  imageUploadResponse: UploadResponse
  stemsUploadResponses?: UploadResponse[]
}[]

export const publishTracks = async (
  context: PublishTracksContext,
  params: PublishTracksParams
) => {
  const {
    userId,
    wallet,
    kind,
    audiusSdk,
    dispatch,
    reportToSentry,
    analytics: { make, track }
  } = context

  if (!context.userId || !context.wallet) {
    throw new Error('User ID and wallet are required to publish tracks')
  }

  const sdk = await audiusSdk()
  const userBank = await sdk.services.claimableTokensClient.deriveUserBank({
    ethWallet: wallet,
    mint: 'USDC'
  })
  return await Promise.all(
    params.map(async (param) => {
      const snakeMetadata = addPremiumMetadata(
        userBank.toString(),
        param.metadata
      )

      const trackId = await sdk.tracks.generateTrackId()
      const camelMetadata = trackMetadataForUploadToSdk({
        ...snakeMetadata,
        track_id: trackId
      })

      const publishParentTrack = async () => {
        try {
          const res = await sdk.tracks.publishTrack({
            userId: Id.parse(userId),
            metadata: camelMetadata as Parameters<
              typeof sdk.tracks.publishTrack
            >[0]['metadata'],
            audioUploadResponse: param.audioUploadResponse,
            imageUploadResponse: param.imageUploadResponse
          })
          dispatch(
            updateProgress({
              clientId: param.clientId,
              stemIndex: null,
              key: 'audio',
              progress: { status: ProgressStatus.COMPLETE }
            })
          )

          dispatch(
            updateProgress({
              clientId: param.clientId,
              stemIndex: null,
              key: 'image',
              progress: { status: ProgressStatus.COMPLETE }
            })
          )

          // Track success analytics for this individual track
          const analyticsKind =
            (kind ?? 'tracks') === 'tracks'
              ? params.length > 1
                ? 'multi_track'
                : 'single_track'
              : kind === 'album'
                ? 'album'
                : 'playlist'
          track(
            make({
              eventName: Name.TRACK_UPLOAD_SUCCESS,
              endpoint: '',
              kind: analyticsKind
            })
          )
          return { result: res, error: null }
        } catch (e) {
          dispatch(
            updateProgress({
              clientId: param.clientId,
              stemIndex: null,
              key: 'audio',
              progress: { status: ProgressStatus.ERROR }
            })
          )
          reportToSentry({
            error: e as Error,
            name: 'Upload: Track Publish',
            feature: Feature.Upload
          })
          console.error('Error publishing track:', e)
          return { result: null, error: e as Error }
        }
      }

      const [trackResult, stemsResults] = await Promise.all([
        publishParentTrack(),
        publishStems(context, {
          clientId: param.clientId,
          parentMetadata: param.metadata,
          stems:
            param.metadata.stems
              ?.map((stem, index) => {
                const audioUploadResponse = param.stemsUploadResponses?.[index]

                // This should never be the case, but being defensive
                if (!audioUploadResponse) return null
                return {
                  metadata: stem,
                  audioUploadResponse
                }
              })
              .filter(
                (stem): stem is NonNullable<typeof stem> => stem !== null
              ) ?? [],
          parentTrackId: trackId
        })
      ])

      return {
        clientId: param.clientId,
        trackId: trackResult.result?.trackId ?? null,
        stems: stemsResults,
        error: trackResult.error
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
  options?: Partial<ReturnType<typeof getPublishTracksOptions>> & {
    kind?: 'tracks' | 'album' | 'playlist'
  }
) => {
  const queryContext = useQueryContext()
  const queryClient = useQueryClient()
  const { data: account } = useCurrentAccount()
  const { data: accountUser } = useCurrentAccountUser()
  const userId = account?.userId ?? undefined
  const wallet = account?.walletAddresses.currentUser ?? undefined
  const kind = options?.kind ?? 'tracks'

  return useMutation({
    ...options,
    ...getPublishTracksOptions({
      ...queryContext,
      userId: userId!,
      wallet: wallet!,
      kind
    }),
    onSuccess: async (data) => {
      const sdk = await queryContext.audiusSdk()
      const batchGetTracks = getTracksBatcher({
        sdk,
        currentUserId: userId,
        queryClient,
        dispatch: queryContext.dispatch
      })
      // Prefetch the published tracks into the cache
      await Promise.all(
        data
          .filter((res) => !res.error && res.trackId)
          .map((res) => batchGetTracks.fetch(HashId.parse(res.trackId!)))
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
 * returns updated conditions with price in WEI and splits in the new array format.
 */
export function getUSDCMetadata(
  userBank: string,
  stream_conditions: USDCPurchaseConditions
): USDCPurchaseConditions {
  const priceCents = stream_conditions.usdc_purchase.price
  const priceWei = Number(USDC(priceCents / 100).value.toString())
  return {
    usdc_purchase: {
      price: priceCents,
      ...(stream_conditions.usdc_purchase.albumTrackPrice != null && {
        albumTrackPrice: stream_conditions.usdc_purchase.albumTrackPrice
      }),
      splits: [
        {
          payout_wallet: userBank?.toString() ?? '',
          percentage: 100,
          amount: priceWei
        }
      ]
    }
  }
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
