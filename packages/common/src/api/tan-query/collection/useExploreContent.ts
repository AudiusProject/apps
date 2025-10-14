import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

const STATIC_EXPLORE_CONTENT_URL =
  'https://download.audius.co/static-resources/explore-content.json'

type ExploreContentResponse = {
  featuredPlaylists?: string[]
  featuredProfiles?: string[]
  featuredRemixContests?: string[]
  featuredLabels?: string[]
  featuredArtistCoinTracks?: string[]
}

export type ExploreContent = {
  featuredPlaylists: ID[]
  featuredProfiles: ID[]
  featuredRemixContests: ID[]
  featuredLabels: ID[]
  featuredArtistCoinTracks: ID[]
}

export const getExploreContentQueryKey = () => {
  return [QUERY_KEYS.exploreContent] as unknown as QueryKey<ExploreContent>
}

/** Removes duplicates and invalid IDs */
const parseUniqueValidIds = (ids: string[]): ID[] => {
  return [
    ...new Set(
      ids.map((id: string) => parseInt(id) as ID).filter(Number.isInteger)
    )
  ]
}

export const useExploreContent = <TResult = ExploreContent>(
  options?: SelectableQueryOptions<ExploreContent, TResult>
) => {
  const { env } = useQueryContext()
  const exploreContentUrl =
    env.EXPLORE_CONTENT_URL ?? STATIC_EXPLORE_CONTENT_URL

  return useQuery({
    queryKey: getExploreContentQueryKey(),
    queryFn: async () => {
      const response = await fetch(exploreContentUrl)
      const json: ExploreContentResponse = await response.json()
      return {
        featuredPlaylists: parseUniqueValidIds(json.featuredPlaylists ?? []),
        featuredProfiles: parseUniqueValidIds(json.featuredProfiles ?? []),
        featuredRemixContests: parseUniqueValidIds(
          json.featuredRemixContests ?? []
        ),
        featuredLabels: parseUniqueValidIds(json.featuredLabels ?? []),
        featuredArtistCoinTracks: parseUniqueValidIds(
          json.featuredArtistCoinTracks ?? []
        )
      }
    },
    ...options,
    enabled: options?.enabled !== false
  })
}
