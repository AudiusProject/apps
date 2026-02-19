import { USDC } from '@audius/fixed-decimal'
import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isEqual } from 'lodash'
import { useDispatch } from 'react-redux'

import { playlistMetadataForUpdateWithSDK } from '~/adapters/collection'
import { fileToSdk } from '~/adapters/track'
import {
  getCollectionQueryKey,
  getTrackQueryKey,
  useCurrentAccountUser,
  useCurrentUserId
} from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { isContentUSDCPurchaseGated } from '~/models'
import { Collection } from '~/models/Collection'
import { ID } from '~/models/Identifiers'
import { renameAccountPlaylist } from '~/store/account/slice'
import { EditCollectionValues } from '~/store/cache/collections/types'
import { removeNullable } from '~/utils'
import { updatePlaylistArtwork } from '~/utils/updatePlaylistArtwork'

import { TQCollection } from '../models'
import { primeCollectionData } from '../utils/primeCollectionData'

type MutationContext = {
  previousCollection: TQCollection | undefined
  collectionUpdate: EditCollectionValues
}

type UpdateCollectionParams = {
  collectionId: ID
  metadata: EditCollectionValues
}

export const useUpdateCollection = () => {
  const {
    audiusSdk,
    imageUtils: { generatePlaylistArtwork }
  } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: account } = useCurrentAccountUser({
    select: (user) => ({
      erc_wallet: user?.erc_wallet,
      wallet: user?.wallet
    })
  })
  const { erc_wallet, wallet } = account ?? {}
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ collectionId, metadata }: UpdateCollectionParams) => {
      const sdk = await audiusSdk()

      if (!collectionId || !currentUserId) throw new Error('Invalid ID')

      const collectionUpdate = (await updatePlaylistArtwork(
        metadata,
        [],
        { updated: metadata.tracks },
        { generateImage: generatePlaylistArtwork }
      )) as EditCollectionValues

      const coverArtFile =
        collectionUpdate?.artwork?.url && 'file' in collectionUpdate.artwork
          ? (collectionUpdate.artwork.file as File)
          : undefined

      // Handle account collection shortcut update
      if (collectionUpdate?.playlist_name) {
        dispatch(
          renameAccountPlaylist({
            collectionId,
            name: collectionUpdate.playlist_name
          })
        )
      }

      // Handle premium metadata for albums
      if (
        collectionUpdate.is_album &&
        isContentUSDCPurchaseGated(collectionUpdate.stream_conditions)
      ) {
        const priceCents = Number(
          collectionUpdate.stream_conditions.usdc_purchase.price
        )
        const priceWei = Number(USDC(priceCents / 100).value.toString())

        const walletToUse = erc_wallet ?? wallet
        if (!walletToUse) {
          throw new Error('No wallet found for user')
        }

        // Get the user's USDC bank address from the wallet
        const { userBank } =
          await sdk.services.claimableTokensClient.getOrCreateUserBank({
            ethWallet: walletToUse,
            mint: 'USDC'
          })
        const userBankStr = userBank.toString()

        // Update the stream conditions with the price and splits
        collectionUpdate.stream_conditions = {
          usdc_purchase: {
            price: priceCents,
            splits: {
              [userBankStr]: priceWei
            }
          }
        }
      }

      const sdkMetadata = playlistMetadataForUpdateWithSDK(
        collectionUpdate as Collection
      )

      const response = await sdk.playlists.updatePlaylist({
        imageFile: coverArtFile
          ? fileToSdk(coverArtFile, 'cover_art')
          : undefined,
        playlistId: Id.parse(collectionId),
        userId: Id.parse(currentUserId),
        metadata: sdkMetadata
      })

      // feature-tan-query TODO: Track publishing when making private collections public

      return response
    },
    onMutate: async ({
      collectionId,
      metadata
    }: UpdateCollectionParams): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getCollectionQueryKey(collectionId)
      })

      // Snapshot the previous values
      const previousCollection = queryClient.getQueryData(
        getCollectionQueryKey(collectionId)
      )

      const previousTracks =
        previousCollection?.trackIds
          .map((trackId) => queryClient.getQueryData(getTrackQueryKey(trackId)))
          .filter(removeNullable) ?? []

      // Optimistically update collection
      const mergedCollection = { ...previousCollection, ...metadata }
      const collectionUpdate = (await updatePlaylistArtwork(
        mergedCollection,
        previousTracks,
        { updated: mergedCollection.tracks },
        { generateImage: generatePlaylistArtwork }
      )) as EditCollectionValues

      if (previousCollection) {
        primeCollectionData({
          collections: [{ ...previousCollection, ...metadata }],
          queryClient,
          forceReplace: true
        })

        const previousTrackIds = previousTracks.map((track) => track.track_id)
        const updatedTrackIds = collectionUpdate.tracks?.map(
          (track) => track.track_id
        )
        if (!isEqual(previousTrackIds, updatedTrackIds)) {
          // feature-tan-query TODO: reset lineup on tracks changed
        }
      }

      // Return context with the previous collection
      return { previousCollection, collectionUpdate }
    },
    onError: (_err, _, context?: MutationContext) => {
      // If the mutation fails, roll back collection data
      if (context?.previousCollection) {
        primeCollectionData({
          collections: [context.previousCollection],
          queryClient,
          forceReplace: true
        })
      }
    },
    onSettled: (_, __, { collectionId }) => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] })
    }
  })
}
