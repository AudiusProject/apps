import { type Mood, OptionalId, EntityType } from '@audius/sdk/services'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { isEmpty } from 'lodash'
import { useDispatch } from 'react-redux'

import { searchResultsFromSDK } from '~/adapters'
import { useCurrentUserId } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import {
  Name,
  PlaybackSource,
  SearchSource,
  UserMetadata,
  UserCollectionMetadata,
  UserTrackMetadata
} from '~/models'
import { FeatureFlags } from '~/services'
import { SearchKind, SearchSortMethod } from '~/store'
import { tracksActions as searchResultsPageTracksLineupActions } from '~/store/pages/search-results/lineup/tracks/actions'
import { getSearchTracksLineup } from '~/store/pages/search-results/selectors'
import { Genre, formatMusicalKey } from '~/utils'

import { useLineupQuery } from '../lineups/useLineupQuery'
import { QUERY_KEYS } from '../queryKeys'
import {
  FlatUseInfiniteQueryResult,
  QueryKey,
  QueryOptions,
  LineupData
} from '../types'
import { makeLoadNextPage } from '../utils/infiniteQueryLoadNextPage'
import { primeCollectionData } from '../utils/primeCollectionData'
import { primeTrackData } from '../utils/primeTrackData'
import { primeUserData } from '../utils/primeUserData'

export type SearchCategory = 'all' | 'tracks' | 'albums' | 'playlists' | 'users'

export const labelByCategory: Record<SearchCategory, string> = {
  all: 'All',
  tracks: 'Tracks',
  users: 'Profiles',
  albums: 'Albums',
  playlists: 'Playlists'
}

export type SearchFilters = {
  genre?: Genre
  mood?: Mood
  bpm?: string
  key?: string
  isVerified?: boolean
  hasDownloads?: boolean
  isPremium?: boolean
}

export type SearchFilter = keyof SearchFilters

export type SearchArgs = {
  query?: string
  limit?: number
  offset?: number
  source?: SearchSource
  sortMethod?: SearchSortMethod
  disableAnalytics?: boolean
  pageSize?: number
} & SearchFilters

const getMinMaxFromBpm = (bpm?: string) => {
  const bpmParts = bpm ? bpm.split('-') : [undefined, undefined]
  const bpmMin = bpmParts[0] ? parseFloat(bpmParts[0]) : undefined
  const bpmMax = bpmParts[1] ? parseFloat(bpmParts[1]) : bpmMin

  // Because we round the bpm display to the nearest whole number, we need to add a small buffer
  const bufferedBpmMin = bpmMin ? Math.round(bpmMin) - 0.5 : undefined
  const bufferedBpmMax = bpmMax ? Math.round(bpmMax) + 0.5 : undefined

  return [bufferedBpmMin, bufferedBpmMax]
}

export const getSearchResultsQueryKey = <T extends SearchCategory>({
  query,
  category,
  sortMethod,
  pageSize,
  ...filters
}: Omit<SearchArgs & { category: T }, 'currentUserId'>) =>
  [
    QUERY_KEYS.search,
    category,
    query,
    { sortMethod, pageSize, ...filters }
  ] as unknown as QueryKey<
    InfiniteData<
      T extends 'tracks'
        ? UserTrackMetadata[]
        : T extends 'users'
          ? UserMetadata[]
          : T extends 'albums' | 'playlists'
            ? UserCollectionMetadata[]
            : {
                tracks: UserTrackMetadata[]
                users: UserMetadata[]
                albums: UserCollectionMetadata[]
                playlists: UserCollectionMetadata[]
              }
    >
  >

export const SEARCH_PAGE_SIZE = 12

