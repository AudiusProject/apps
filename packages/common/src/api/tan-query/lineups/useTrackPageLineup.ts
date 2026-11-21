import { EntityType, Id, OptionalId } from '@audius/sdk'
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData
} from '@tanstack/react-query'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { UserTrackMetadata } from '~/models/Track'

import { QUERY_KEYS } from '../queryKeys'
import { useTrack } from '../tracks/useTrack'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeTrackData } from '../utils/primeTrackData'

const DEFAULT_PAGE_SIZE = 6

export const getTrackPageLineupQueryKey = (trackId: ID | null | undefined) =>
  [QUERY_KEYS.trackPageLineup, trackId] as unknown as QueryKey<
    InfiniteData<TrackPageData>
  >

type UseTrackPageLineupArgs = {
  trackId: ID | null | undefined
  pageSize?: number
}

type TrackIndices = {
  mainTrackIndex: number | undefined
  remixParentSection: {
    index: number | undefined
    pageSize: number | undefined
  }
  remixesSection: {
    index: number | undefined
    pageSize: number | undefined
  }
  moreBySection: {
    index: number | undefined
    pageSize: number | undefined
  }
  recommendedSection: {
    index: number | undefined
    pageSize: number | undefined
  }
}

type TrackPageData = {
  trackIds: ID[]
  indices: TrackIndices
}

export const useTrackPageLineup = (
  { trackId, pageSize = DEFAULT_PAGE_SIZE }: UseTrackPageLineupArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const { data: heroTrack } = useTrack(trackId)

  const { data: ownerHandle } = useUser(heroTrack?.owner_id, {
    select: (user) => user?.handle
  })

  const queryKey = getTrackPageLineupQueryKey(trackId)

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    getNextPageParam: () => undefined, // always single page
    queryFn: async () => {
      const sdk = await audiusSdk()
      const tracks: UserTrackMetadata[] = []
      const indices: TrackIndices = {
        mainTrackIndex: undefined,
        remixParentSection: { index: undefined, pageSize: undefined },
        remixesSection: { index: undefined, pageSize: undefined },
        moreBySection: { index: undefined, pageSize: undefined },
        recommendedSection: { index: undefined, pageSize: undefined }
      }

      if (!heroTrack || !ownerHandle) {
        return { trackIds: [] as ID[], indices }
      }

      tracks.push(heroTrack as UserTrackMetadata)
      indices.mainTrackIndex = 0

      const heroTrackRemixParentTrackId =
        heroTrack.remix_of?.tracks?.[0]?.parent_track_id

      const remixParentPromise = heroTrackRemixParentTrackId
        ? sdk.tracks.getTrack({
            trackId: Id.parse(heroTrackRemixParentTrackId),
            userId: OptionalId.parse(currentUserId)
          })
        : undefined
      const remixesPromise = heroTrackRemixParentTrackId
        ? undefined
        : sdk.tracks.getTrackRemixes({
            trackId: Id.parse(trackId),
            userId: OptionalId.parse(currentUserId),
            limit: pageSize,
            offset: 0
          })
      const moreByPromise = sdk.users.getTracksByUserHandle({
        handle: ownerHandle,
        userId: OptionalId.parse(currentUserId),
        sort: 'plays',
        limit: pageSize,
        offset: 0
      })
      const trendingPromise = sdk.tracks.getTrendingTracks({
        genre: heroTrack.genre,
        limit: pageSize
      })
      trendingPromise.catch(() => {})

      const [remixParentTrack, remixesData, { data = [] }] = await Promise.all([
        remixParentPromise,
        remixesPromise,
        moreByPromise
      ])

      if (heroTrackRemixParentTrackId) {
        const processedParentTrack = remixParentTrack?.data
          ? userTrackMetadataFromSDK(remixParentTrack.data)
          : undefined
        if (processedParentTrack) {
          indices.remixParentSection.index = tracks.length
          tracks.push(processedParentTrack)
          indices.remixParentSection.pageSize = 1
        }
      } else {
        if (remixesData?.data?.tracks) {
          const processedRemixes = transformAndCleanList(
            remixesData.data.tracks,
            userTrackMetadataFromSDK
          )
          if (processedRemixes.length > 0) {
            indices.remixesSection.index = tracks.length
            tracks.push(...processedRemixes)
            indices.remixesSection.pageSize = processedRemixes.length
          }
        }
      }

      const processedTracks = transformAndCleanList(
        data,
        userTrackMetadataFromSDK
      )
        .filter(
          (track) =>
            !tracks.some(
              (existingTrack) => existingTrack.track_id === track.track_id
            )
        )
        .slice(0, pageSize)

      if (processedTracks.length > 0) {
        indices.moreBySection.index = tracks.length
        tracks.push(...processedTracks)
        indices.moreBySection.pageSize = processedTracks.length
      }

      if (indices.remixesSection.index === undefined) {
        const { data: trendingData } = await trendingPromise

        if (trendingData) {
          const processedTracks = transformAndCleanList(
            trendingData,
            userTrackMetadataFromSDK
          ).filter(
            (track) =>
              !tracks.some(
                (existingTrack) => existingTrack.track_id === track.track_id
              ) && track.track_id !== trackId
          )

          if (processedTracks.length > 0) {
            indices.recommendedSection.index = tracks.length
            tracks.push(...processedTracks)
            indices.recommendedSection.pageSize = processedTracks.length
          }
        }
      }

      primeTrackData({ tracks, queryClient })

      return {
        trackIds: tracks.map((track) => track.track_id),
        indices
      }
    },
    select: (data) => data?.pages,
    ...options,
    enabled: options?.enabled !== false && !!ownerHandle && !!trackId
  })

  const firstPage = query.data?.[0]
  const trackIds = firstPage?.trackIds ?? []
  const indices = firstPage?.indices

  const data = trackIds.map((id) => ({ id, type: EntityType.TRACK }))

  return {
    data,
    trackIds,
    indices,

    isPending: query.isPending,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    isInitialLoading: query.isInitialLoading,
    hasNextPage: false as const,
    fetchNextPage: query.fetchNextPage,
    loadNextPage: makeLoadNextPage(query),

    queryKey
  }
}

export const usePrefetchTrackPageLineup = (trackId: ID | null | undefined) => {
  useTrackPageLineup({ trackId })
}
