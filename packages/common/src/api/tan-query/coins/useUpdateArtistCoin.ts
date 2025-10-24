import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Coin } from '~/adapters/coin'
import { useCurrentUserId } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'

import { QUERY_KEYS } from '../queryKeys'

import { getArtistCoinQueryKey } from './useArtistCoin'

type UpdateCoinRequest = {
  description?: string
  links?: string[]
}

type UpdateArtistCoinParams = {
  mint: string
  updateCoinRequest: UpdateCoinRequest
}

type MutationContext = {
  previousCoin: Coin | undefined
}

export const useUpdateArtistCoin = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ mint, updateCoinRequest }: UpdateArtistCoinParams) => {
      const sdk = await audiusSdk()

      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const response = await sdk.coins.updateCoin({
        mint,
        userId: Id.parse(currentUserId),
        updateCoinRequest: {
          description: updateCoinRequest.description,
          link1: updateCoinRequest.links?.[0] ?? '',
          link2: updateCoinRequest.links?.[1] ?? '',
          link3: updateCoinRequest.links?.[2] ?? '',
          link4: updateCoinRequest.links?.[3] ?? ''
        }
      })

      return response
    },
    onMutate: async ({
      mint,
      updateCoinRequest
    }: UpdateArtistCoinParams): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getArtistCoinQueryKey(mint)
      })

      // Snapshot the previous coin
      const previousCoin = queryClient.getQueryData(getArtistCoinQueryKey(mint))

      // Optimistically update the coin
      if (previousCoin) {
        const coinData = previousCoin
        const optimisticCoin = {
          ...previousCoin,
          description: updateCoinRequest.description ?? coinData.description,
          link1: updateCoinRequest.links?.[0] ?? undefined,
          link2: updateCoinRequest.links?.[1] ?? undefined,
          link3: updateCoinRequest.links?.[2] ?? undefined,
          link4: updateCoinRequest.links?.[3] ?? undefined
        }

        queryClient.setQueryData(getArtistCoinQueryKey(mint), optimisticCoin)
      }

      return { previousCoin }
    },
    onError: (_err, { mint }, context?: MutationContext) => {
      // If the mutation fails, roll back coin data
      if (context?.previousCoin) {
        queryClient.setQueryData(
          getArtistCoinQueryKey(mint),
          context.previousCoin
        )
      }
    },
    onSettled: (_, __, { mint }) => {
      // Always refetch after error or success to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: getArtistCoinQueryKey(mint) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.coinByTicker] })
    }
  })
}
