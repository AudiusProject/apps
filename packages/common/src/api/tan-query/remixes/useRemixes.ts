import {
  GetTrackRemixesSortMethodEnum,
  Id,
  OptionalId,
  EntityType
} from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { remixesPageActions } from '~/store/pages'

import { QUERY_KEYS } from '../queryKeys'
import { getTrackQueryKey } from '../tracks/useTrack'
import { LineupData, QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { getUserQueryKey } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

export type UseRemixesArgs = {
  trackId: number | null | undefined
  includeOriginal?: boolean
  includeWinners?: boolean
  pageSize?: number
  sortMethod?: GetTrackRemixesSortMethodEnum
  isCosign?: boolean
  isContestEntry?: boolean
}

export type UseRemixesCountArgs = {
  trackId: number | null | undefined
  isCosign?: boolean
  isContestEntry?: boolean
}

export const getRemixesQueryKey = ({
  trackId,
  includeOriginal = false,
  includeWinners = false,
  pageSize = DEFAULT_PAGE_SIZE,
  sortMethod = 'recent',
  isCosign = false,
  isContestEntry = false
}: UseRemixesArgs) =>
  [
    QUERY_KEYS.remixes,
    trackId,
    {
      pageSize,
      includeOriginal,
      includeWinners,
      sortMethod,
      isCosign,
      isContestEntry
    }
  ] as unknown as QueryKey<InfiniteData<LineupData[]>>

export const getRemixesCountQueryKey = ({
  trackId,
  isCosign = false,
  isContestEntry = false
}: UseRemixesCountArgs) =>
  [
    QUERY_KEYS.remixesCount,
    trackId,
    { isCosign, isContestEntry }
  ] as unknown as QueryKey<number>

export const useRemixes = (
  {
    trackId,
    includeOriginal = false,
    includeWinners = false,
    pageSize = DEFAULT_PAGE_SIZE,
    sortMethod = 'recent',
    isCosign = false,
    isContestEntry = false
  }: UseRemixesArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryData = useInfiniteQuery({
    queryKey: getRemixesQueryKey({
      trackId,
      pageSize,
      includeOriginal,
      includeWinners,
      sortMethod,
      isCosign,
      isContestEntry
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      // First page may have the original prepended; subtract it before
      // comparing to pageSize so a full page of `pageSize` actual remixes
      // doesn't false-stop pagination.
      const isFirstPage = allPages.length === 1
      const remixesOnLastPage =
        lastPage.length - (isFirstPage && includeOriginal ? 1 : 0)
      if (remixesOnLastPage < pageSize) return undefined
      return (
        allPages.reduce((acc, page) => acc + page.length, 0) -
        (includeOriginal ? 1 : 0)
      )
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const remixesResponse = await sdk.tracks.getTrackRemixes({
        trackId: Id.parse(trackId),
        userId: OptionalId.parse(currentUserId),
        limit: pageSize,
        offset: pageParam,
        sortMethod,
        onlyCosigns: isCosign,
        onlyContestEntries: isContestEntry
      })

      const data = remixesResponse?.data ?? { count: 0, tracks: [] }
      let processedTracks = transformAndCleanList(
        data.tracks ?? [],
        userTrackMetadataFromSDK
      )

      if (includeOriginal && pageParam === 0) {
        const track = queryClient.getQueryData(getTrackQueryKey(trackId))
        if (track && data.tracks) {
          const user = queryClient.getQueryData(getUserQueryKey(track.owner_id))
          if (user) {
            processedTracks = [{ ...track, user }, ...processedTracks]
          }
        }
      }

      primeTrackData({ tracks: processedTracks, queryClient })

      // Mirror the count into the dedicated count query so single-purpose
      // count consumers don't need to fire their own request once the
      // lineup is loaded.
      queryClient.setQueryData(
        getRemixesCountQueryKey({ trackId, isCosign, isContestEntry }),
        data.count ?? 0
      )

      // Update count in legacy redux store
      dispatch(remixesPageActions.setCount({ count: data.count }))

      return processedTracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    enabled: options?.enabled !== false && !!trackId,
    ...options
  })

  return queryData
}

/**
 * Count-only companion to `useRemixes`. Hits the same SDK endpoint with
 * `limit=0` and stores just the total under a separate query key so the
 * lineup query can keep its standard `LineupData[]` page shape (which is
 * what `TrackLineup` / `playFrom`'s `querySource` requires).
 */
export const useRemixesCount = (
  { trackId, isCosign = false, isContestEntry = false }: UseRemixesCountArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const dispatch = useDispatch()

  return useQuery({
    queryKey: getRemixesCountQueryKey({ trackId, isCosign, isContestEntry }),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const remixesResponse = await sdk.tracks.getTrackRemixes({
        trackId: Id.parse(trackId),
        userId: OptionalId.parse(currentUserId),
        limit: 0,
        offset: 0,
        onlyCosigns: isCosign,
        onlyContestEntries: isContestEntry
      })
      const count = remixesResponse?.data?.count ?? 0
      dispatch(remixesPageActions.setCount({ count }))
      return count
    },
    enabled: options?.enabled !== false && !!trackId,
    ...options
  })
}