const useSearchQueryProps = <T>(
  {
    query = '',
    category,
    source = 'search results page',
    sortMethod,
    disableAnalytics,
    pageSize = SEARCH_PAGE_SIZE,
    ...filters
  }: SearchArgs & { category: SearchCategory },
  options?: QueryOptions
) => {
  const { data: currentUserId } = useCurrentUserId()
  const queryKeyArgs = {
    query,
    category,
    sortMethod,
    pageSize,
    ...filters
  }
  const { audiusSdk, getFeatureEnabled, analytics } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return {
    initialPageParam: 0,
    queryKey: getSearchResultsQueryKey(queryKeyArgs),
    queryFn: async ({
      pageParam
    }: {
      // Typing as number here breaks mobile ts specifically for some reason
      pageParam: any
    }): Promise<{
      tracks: UserTrackMetadata[]
      users: UserMetadata[]
      albums: UserCollectionMetadata[]
      playlists: UserCollectionMetadata[]
    }> => {
      const isUSDCEnabled = await getFeatureEnabled(FeatureFlags.USDC_PURCHASES)

      const kind = category as SearchKind

      if (!query && isEmpty(filters)) {
        return {
          tracks: [],
          users: [],
          albums: [],
          playlists: []
        }
      }

      const sdk = await audiusSdk()

      const [bpmMin, bpmMax] = getMinMaxFromBpm(filters.bpm)
      const key = formatMusicalKey(filters.key)
      const isTagsSearch = query?.[0] === '#'

      const searchParams = {
        kind,
        userId: OptionalId.parse(currentUserId),
        query: isTagsSearch ? query.slice(1) : query,
        limit: pageSize,
        offset: pageParam,
        includePurchaseable: isUSDCEnabled,
        bpmMin,
        bpmMax,
        key: key ? [key] : undefined,
        genre: filters.genre ? [filters.genre] : undefined,
        mood: filters.mood ? [filters.mood] : undefined,
        sortMethod,
        isVerified: filters.isVerified,
        hasDownloads: filters.hasDownloads,
        isPurchaseable: filters.isPremium
      }

      // Fire analytics only for the first page of results
      if (pageParam === 0 && !disableAnalytics) {
        analytics.track(
          analytics.make(
            isTagsSearch
              ? {
                  eventName: Name.SEARCH_TAG_SEARCH,
                  tag: query,
                  source,
                  ...searchParams
                }
              : {
                  eventName: Name.SEARCH_SEARCH,
                  term: query,
                  source,
                  ...searchParams
                }
          )
        )
      }

      const { data } = isTagsSearch
        ? await sdk.search.searchTags(searchParams)
        : await sdk.search.search(searchParams)

      const { tracks, playlists, albums, users } = searchResultsFromSDK(
        data,
        queryClient
      )

      const primeSearchSlice = <
        T extends LineupData | UserMetadata | UserCollectionMetadata
      >(
        data: T[],
        category: SearchCategory
      ) => {
        queryClient.setQueryData(
          getSearchResultsQueryKey({
            ...queryKeyArgs,
            category
          }),
          // @ts-ignore search type is conditional on category, too verbose to inline
          (queryData: InfiniteData<T[]>): InfiniteData<T[]> => {
            const prevPages = (queryData?.pages as T[][]) ?? []
            const currentIndex = Math.floor(pageParam / pageSize)
            prevPages[currentIndex] = data
            return {
              pages: prevPages as T[][],
              pageParams: [pageParam]
            }
          }
        )
      }

      // We only prime other caches when loading data into the all category
      const shouldPrimeCache = category === 'all'

      // Prime entity cache data & the individual search slice data
      if (tracks?.length) {
        primeTrackData({ tracks, queryClient })
        if (shouldPrimeCache) {
          primeSearchSlice(
            tracks.map((t) => ({ id: t.track_id, type: EntityType.TRACK })),
            'tracks'
          )
        }
      }

      if (users?.length) {
        primeUserData({ users, queryClient })
        if (shouldPrimeCache) {
          primeSearchSlice(users, 'users')
        }
      }

      if (albums?.length || playlists?.length) {
        primeCollectionData({
          collections: [...albums, ...playlists],
          queryClient
        })
        if (albums?.length && shouldPrimeCache) {
          primeSearchSlice(albums, 'albums')
        }

        if (playlists?.length && shouldPrimeCache) {
          primeSearchSlice(playlists, 'playlists')
        }
      }

      const formattedTracks = tracks.map((track) => ({
        ...track,
        user: {
          ...((track as UserTrackMetadata).user ?? {}),
          user_id: track.owner_id
        }
      }))

      // Update lineup when new data arrives
      dispatch(
        searchResultsPageTracksLineupActions.fetchLineupMetadatas(
          pageParam,
          pageSize,
          false,
          { items: formattedTracks }
        )
      )
      return {
        tracks: formattedTracks,
        users,
        albums,
        playlists
      }
    },
    select: (data: InfiniteData<T[]>) => {
      return data?.pages?.flat()
    },
    ...options,
    enabled: options?.enabled !== false
  }
}

