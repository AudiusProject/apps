import { OptionalId, EntityType } from '@audius/sdk/services'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { repostActivityFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext, primeUserData } from '~/api/tan-query/utils'
import { UserTrackMetadata, UserCollectionMetadata } from '~/models'
import { PlaybackSource } from '~/models/Analytics'
import {
  profilePageSelectors,
  profilePageFeedLineupActions as feedActions
} from '~/store/pages'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, LineupData, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

const DEFAULT_PAGE_SIZE = 10

type UseProfileRepostsArgs = {
  handle: string
  pageSize?: number
}

export const getProfileRepostsQueryKey = ({
  handle,
  pageSize
}: UseProfileRepostsArgs) =>
  [QUERY_KEYS.profileReposts, handle, { pageSize }] as unknown as QueryKey<
    InfiniteData<(UserTrackMetadata | UserCollectionMetadata)[]>
  >

export const useProfileReposts = (
  { handle, pageSize = DEFAULT_PAGE_SIZE }: UseProfileRepostsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getProfileRepostsQueryKey({ handle, pageSize }),
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
      const { data: repostsSDKData } = await sdk.users.getRepostsByHandle({
        handle: handleNoAt,
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam
      })

      if (!repostsSDKData) return []

      // Transform the reposts data and get just the items
      const reposts = transformAndCleanList(
        repostsSDKData,
        (activity) => repostActivityFromSDK(activity)?.item
      )

      primeUserData({
        users: reposts
          .filter((item): item is UserTrackMetadata => 'track_id' in item)
          .map((item) => item.user),
        queryClient
      })
      primeTrackData({
        tracks: reposts.filter(
          (item): item is UserTrackMetadata => 'track_id' in item
        ),
        queryClient
      })
      primeCollectionData({
        collections: reposts.filter(
          (item): item is UserCollectionMetadata => 'playlist_id' in item
        ),
        queryClient
      })

      // Update lineup when new data arrives
      dispatch(
        feedActions.fetchLineupMetadatas(pageParam, pageSize, false, {
          items: reposts
        })
      )

      // Return only ids
      return reposts.map((t) =>
        'track_id' in t
          ? { id: t.track_id, type: EntityType.TRACK }
          : { id: t.playlist_id, type: EntityType.PLAYLIST }
      )
    },
    select: (data) => {
      return data?.pages?.flat()
    },
    ...options,
    enabled: options?.enabled !== false && !!handle
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getProfileRepostsQueryKey({
      handle,
      pageSize
    }),
    lineupActions: feedActions,
    lineupSelector: profilePageSelectors.getProfileFeedLineup,
    playbackSource: PlaybackSource.TRACK_TILE,
    pageSize
  })
}
