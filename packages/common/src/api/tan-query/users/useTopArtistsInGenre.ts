import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { pick } from 'lodash'

import { userMetadataFromSDK } from '~/adapters'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { primeUserData } from '../utils/primeUserData'

import { useUsers } from './useUsers'

const ARTISTS_PER_GENRE_PAGE_SIZE = 15

type UseTopArtistsInGenreArgs = {
  genre: string
  pageSize?: number
}

export const getTopArtistsInGenreQueryKey = (genre: string, pageSize: number) =>
  [QUERY_KEYS.topArtistsInGenre, genre, pageSize] as unknown as QueryKey<
    InfiniteData<ID[]>
  >

export const useTopArtistsInGenre = (
  args: UseTopArtistsInGenreArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { genre, pageSize = ARTISTS_PER_GENRE_PAGE_SIZE } = args

  const simpleOptions = pick(options, [
    'enabled',
    'staleTime',
    'placeholderData'
  ]) as QueryOptions

  const { data: userIds } = useInfiniteQuery({
    queryKey: getTopArtistsInGenreQueryKey(genre, pageSize),
    initialPageParam: 0,
    getNextPageParam: (lastPage: number[], allPages: number[][]) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getTopUsersInGenre({
        genre: [genre],
        limit: pageSize,
        offset: (pageParam as number) * pageSize
      })
      const users = transformAndCleanList(data, userMetadataFromSDK)
      primeUserData({ users, queryClient })
      return users.map((user) => user.user_id)
    },
    select: (data) => data.pages.flat(),
    ...simpleOptions,
    enabled: simpleOptions?.enabled !== false && !!genre
  })

  return useUsers(userIds)
}
