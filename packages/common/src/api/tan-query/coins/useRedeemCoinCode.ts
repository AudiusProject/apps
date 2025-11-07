import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Feature } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext } from '../utils/QueryContext'

import { getArtistCoinQueryKey } from './useArtistCoin'

type RedeemCoinCodeParams = {
  mint: string
  code: string
}

export const useRedeemCoinCode = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ mint, code }: RedeemCoinCodeParams) => {
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const sdk = await audiusSdk()
      const response = await sdk.coins.claimCoinRewardCode({
        mint,
        userId: Id.parse(currentUserId),
        code
      })

      return response
    },
    onSettled: (_, __, { mint }) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoin]
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoins]
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.artistCoinMembers, mint]
      })
      queryClient.invalidateQueries({
        queryKey: getArtistCoinQueryKey(mint)
      })
    },
    onError: (error: Error, args, _context) => {
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'RedeemCoinCode',
        feature: Feature.ArtistCoins
      })

      // TODO: Should 'Please try again' be added to the end of the message?
      // Toast generic error message
      toast({
        content: 'There was an error redeeming the coin code'
      })
    }
  })
}
