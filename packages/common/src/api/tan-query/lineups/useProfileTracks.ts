import { EntityType, OptionalId } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { PlaybackSource } from '~/models/Analytics'
import {
  profilePageSelectors,
  profilePageTracksLineupActions
} from '~/store/pages'
import { TracksSortMode } from '~/store/pages/profile/types'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

const DEFAULT_PAGE_SIZE = 10

type UseProfileTracksArgs = {
  handle: string
  pageSize?: number
  sort?: TracksSortMode
  getUnlisted?: boolean
}

export const getProfileTracksQueryKey = ({
  handle,
  pageSize,
  sort,
  getUnlisted
}: UseProfileTracksArgs) =>
  [
    QUERY_KEYS.profileTracks,
    handle,
    { pageSize, sort, getUnlisted }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const useProfileTracks = (
  {
    handle,
    pageSize = DEFAULT_PAGE_SIZE,
    sort = TracksSortMode.RECENT,
    getUnlisted = true
  }: UseProfileTracksArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getProfileTracksQueryKey({ handle, pageSize, sort, getUnlisted }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      if (!handle) return []
      // If the @ is still at the beginning of the handle, trim it off
      const handleNoAt = handle.startsWith('@') ? handle.substring(1) : handle
      const { data: tracks } = await sdk.full.users.getTracksByUserHandle({
        handle: handleNoAt,
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam,
        sort: sort === TracksSortMode.POPULAR ? 'plays' : 'date',
        filterTracks: getUnlisted ? 'all' : 'public'
      })

      if (!tracks) return []

      const processedTracks = transformAndCleanList(
        tracks,
        userTrackMetadataFromSDK
      )
      primeTrackData({ tracks: processedTracks, queryClient })

      // Update lineup when new data arrives
      dispatch(
        profilePageTracksLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { items: processedTracks, handle }
        )
      )

      return processedTracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => data?.pages.flat(),
    ...options,
    enabled: options?.enabled !== false && !!handle
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getProfileTracksQueryKey({
      handle,
      pageSize,
      sort,
      getUnlisted
    }),
    lineupActions: profilePageTracksLineupActions,
    lineupSelector: profilePageSelectors.getProfileTracksLineup,
    playbackSource: PlaybackSource.TRACK_TILE,
    pageSize
  })
}
