import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { accountActions } from '~/store'

import { QUERY_KEYS } from '../queryKeys'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCollectionData } from '../utils/primeCollectionData'

import { getCollectionQueryKey } from './useCollection'

type DeleteCollectionArgs = {
  collectionId: ID
  source?: string
}

type MutationContext = {
  previousCollection: any | undefined
}

export const useDeleteCollection = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const {
    analytics: { track: trackEvent }
  } = useAppContext()

  return useMutation({
    mutationFn: async ({ collectionId }: DeleteCollectionArgs) => {
      if (!currentUserId) throw new Error('User ID is required')
      const sdk = await audiusSdk()

      await sdk.playlists.deletePlaylist({
        playlistId: Id.parse(collectionId),
        userId: Id.parse(currentUserId)
      })

      return { collectionId }
    },
    onMutate: async ({ collectionId, source }): Promise<MutationContext> => {
      if (!currentUserId) {
        throw new Error('User ID is required')
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getCollectionQueryKey(collectionId)
      })

      // Snapshot the previous values
      const previousCollection = queryClient.getQueryData(
        getCollectionQueryKey(collectionId)
      )
      if (!previousCollection) throw new Error('Collection not found')

      // Analytics tracking
      trackEvent({
        eventName: Name.DELETE,
        properties: {
          kind: previousCollection.is_album ? 'album' : 'playlist',
          id: collectionId,
          source
        }
      })

      // Optimistic updates - mark as deleted in cache
      primeCollectionData({
        collections: [
          {
            ...previousCollection,
            is_delete: true
          } as any
        ],
        queryClient,
        forceReplace: true
      })

      // Remove from account playlists
      dispatch(accountActions.removeAccountPlaylist({ collectionId }))

      return { previousCollection }
    },
    onError: (error, { collectionId }, context?: MutationContext) => {
      // Roll back optimistic updates if the mutation fails
      if (context?.previousCollection) {
        const collection = context.previousCollection

        // Restore collection data
        primeCollectionData({
          collections: [collection],
          queryClient,
          forceReplace: true
        })
      }

      reportToSentry({
        error,
        additionalInfo: {
          collectionId
        },
        feature: Feature.Edit,
        name: 'Delete Collection'
      })
    },
    onSuccess: async (_, { collectionId }) => {
      // Invalidate and refetch collection queries to ensure cache consistency
      queryClient.invalidateQueries({
        queryKey: getCollectionQueryKey(collectionId)
      })

      // Invalidate library collections to remove from user's library
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.libraryCollections
      })
    }
  })
}