export const useSearchAllResults = (
  searchArgs: SearchArgs,
  options?: QueryOptions
) => {
  const { pageSize = SEARCH_PAGE_SIZE } = searchArgs
  const queryProps = useSearchQueryProps(
    {
      ...searchArgs,
      category: 'all'
    },
    options
  )

  return useInfiniteQuery({
    ...queryProps,
    getNextPageParam: (
      _lastPage: {
        tracks: UserTrackMetadata[]
        users: UserMetadata[]
        albums: UserCollectionMetadata[]
        playlists: UserCollectionMetadata[]
      },
      pages
    ) => {
      // With the ALL category we don't do any pagination.
      // If we did we would never know when we're "out of pages" so just keep returning the next offset indefinitely
      return pages.length * pageSize
    },
    select: (data) => {
      return data?.pages?.reduce(
        (acc, page) => {
          return {
            tracks: [...acc?.tracks, ...page.tracks],
            users: [...acc?.users, ...page.users],
            albums: [...acc?.albums, ...page.albums],
            playlists: [...acc?.playlists, ...page.playlists]
          }
        },
        { tracks: [], users: [], albums: [], playlists: [] }
      )
    }
  })
}

export const useSearchTrackResults = (
  searchArgs: SearchArgs,
  options?: QueryOptions
) => {
  const { pageSize = SEARCH_PAGE_SIZE } = searchArgs
  const queryProps = useSearchQueryProps(
    {
      ...searchArgs,
      category: 'tracks',
      pageSize
    },
    options
  )

  const queryData = useInfiniteQuery({
    ...queryProps,
    getNextPageParam: (lastPage: LineupData[], allPages) => {
      if (lastPage.length < pageSize) return undefined
      return allPages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const data = await queryProps.queryFn({ pageParam })
      return data.tracks.map((t) => ({
        id: t.track_id,
        type: EntityType.TRACK
      }))
    },
    select: (data) => {
      return data.pages.flat()
    }
  })

  return useLineupQuery({
    lineupData: queryData.data ?? [],
    queryData,
    queryKey: getSearchResultsQueryKey({
      ...searchArgs,
      category: 'tracks',
      pageSize
    }),
    lineupActions: searchResultsPageTracksLineupActions,
    lineupSelector: getSearchTracksLineup,
    playbackSource: PlaybackSource.SEARCH_PAGE,
    pageSize
  })
}

export const useSearchUserResults = (
  searchArgs: SearchArgs,
  options?: QueryOptions
) => {
  const { pageSize = SEARCH_PAGE_SIZE } = searchArgs
  const queryProps = useSearchQueryProps(
    {
      ...searchArgs,
      category: 'users'
    },
    options
  )

  const queryData = useInfiniteQuery({
    ...queryProps,
    getNextPageParam: (lastPage: UserMetadata[], pages) => {
      const noMorePages = lastPage.length < pageSize
      return noMorePages ? undefined : pages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const data = await queryProps.queryFn({ pageParam })
      return data.users
    }
  }) as FlatUseInfiniteQueryResult<UserMetadata>

  const queryDataWithLoadNextPage = queryData as typeof queryData & {
    loadNextPage: () => void
  }
  queryDataWithLoadNextPage.loadNextPage = makeLoadNextPage(queryData)

  return queryDataWithLoadNextPage
}

export const useSearchAlbumResults = (
  searchArgs: SearchArgs,
  options?: QueryOptions
) => {
  const { pageSize = SEARCH_PAGE_SIZE } = searchArgs
  const queryProps = useSearchQueryProps<UserCollectionMetadata>(
    {
      ...searchArgs,
      category: 'albums'
    },
    options
  )

  const queryData = useInfiniteQuery({
    ...queryProps,
    getNextPageParam: (lastPage: UserCollectionMetadata[], pages) => {
      const noMorePages = lastPage.length < pageSize
      return noMorePages ? undefined : pages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const data = await queryProps.queryFn({ pageParam })
      return data.albums
    }
  })

  const queryDataWithLoadNextPage = queryData as typeof queryData & {
    loadNextPage: () => void
  }
  queryDataWithLoadNextPage.loadNextPage = makeLoadNextPage(queryData)

  return queryDataWithLoadNextPage
}

export const useSearchPlaylistResults = (
  searchArgs: SearchArgs,
  options?: QueryOptions
) => {
  const { pageSize = SEARCH_PAGE_SIZE } = searchArgs
  const queryProps = useSearchQueryProps<UserCollectionMetadata>(
    {
      ...searchArgs,
      category: 'playlists'
    },
    options
  )

  const queryData = useInfiniteQuery({
    ...queryProps,
    getNextPageParam: (lastPage: UserCollectionMetadata[], pages) => {
      const noMorePages = lastPage.length < pageSize
      return noMorePages ? undefined : pages.length * pageSize
    },
    queryFn: async ({ pageParam }) => {
      const data = await queryProps.queryFn({ pageParam })
      return data.playlists
    }
  })

  const queryDataWithLoadNextPage = queryData as typeof queryData & {
    loadNextPage: () => void
  }
  queryDataWithLoadNextPage.loadNextPage = makeLoadNextPage(queryData)

  return queryDataWithLoadNextPage
}
