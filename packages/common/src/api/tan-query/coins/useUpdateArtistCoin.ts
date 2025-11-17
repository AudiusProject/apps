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
  bannerImageFile?: File | null
  removeBanner?: boolean
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

      let bannerImageUrl: string | undefined

      if (updateCoinRequest.bannerImageFile) {
        const uploadResponse = await sdk.services.storage.uploadFile({
          file: updateCoinRequest.bannerImageFile,
          template: 'img_backdrop'
        })
        const rawUrl = getBannerImageUrl(uploadResponse.results)
        if (!rawUrl) {
          throw new Error('Failed to process banner image upload')
        }

        // Check if rawUrl is already a full URL (starts with http:// or https://)
        // If not, it's likely a CID and we need to convert it to a content node URL
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          // Already a full URL, validate and use it
          try {
            const url = new URL(rawUrl)
            bannerImageUrl = url.toString()
          } catch (error) {
            throw new Error(
              `Invalid banner image URL format: ${rawUrl}. URL must be absolute with scheme and host.`
            )
          }
        } else {
          // It's a CID, convert to content node URL
          // Get a content node endpoint from the storage service
          const contentNodeEndpoint = await (
            sdk.services.storage as any
          ).storageNodeSelector?.getSelectedNode()

          if (!contentNodeEndpoint) {
            throw new Error(
              'No content node available to construct banner image URL'
            )
          }

          // Construct the URL: content nodes serve images at /content/{cid}
          bannerImageUrl = `${contentNodeEndpoint}/content/${rawUrl}`
        }
      } else if (updateCoinRequest.removeBanner) {
        bannerImageUrl = ''
      }

      const response = await sdk.coins.updateCoin({
        mint,
        userId: Id.parse(currentUserId),
        updateCoinRequest: {
          description: updateCoinRequest.description,
          link1: updateCoinRequest.links?.[0] ?? '',
          link2: updateCoinRequest.links?.[1] ?? '',
          link3: updateCoinRequest.links?.[2] ?? '',
          link4: updateCoinRequest.links?.[3] ?? '',
          ...(bannerImageUrl !== undefined ? { bannerImageUrl } : {})
        }
      })

      return { response, bannerImageUrl }
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

const getBannerImageUrl = (results: Record<string, string> = {}) => {
  const prioritizedSizes = ['2000x', '1500x', '1280x', '1000x', '640x']
  for (const size of prioritizedSizes) {
    if (results[size]) {
      return results[size]
    }
  }
  const firstResult = Object.values(results)[0]
  return firstResult
}
