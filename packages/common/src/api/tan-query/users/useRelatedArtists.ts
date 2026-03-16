import { Id, OptionalId } from '@audius/sdk/services'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'
import { useUsers } from './useUsers'
const DEFAULT_PAGE_SIZE = 20

export type UseRelatedArtistsArgs = {
  artistId: ID | null | undefined
  pageSize?: number
  filterFollowed?: boolean
}

export const getRelatedArtistsQueryKey = ({
  artistId,
  pageSize = DEFAULT_PAGE_SIZE,
  filterFollowed
}: UseRelatedArtistsArgs) =>
  [
    QUERY_KEYS.relatedArtists,
    artistId,
    { pageSize, filterFollowed }
  ] as unknown as QueryKey<InfiniteData<ID[]>>

export const useRelatedArtists = (
  {
    artistId,
    pageSize = DEFAULT_PAGE_SIZE,
    filterFollowed
  }: UseRelatedArtistsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  return useInfiniteQuery({
    queryKey: getRelatedArtistsQueryKey({ artistId, pageSize, filterFollowed }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getRelatedUsers({
        id: Id.parse(artistId),
        limit: pageSize,
        offset: pageParam,
        userId: OptionalId.parse(currentUserId),
        filterFollowed
      })
      const users = userMetadataListFromSDK(data)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!artistId
  })
}

export const useRelatedArtistsUsers = (
  args: UseRelatedArtistsArgs,
  options?: QueryOptions
) => {
  const { data: userIds } = useRelatedArtists(args, options)
  return useUsers(userIds)
}
