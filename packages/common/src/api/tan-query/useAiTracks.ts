import { useEffect } from 'react'

import { OptionalId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useAudiusQueryContext } from '~/audius-query'
import { UserTrack } from '~/models'
import { PlaybackSource } from '~/models/Analytics'
import { aiPageLineupActions, aiPageSelectors } from '~/store/pages'
import { fetchAiUser } from '~/store/pages/ai/slice'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'
import { primeTrackData } from './utils/primeTrackData'
import { useLineupQuery } from './utils/useLineupQuery'

const DEFAULT_PAGE_SIZE = 10

type UseAiTracksArgs = {
  handle: string
  pageSize?: number
}

export const getAiTracksQueryKey = ({
  handle,
  pageSize = DEFAULT_PAGE_SIZE
}: UseAiTracksArgs) => [QUERY_KEYS.aiTracks, handle, { pageSize }]

export const useAiTracks = (
  { handle, pageSize = DEFAULT_PAGE_SIZE }: UseAiTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchAiUser({ handle }))
  }, [dispatch, handle])

  const queryData = useInfiniteQuery({
    queryKey: getAiTracksQueryKey({ handle, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: UserTrack[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()

      const { data: tracks } =
        await sdk.full.users.getAIAttributedTracksByUserHandle({
          handle,
          userId: OptionalId.parse(currentUserId),
          limit: pageSize,
          offset: pageParam,
          filterTracks: 'public',
          sort: 'date'
        })

      if (!tracks) return []

      const processedTracks = transformAndCleanList(
        tracks,
        userTrackMetadataFromSDK
      )
      primeTrackData({ tracks: processedTracks, queryClient, dispatch })

      // Update lineup when new data arrives
      dispatch(
        aiPageLineupActions.fetchLineupMetadatas(pageParam, pageSize, false, {
          tracks: processedTracks
        })
      )

      return processedTracks
    },
    ...(options as any),
    enabled: options?.enabled !== false && !!handle
  })

  const lineupData = useLineupQuery({
    queryData,
    lineupActions: aiPageLineupActions,
    lineupSelector: aiPageSelectors.getLineup,
    playbackSource: PlaybackSource.TRACK_TILE
  })

  return {
    ...queryData,
    ...lineupData,
    pageSize
  }
}
