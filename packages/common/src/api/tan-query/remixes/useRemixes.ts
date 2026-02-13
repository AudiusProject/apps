import { Id, OptionalId, EntityType, full } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { transformAndCleanList, userTrackMetadataFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { remixesPageActions } from '~/store/pages'

import { QUERY_KEYS } from '../queryKeys'
import { getTrackQueryKey } from '../tracks/useTrack'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { getUserQueryKey } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 10

export type UseRemixesArgs = {
  trackId: number | null | undefined
  includeOriginal?: boolean
  includeWinners?: boolean
  pageSize?: number
  sortMethod?: full.GetTrackRemixesSortMethodEnum
  isCosign?: boolean
  isContestEntry?: boolean
}

export type RemixesQueryData = {
  count: number
  tracks: { id: ID; type: EntityType }[]
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
  ] as unknown as QueryKey<InfiniteData<RemixesQueryData[]>>

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
    getNextPageParam: (lastPage: RemixesQueryData, allPages) => {
      const isSecondPage = allPages.length === 1
      if (
        lastPage?.tracks?.length < pageSize ||
        (isSecondPage && includeOriginal && lastPage?.tracks?.length - 1 === 0)
      ) {
        return undefined
      }
      return (
        allPages.reduce((acc, page) => acc + page.tracks.length, 0) -
        (includeOriginal ? 1 : 0)
      )
    },
    queryFn: async ({ pageParam }) => {
      const sdk = await audiusSdk()
      const { data = { count: 0, tracks: [] } } =
        await sdk.full.tracks.getTrackRemixes({
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(currentUserId),
          limit: pageSize,
          offset: pageParam,
          sortMethod,
          onlyCosigns: isCosign,
          onlyContestEntries: isContestEntry
        })
      let processedTracks = transformAndCleanList(
        data.tracks,
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

      // Update count in store
      dispatch(remixesPageActions.setCount({ count: data.count }))

      return {
        tracks: processedTracks.map((t) => ({
          id: t.track_id,
          type: EntityType.TRACK
        })),
        count: data.count
      }
    },
    enabled: options?.enabled !== false && !!trackId,
    ...options
  })

  return queryData
}
