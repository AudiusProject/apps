import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { SearchResults, searchResultsFromSDK } from '~/adapters/search'
import { useQueryContext } from '~/api/tan-query/utils'
import { useFeatureFlag } from '~/hooks/useFeatureFlag'
import { ID } from '~/models'
import { FeatureFlags } from '~/services/remote-config'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

const DEFAULT_LIMIT = 3

type UseSearchAutocompleteArgs = {
  query: string
  limit?: number
}

export const getSearchAutocompleteQueryKey = (
  currentUserId: ID | null | undefined,
  { query, limit = DEFAULT_LIMIT }: UseSearchAutocompleteArgs
) =>
  [
    QUERY_KEYS.search,
    currentUserId,
    query,
    { limit }
  ] as unknown as QueryKey<SearchResults>

export const useSearchAutocomplete = (
  { query, limit = DEFAULT_LIMIT }: UseSearchAutocompleteArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const { isEnabled: isUSDCEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getSearchAutocompleteQueryKey(currentUserId, { query, limit }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data } = await sdk.full.search.searchAutocomplete({
        userId: OptionalId.parse(currentUserId),
        query,
        limit,
        includePurchaseable: isUSDCEnabled
      })
      return searchResultsFromSDK(data, queryClient)
    },
    placeholderData: (prev) => (query === '' ? undefined : prev),
    ...options,
    enabled: options?.enabled !== false && query.length > 0
  })
}
