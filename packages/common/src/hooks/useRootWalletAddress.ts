import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '~/api/tan-query/queryKeys'
import { QueryKey } from '~/api/tan-query/types'
import { useQueryContext } from '~/api/tan-query/utils'

export const getRootWalletAddressQueryKey = () =>
  [QUERY_KEYS.rootWalletAddress] as unknown as QueryKey<string | null>

export const useRootWalletAddress = () => {
  const { solanaWalletService } = useQueryContext()

  const {
    data: rootWalletAddress,
    isLoading,
    error
  } = useQuery({
    queryKey: getRootWalletAddressQueryKey(),
    queryFn: async () => {
      const keypair = await solanaWalletService.getKeypair()
      return keypair?.publicKey.toString() ?? null
    }
  })

  return {
    rootWalletAddress,
    loading: isLoading,
    error
  }
}
