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

/**
 * Returns the list of playlists in the user's library that have new content
 * since they last viewed the playlist. Polls every minute and on window focus.
 *
 * Replaces the legacy `playlistUpdates` redux slice + `playlistUpdatesSagas` +
 * `playlistUpdatesPollingDaemon`.
 */
export const usePlaylistUpdates = <TResult = PlaylistUpdate[]>(
  options?: SelectableQueryOptions<PlaylistUpdate[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getPlaylistUpdatesQueryKey(currentUserId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      // sdk.notifications.getPlaylistUpdates is not currently typed in the
      // public SDK surface; cast to the expected shape used in the legacy saga.
      // userId carries the requester id as `?user_id=` so the backend can
      // personalize related.users in the response.
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
    enabled: !!currentUserId,
    refetchInterval: PLAYLIST_UPDATES_POLLING_FREQ_MS,
    refetchOnWindowFocus: true,
    ...options
  })
}

/**
 * Returns whether the given playlist has unviewed updates. Backed by
 * `usePlaylistUpdates` with a `select` so consumers only re-render when the
 * boolean flips.
 */
export const usePlaylistHasUpdate = (playlistId: ID) =>
  usePlaylistUpdates({
    select: (updates) => updates.some((u) => u.playlist_id === playlistId)
  })

/**
 * Returns the IDs of every playlist in the user's library with unviewed updates.
 */
export const useAllPlaylistUpdateIds = () =>
  usePlaylistUpdates({
    select: (updates) => updates.map((u) => u.playlist_id)
  })

/**
 * Returns the count of playlists with unviewed updates.
 */
export const usePlaylistUpdatesCount = () =>
  usePlaylistUpdates({
    select: (updates) => updates.length
  })
