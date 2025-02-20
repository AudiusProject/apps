import { Id, OptionalId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'
import { useUsers } from './useUsers'
import { primeUserData } from './utils/primeUserData'

const DEFAULT_PAGE_SIZE = 20

export type UseCollectionRepostsArgs = {
  collectionId: ID | null | undefined
  pageSize?: number
}

export const getCollectionRepostsQueryKey = ({
  collectionId,
  pageSize
}: UseCollectionRepostsArgs) => [QUERY_KEYS.reposts, collectionId, { pageSize }]

export const useCollectionReposts = (
  { collectionId, pageSize = DEFAULT_PAGE_SIZE }: UseCollectionRepostsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const { data: userIds, ...queryResult } = useInfiniteQuery({
    queryKey: getCollectionRepostsQueryKey({ collectionId, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.playlists.getUsersFromPlaylistReposts({
        playlistId: Id.parse(collectionId),
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId)
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient, dispatch })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!collectionId
  })

  const { data: users } = useUsers(userIds)

  return {
    data: users,
    ...queryResult
  }
}
