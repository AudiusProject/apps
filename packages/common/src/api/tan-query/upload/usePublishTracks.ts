import { USDC } from '@audius/fixed-decimal'
import { HashId, Id, type UploadResponse } from '@audius/sdk'
import {
  mutationOptions,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { trackMetadataForUploadToSdk } from '~/adapters'
import {
  isContentUSDCPurchaseGated,
  StemCategory,
  type USDCPurchaseConditions,
  Name
} from '~/models'
import { ProgressStatus, uploadActions } from '~/store'
import type { TrackMetadataForUpload } from '~/store'

import { getTracksBatcher } from '../batchers/getTracksBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentAccount } from '../users/account/useCurrentAccount'
import { getUserQueryKey } from '../users/useUser'
import { useQueryContext, type QueryContextType } from '../utils'

const { updateProgress } = uploadActions

type PublishTracksContext = Pick<
  QueryContextType,
  'audiusSdk' | 'analytics' | 'dispatch'
> & {
  userId?: number
  wallet?: string
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
  if (!context.userId || !context.wallet) {
    throw new Error('User ID and wallet are required to publish tracks')
  }
  const { userId, wallet, dispatch } = context
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

        const trackId = await sdk.tracks.generateTrackId()
        const camelMetadata = trackMetadataForUploadToSdk({
          ...snakeMetadata,
          track_id: trackId
        })

        const publishParentTrack = async () => {
          const res = await sdk.tracks.publishTrack({
            userId: Id.parse(userId),
            metadata: camelMetadata,
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

          // Track success analytics for this individual track
          const analyticsKind =
            (context.kind ?? 'tracks') === 'tracks'
              ? params.length > 1
                ? 'multi_track'
                : 'single_track'
              : context.kind === 'album'
                ? 'album'
                : 'playlist'
          context.analytics?.track(
            context.analytics.make({
              eventName: Name.TRACK_UPLOAD_SUCCESS,
              endpoint: '',
              kind: analyticsKind
            })
          )
          return res
        }

        const results = await Promise.all([
          publishParentTrack(),
          ...(param.metadata.stems ?? []).map(async (stem, index) => {
            try {
              const stemUploadResponse = param.stemsUploadResponses?.[index]
              if (!stemUploadResponse) {
                throw new Error(`No upload response found for stem ${index}`)
              }
              const metadata = {
                ...stem.metadata,
                genre: param.metadata.genre,
                is_downloadable: true,
                stem_of: {
                  category: stem.category ?? StemCategory.OTHER,
                  parent_track_id: trackId
                }
              }
              const stemRes = await sdk.tracks.publishTrack({
                userId: Id.parse(userId),
                metadata: trackMetadataForUploadToSdk(metadata),
                audioUploadResponse: stemUploadResponse,
                imageUploadResponse: param.imageUploadResponse
              })
              dispatch(
                updateProgress({
                  clientId: param.clientId,
                  stemIndex: index,
                  key: 'audio',
                  progress: { status: ProgressStatus.COMPLETE }
                })
              )
              context.analytics?.track(
                context.analytics.make({
                  eventName: Name.STEM_COMPLETE_UPLOAD,
                  id: HashId.parse(stemRes.trackId),
                  parent_track_id: trackId,
                  category: stem.category ?? StemCategory.OTHER
                })
              )
              return stemRes
            } catch (e) {
              dispatch(
                updateProgress({
                  clientId: param.clientId,
                  stemIndex: index,
                  key: 'audio',
                  progress: { status: ProgressStatus.ERROR }
                })
              )
              console.error('Error publishing stem:', e)
              throw e
            }
          })
        ])

        return { clientId: param.clientId, trackId: results[0].trackId }
      } catch (e) {
        dispatch(
          updateProgress({
            clientId: param.clientId,
            stemIndex: null,
            key: 'audio',
            progress: { status: ProgressStatus.ERROR }
          })
        )
        console.error('Error publishing track:', e)
        return { clientId: param.clientId, error: true }
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
  const { audiusSdk, analytics } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { data: account } = useCurrentAccount()
  const { data: accountUser } = useCurrentAccountUser()
  const userId = account?.userId ?? undefined
  const wallet = account?.walletAddresses.currentUser ?? undefined
  const kind = options?.kind ?? 'tracks'

  return useMutation({
    ...options,
    ...getPublishTracksOptions({
      audiusSdk,
      userId,
      wallet,
      dispatch,
      analytics,
      kind
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
