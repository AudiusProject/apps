import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

export const getArtistCoinMembersCountQueryKey = (
  mint: string | null | undefined
) => [QUERY_KEYS.artistCoinMembersCount, mint] as unknown as QueryKey<number>

export const useArtistCoinMembersCount = (
  { mint }: { mint: string | null | undefined },
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getArtistCoinMembersCountQueryKey(mint),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!mint) return 0

      const membersCountResponse = await sdk.coins.getCoinMembersCount({ mint })

      return membersCountResponse?.data
    },
    ...options,
    enabled: options?.enabled !== false && !!mint
  })
}
