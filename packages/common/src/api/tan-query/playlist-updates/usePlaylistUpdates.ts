import { Id, type PlaylistUpdatesResponse } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { playlistUpdateFromSDK, transformAndCleanList } from '~/adapters'
import { ID } from '~/models/Identifiers'
import { PlaylistUpdate } from '~/models/PlaylistLibrary'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext } from '../utils'

export const PLAYLIST_UPDATES_POLLING_FREQ_MS = 60_000

export const getPlaylistUpdatesQueryKey = (
  currentUserId: ID | null | undefined
) =>
  [QUERY_KEYS.playlistUpdates, currentUserId] as unknown as QueryKey<
    PlaylistUpdate[]
  >

export const usePlaylistUpdates = <TResult = PlaylistUpdate[]>(
  options?: SelectableQueryOptions<PlaylistUpdate[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getPlaylistUpdatesQueryKey(currentUserId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const response = (await (
        sdk.notifications as {
          getPlaylistUpdates: (params: {
            id: string
            userId?: string
          }) => Promise<PlaylistUpdatesResponse>
        }
      ).getPlaylistUpdates({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId)
      })) as PlaylistUpdatesResponse | undefined

      return transformAndCleanList(
        response?.data?.playlistUpdates ?? [],
        playlistUpdateFromSDK
      )
    },
    refetchInterval: PLAYLIST_UPDATES_POLLING_FREQ_MS,
    refetchOnWindowFocus: true,
    ...options,
    enabled: !!currentUserId && options?.enabled !== false
  })
}

export const usePlaylistHasUpdate = (playlistId: ID) =>
  usePlaylistUpdates({
    select: (updates) => updates.some((u) => u.playlist_id === playlistId)
  })

export const useAllPlaylistUpdateIds = () =>
  usePlaylistUpdates({
    select: (updates) => updates.map((u) => u.playlist_id)
  })
