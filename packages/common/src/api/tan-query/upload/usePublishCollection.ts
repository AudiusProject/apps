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
import { updatePlaylistLibrary } from '../users/account/useUpdatePlaylistLibrary'
import { getUserQueryKey } from '../users/useUser'
import { useQueryContext, type QueryContextType } from '../utils'

import { mutationOptions } from './mutationOptions'
import {
  publishTracks,
  addPremiumMetadata,
  getUSDCMetadata
} from './usePublishTracks'

type PublishCollectionContext = Pick<
  QueryContextType,
  'audiusSdk' | 'analytics' | 'dispatch'
> & {
  userId: number
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
      const { audiusSdk, userId } = context
      const sdk = await audiusSdk()
      if (!userId) {
        throw new Error('User ID and wallet are required to publish collection')
      }

      let albumTrackPrice: number | undefined
      if (
        params.collectionMetadata.is_album &&
        isContentUSDCPurchaseGated(params.collectionMetadata.stream_conditions)
      ) {
        albumTrackPrice =
          params.collectionMetadata.stream_conditions?.usdc_purchase
            .albumTrackPrice ?? undefined
        params.collectionMetadata.stream_conditions = getUSDCMetadata(
          userId,
          params.collectionMetadata.stream_conditions
        )
      }

      for (const track of params.tracks) {
        track.metadata = combineMetadata(
          userId,
          track.metadata,
          params.collectionMetadata,
          albumTrackPrice
        )
      }

      const publishedTracks = await publishTracks(
        {
          ...context,
          kind: params.collectionMetadata.is_album ? 'album' : 'playlist'
        },
        params.tracks
      )

      const { artwork } = params.collectionMetadata
      const artworkBlob =
        artwork && 'file' in artwork ? (artwork?.file ?? null) : null
      const coverArtFile = artworkBlob
        ? fileToSdk(artworkBlob, 'cover_art')
        : undefined
      if (params.collectionMetadata.is_album) {
        const metadata = albumMetadataForCreateWithSDK(
          params.collectionMetadata
        )
        metadata.playlistContents = publishedTracks
          .filter((t) => !!t.trackId)
          .map((t) => ({
            timestamp: Math.round(Date.now() / 1000),
            trackId: t.trackId!,
            metadataTimestamp: Math.round(Date.now() / 1000)
          }))
        return await sdk.albums.createAlbum({
          userId: Id.parse(userId),
          imageFile: coverArtFile,
          metadata
        })
      } else {
        const metadata = playlistMetadataForCreateWithSDK(
          params.collectionMetadata
        )
        metadata.playlistContents = publishedTracks
          .filter((t) => !!t.trackId)
          .map((t) => ({
            timestamp: Math.round(Date.now() / 1000),
            trackId: t.trackId!,
            metadataTimestamp: Math.round(Date.now() / 1000)
          }))
        return await sdk.playlists.createPlaylist({
          userId: Id.parse(userId),
          imageFile: coverArtFile,
          metadata
        })
      }
    }
  })

export const usePublishCollection = (
  options?: Partial<ReturnType<typeof getPublishCollectionOptions>>
) => {
  const { audiusSdk, analytics } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: account = null } = useCurrentAccount()
  const { data: accountUser } = useCurrentAccountUser()
  const userId = account?.userId ?? undefined

  return useMutation({
    ...options,
    ...getPublishCollectionOptions({
      audiusSdk,
      userId: userId!,
      dispatch,
      analytics
    }),

    onSuccess: async (playlist) => {
      if (!playlist.playlistId) return
      const sdk = await audiusSdk()

      const batchGetCollections = getCollectionsBatcher({
        sdk,
        currentUserId: userId,
        queryClient,
        dispatch
      })
      const collection = await batchGetCollections.fetch(
        HashId.parse(playlist.playlistId)
      )

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

      const previousLibrary = account?.playlistLibrary ?? { contents: [] }
      await updatePlaylistLibrary(
        sdk,
        userId,
        {
          ...previousLibrary,
          contents: [
            ...previousLibrary.contents,
            { playlist_id: collection.playlist_id, type: 'playlist' as const }
          ]
        },
        queryClient,
        dispatch
      )

      dispatch(
        libraryPageActions.addLocalCollection({
          collectionId: collection.playlist_id,
          isAlbum: collection.is_album,
          category: LibraryCategory.Favorite
        })
      )

      queryClient.invalidateQueries({
        queryKey: getUserQueryKey(userId)
      })

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.profileTracks, accountUser?.handle]
      })
    }
  })
}

function combineMetadata(
  userId: number,
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
    metadata.tags = collectionMetadata.trackDetails?.tags
  }

  metadata.is_downloadable = !!collectionMetadata.is_downloadable

  metadata.is_playlist_upload = true
  metadata.is_unlisted = !!collectionMetadata.is_private
  if (collectionMetadata.is_private && collectionMetadata.field_visibility) {
    const booleanFieldVisibility = mapValues(
      collectionMetadata.field_visibility,
      Boolean
    ) as FieldVisibility
    metadata.field_visibility = booleanFieldVisibility
  }

  if (albumTrackPrice !== undefined && albumTrackPrice > 0) {
    metadata.is_download_gated = true
    metadata.download_conditions = {
      usdc_purchase: {
        price: albumTrackPrice,
        splits: []
      }
    }
    metadata.is_stream_gated = true
    metadata.preview_start_seconds = 0
    metadata.stream_conditions = {
      usdc_purchase: { price: albumTrackPrice, splits: [] }
    }
    addPremiumMetadata(userId, metadata)
  }
  return metadata
}
