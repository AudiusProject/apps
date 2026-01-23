import { HashId, Id, type UploadResponse } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mapValues } from 'lodash'
import { useDispatch } from 'react-redux'

import {
  albumMetadataForCreateWithSDK,
  playlistMetadataForCreateWithSDK,
  fileToSdk
} from '~/adapters'
import { isContentUSDCPurchaseGated, type FieldVisibility } from '~/models'
import type { CollectionValues } from '~/schemas'
import {
  type TrackMetadataForUpload,
  libraryPageActions,
  LibraryCategory,
  accountActions
} from '~/store'

import { getCollectionsBatcher } from '../batchers/getCollectionsBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { useCurrentAccountUser } from '../users/account/accountSelectors'
import { useCurrentAccount } from '../users/account/useCurrentAccount'
import { getUserQueryKey } from '../users/useUser'
import { useQueryContext, type QueryContextType } from '../utils'

import {
  publishTracks,
  addPremiumMetadata,
  getUSDCMetadata
} from './usePublishTracks'
import { mutationOptions } from './mutationOptions'

type PublishCollectionContext = Pick<
  QueryContextType,
  'audiusSdk' | 'analytics' | 'dispatch' | 'reportToSentry'
> & {
  userId: number
  wallet: string
}

type PublishCollectionParams = {
  collectionMetadata: CollectionValues
  tracks: {
    clientId: string
    metadata: TrackMetadataForUpload
    audioUploadResponse: UploadResponse
    imageUploadResponse: UploadResponse
  }[]
}

const getPublishCollectionOptions = (context: PublishCollectionContext) =>
  mutationOptions({
    mutationFn: async (params: PublishCollectionParams) => {
      const { audiusSdk, userId, wallet } = context
      const sdk = await audiusSdk()
      if (!userId || !wallet) {
        throw new Error('User ID and wallet are required to publish collection')
      }
      const userBank = await sdk.services.claimableTokensClient.deriveUserBank({
        ethWallet: wallet,
        mint: 'USDC'
      })

      // If the collection is a premium album, this will populate the premium metadata (price/splits/etc)
      let albumTrackPrice: number | undefined
      if (
        params.collectionMetadata.is_album &&
        isContentUSDCPurchaseGated(params.collectionMetadata.stream_conditions)
      ) {
        // albumTrackPrice will be parsed out of the collection metadata, so we keep a copy here
        albumTrackPrice =
          params.collectionMetadata.stream_conditions?.usdc_purchase
            .albumTrackPrice
        params.collectionMetadata.stream_conditions = getUSDCMetadata(
          userBank.toString(),
          params.collectionMetadata.stream_conditions
        )
      }

      // Combine collection metadata into each track's metadata
      for (const track of params.tracks) {
        track.metadata = combineMetadata(
          userBank.toString(),
          track.metadata,
          params.collectionMetadata,
          albumTrackPrice
        )
      }

      // Publish all the tracks first
      const publishedTracks = await publishTracks(
        {
          ...context,
          kind: params.collectionMetadata.is_album ? 'album' : 'playlist'
        },
        params.tracks
      )

      // For collection artwork, use the existing flow (not TUS) to keep things simple for now.
      const { artwork } = params.collectionMetadata
      const artworkBlob =
        artwork && 'file' in artwork ? (artwork?.file ?? null) : null
      const coverArtFile = artworkBlob
        ? fileToSdk(artworkBlob, 'cover_art')
        : undefined
      if (params.collectionMetadata.is_album) {
        return await sdk.albums.createAlbum({
          userId: Id.parse(userId),
          coverArtFile,
          metadata: albumMetadataForCreateWithSDK(params.collectionMetadata),
          trackIds: publishedTracks
            .filter((t) => t.trackId && !t.error)
            .map((t) => t.trackId!)
        })
      } else {
        return await sdk.playlists.createPlaylist({
          userId: Id.parse(userId),
          coverArtFile,
          metadata: playlistMetadataForCreateWithSDK(params.collectionMetadata),
          trackIds: publishedTracks
            .filter((t) => t.trackId && !t.error)
            .map((t) => t.trackId!)
        })
      }
    }
  })

