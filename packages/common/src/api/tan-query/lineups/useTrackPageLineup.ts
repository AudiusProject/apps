import { EntityType, Id, OptionalId } from '@audius/sdk'
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { userTrackMetadataFromSDK } from '~/adapters/track'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID, PlaybackSource } from '~/models'
import { UserTrackMetadata } from '~/models/Track'
import { trackPageSelectors } from '~/store/pages'
import { tracksActions } from '~/store/pages/track/lineup/actions'

import { QUERY_KEYS } from '../queryKeys'
import { useTrack } from '../tracks/useTrack'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'

import { useLineupQuery } from './useLineupQuery'

const DEFAULT_PAGE_SIZE = 6

export const getTrackPageLineupQueryKey = (trackId: ID | null | undefined) =>
  [QUERY_KEYS.trackPageLineup, trackId] as unknown as QueryKey<
    InfiniteData<TrackPageData>
  >

type UseTrackPageLineupArgs = {
  trackId: ID | null | undefined
  pageSize?: number
  disableAutomaticCacheHandling?: boolean
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
  tracks: UserTrackMetadata[]
  indices: TrackIndices
}

export const useTrackPageLineup = (
  {
    trackId,
    pageSize = DEFAULT_PAGE_SIZE,
    disableAutomaticCacheHandling = false
  }: UseTrackPageLineupArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const { data: heroTrack } = useTrack(trackId)

  const { data: ownerHandle } = useUser(heroTrack?.owner_id, {
    select: (user) => user?.handle
  })

  const queryData = useInfiniteQuery({
    queryKey: getTrackPageLineupQueryKey(trackId),
    initialPageParam: 0,
    getNextPageParam: () => undefined, // Always return undefined to indicate no more pages
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

      if (!heroTrack || !ownerHandle) return { tracks: [], indices }

      tracks.push(heroTrack as UserTrackMetadata)
      indices.mainTrackIndex = 0

      // If hero track is a remix, get the parent track
      const heroTrackRemixParentTrackId =
        heroTrack.remix_of?.tracks?.[0]?.parent_track_id

      if (heroTrackRemixParentTrackId) {
        const remixParentTrack = await sdk.full.tracks.getTrack({
          trackId: Id.parse(heroTrackRemixParentTrackId),
          userId: OptionalId.parse(currentUserId)
        })
        const processedParentTrack = remixParentTrack?.data
          ? userTrackMetadataFromSDK(remixParentTrack.data)
          : undefined
        if (processedParentTrack) {
          indices.remixParentSection.index = tracks.length
          tracks.push(processedParentTrack)
          indices.remixParentSection.pageSize = 1
        }
      } else {
        // If hero track is remixable (not a remix), get its remixes
        const { data: remixesData } = await sdk.full.tracks.getTrackRemixes({
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(currentUserId),
          limit: pageSize,
          offset: 0
        })

        if (remixesData?.tracks) {
          const processedRemixes = transformAndCleanList(
            remixesData.tracks,
            userTrackMetadataFromSDK
          )
          if (processedRemixes.length > 0) {
            indices.remixesSection.index = tracks.length
            tracks.push(...processedRemixes)
            indices.remixesSection.pageSize = processedRemixes.length
          }
        }
      }

      // Get more tracks by the artist
      const { data = [] } = await sdk.full.users.getTracksByUserHandle({
        handle: ownerHandle,
        userId: OptionalId.parse(currentUserId),
        sort: 'plays',
        limit: pageSize,
        offset: 0
      })

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

      // If there are no remixes, get recommended tracks based on genre
      if (indices.remixesSection.index === null) {
        const { data: trendingData } = await sdk.full.tracks.getTrendingTracks({
          genre: heroTrack.genre,
          limit: pageSize
        })

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

      // offset is 1 because the hero track is already in the lineup
      dispatch(
        tracksActions.fetchLineupMetadatas(1, pageSize, false, {
          items: tracks.slice(1),
          indices
        })
      )

      return {
        tracks: tracks.map((track) => ({
          id: track.track_id,
          type: EntityType.TRACK
        })),
        indices
      }
    },
    ...options,
    enabled: options?.enabled !== false && !!ownerHandle && !!trackId
  })

  const indices = queryData.data?.pages?.[0]?.indices

  const lineupData = useLineupQuery({
    lineupData: queryData.data?.pages.flatMap((page) => page.tracks) ?? [],
    queryData,
    queryKey: getTrackPageLineupQueryKey(trackId),
    lineupActions: tracksActions,
    lineupSelector: trackPageSelectors.getLineup,
    playbackSource: PlaybackSource.TRACK_TILE,
    pageSize,
    disableAutomaticCacheHandling
  })

  return {
    ...lineupData,
    indices,
    hasNextPage: false // Override hasNextPage to always be false
  }
}
