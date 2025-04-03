import { HashId, Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models'

import { QUERY_KEYS } from './queryKeys'
import { QueryKey, SelectableQueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'

export type UseRemixedTracksArgs = {
  userId: ID | null | undefined
}

export type RemixedTrack = {
  trackId: number
  title: string
  remixCount: number
}

export const getRemixedTracksQueryKey = ({ userId }: UseRemixedTracksArgs) => {
  return [QUERY_KEYS.remixedTracks, userId] as unknown as QueryKey<
    RemixedTrack[]
  >
}

export const useRemixedTracks = <TResult = RemixedTrack[]>(
  options?: SelectableQueryOptions<RemixedTrack[], TResult>
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getRemixedTracksQueryKey({ userId: currentUserId }),
    queryFn: async () => {
      if (!currentUserId) return []
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getUserTracksRemixed({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId)
      })

      return data.map((item) => ({
        ...item,
        trackId: HashId.parse(item.trackId)
      }))
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
