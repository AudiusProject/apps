import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
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
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

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
    onMutate: async ({ collectionId }): Promise<MutationContext> => {
      if (!currentUserId) {
        throw new Error('User ID is required')
      }

      await queryClient.cancelQueries({
        queryKey: getCollectionQueryKey(collectionId)
      })

      const previousCollection = queryClient.getQueryData(
        getCollectionQueryKey(collectionId)
      )
      if (!previousCollection) throw new Error('Collection not found')

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

      dispatch(accountActions.removeAccountPlaylist({ collectionId }))

      return { previousCollection }
    },
    onError: (error, _args, context?: MutationContext) => {
      if (context?.previousCollection) {
        const collection = context.previousCollection

        primeCollectionData({
          collections: [collection],
          queryClient,
          forceReplace: true
        })
      }

      console.error(error)
    },
    onSuccess: async (_, { collectionId }) => {
      queryClient.invalidateQueries({
        queryKey: getCollectionQueryKey(collectionId)
      })

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.libraryCollections
      })
    }
  })
}
