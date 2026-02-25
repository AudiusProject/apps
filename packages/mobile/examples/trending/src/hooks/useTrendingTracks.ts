import { useQuery } from '@tanstack/react-query'
import { getSDK } from '../sdk'

/**
 * Fetches trending tracks from Audius using the SDK.
 * Uses React Query for caching and request state.
 *
 * SDK usage: getSDK() returns the singleton; sdk.tracks.getTrendingTracks()
 * is the main read API for trending (see packages/sdk TracksApi).
 */
export function useTrendingTracks() {
  const audiusSdk = getSDK()

  return useQuery({
    queryKey: ['trending-tracks'],
    queryFn: async () => {
      const response = await audiusSdk.tracks.getTrendingTracks({
        limit: 20,
        offset: 0,
        time: 'week',
      })
      return response.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}