export const usePublishCollection = (
  options?: Partial<ReturnType<typeof getPublishCollectionOptions>>
) => {
  const { audiusSdk, analytics, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: account = null } = useCurrentAccount()
  const { data: accountUser } = useCurrentAccountUser()
  const userId = account?.userId ?? undefined
  const wallet = account?.walletAddresses.currentUser ?? undefined

  return useMutation({
    ...options,
    ...getPublishCollectionOptions({
      audiusSdk,
      userId: userId!,
      wallet: wallet!,
      dispatch,
      analytics,
      reportToSentry
    }),

    onSuccess: async (playlist) => {
      if (!playlist.playlistId) return
      const sdk = await audiusSdk()

      // Prefetch the newly created collection data and prime the cache
      const batchGetCollections = getCollectionsBatcher({
        sdk,
        currentUserId: userId,
        queryClient,
        dispatch
      })
      const collection = await batchGetCollections.fetch(
        HashId.parse(playlist.playlistId)
      )

      // Update the playlist sidebar
      dispatch(
        accountActions.addAccountPlaylist({
          id: collection.playlist_id,
          name: collection.playlist_name,
          is_album: collection.is_album,
          permalink: collection.permalink!,
          user: {
            id: userId!,
            handle: accountUser!.handle
          }
        })
      )

      // Add to library as favorite locally
      dispatch(
        libraryPageActions.addLocalCollection({
          collectionId: collection.playlist_id,
          isAlbum: collection.is_album,
          category: LibraryCategory.Favorite
        })
      )

      // Invalidate user query to update collection count and track count
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

/**
 * Combines the metadata for a track and a collection (playlist or album),
 * taking the metadata from the playlist when the track is missing it.
 */
function combineMetadata(
  userBank: string,
  trackMetadata: TrackMetadataForUpload,
  collectionMetadata: CollectionValues,
  albumTrackPrice?: number
) {
  const metadata = trackMetadata

  // @ts-expect-error - Typing is hard here because playlists and albums have different artwork types
  metadata.artwork = collectionMetadata.artwork

  if (!metadata.genre)
    metadata.genre = collectionMetadata.trackDetails?.genre ?? ''
  if (!metadata.mood)
    metadata.mood = collectionMetadata.trackDetails?.mood ?? null
  if (!metadata.release_date) {
    metadata.release_date = collectionMetadata.release_date ?? null
    metadata.is_scheduled_release =
      collectionMetadata.is_scheduled_release ?? false
  }

  if (metadata.tags === null && collectionMetadata.trackDetails?.tags) {
    // Take collection tags
    metadata.tags = collectionMetadata.trackDetails?.tags
  }

  // Set download & hidden status
  metadata.is_downloadable = !!collectionMetadata.is_downloadable

  metadata.is_unlisted = !!collectionMetadata.is_private
  if (collectionMetadata.is_private && collectionMetadata.field_visibility) {
    // Convert any undefined values to booleans
    const booleanFieldVisibility = mapValues(
      collectionMetadata.field_visibility,
      Boolean
    ) as FieldVisibility
    metadata.field_visibility = booleanFieldVisibility
  }

  // If the tracks were added as part of a premium album, add all the necessary premium track metadata
  if (albumTrackPrice !== undefined && albumTrackPrice > 0) {
    // is_download_gated must always be set to true for all premium tracks
    metadata.is_download_gated = true
    metadata.download_conditions = {
      usdc_purchase: {
        price: albumTrackPrice,
        splits: { 0: 0 }
      }
    }
    // Set up initial stream gating values
    metadata.is_stream_gated = true
    metadata.preview_start_seconds = 0
    metadata.stream_conditions = {
      usdc_purchase: { price: albumTrackPrice, splits: { 0: 0 } }
    }
    // Add splits to stream & download conditions
    addPremiumMetadata(userBank, metadata)
  }
  return metadata
}
