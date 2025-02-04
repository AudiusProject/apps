import { useCallback, useContext, useMemo } from 'react'

import { SearchSortMethod } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Genre, Mood } from '@audius/sdk'
import { intersection, isEmpty } from 'lodash'
import { generatePath, useRouteMatch } from 'react-router-dom'
import { useSearchParams as useParams } from 'react-router-dom-v5-compat'

import { useHistoryContext } from 'app/HistoryProvider'
import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import { useIsMobile } from 'hooks/useIsMobile'

import { categories } from './categories'
import { CategoryKey, CategoryView } from './types'
import { urlSearchParamsToObject } from './utils'

const { SEARCH_BASE_ROUTE, SEARCH_PAGE } = route

export const useShowSearchResults = () => {
  const { query, genre, mood, isPremium, hasDownloads, isVerified, bpm, key } =
    useSearchParams()

  return (
    query ||
    genre ||
    mood ||
    isVerified ||
    hasDownloads ||
    bpm ||
    key ||
    isPremium
  )
}

export const useSearchCategory = () => {
  const isMobile = useIsMobile()
  const routeMatch = useRouteMatch<{ category: string }>(SEARCH_PAGE)
  const categoryParam = routeMatch?.params.category as CategoryView

  const category = isMobile ? (categoryParam ?? 'profiles') : categoryParam

  const { history } = useHistoryContext()
  const { query, genre, mood, isPremium, hasDownloads, isVerified } =
    useSearchParams()
  const { setStackReset } = useContext(RouterContext)

  const setCategory = useCallback(
    (newCategory: CategoryKey) => {
      // Do not animate on mobile
      setStackReset(true)

      const commonFilters = intersection(
        categories[category]?.filters ?? [],
        categories[newCategory]?.filters ?? []
      )
      const commonFilterParams = {
        ...(query && { query }),
        ...(genre && commonFilters.includes('genre') && { genre }),
        ...(mood && commonFilters.includes('mood') && { mood }),
        ...(isPremium &&
          commonFilters.includes('isPremium') && {
            isPremium: String(isPremium)
          }),
        ...(hasDownloads &&
          commonFilters.includes('hasDownloads') && {
            hasDownloads: String(hasDownloads)
          }),
        ...(isVerified &&
          commonFilters.includes('isVerified') && {
            isVerified: String(isVerified)
          })
      }

      const pathname =
        newCategory === 'all'
          ? generatePath(SEARCH_BASE_ROUTE)
          : generatePath(SEARCH_PAGE, { category: newCategory })

      history.push({
        pathname,
        search: !isEmpty(commonFilterParams)
          ? new URLSearchParams(commonFilterParams).toString()
          : undefined,
        state: {}
      })
    },
    [
      category,
      genre,
      hasDownloads,
      history,
      isPremium,
      isVerified,
      mood,
      query,
      setStackReset
    ]
  )

  return [category || CategoryView.ALL, setCategory] as const
}

export const useSearchParams = () => {
  const [urlSearchParams] = useParams()

  const query = urlSearchParams.get('query')
  const sortMethod = urlSearchParams.get('sortMethod') as SearchSortMethod
  const genre = urlSearchParams.get('genre')
  const mood = urlSearchParams.get('mood')
  const bpm = urlSearchParams.get('bpm')
  const key = urlSearchParams.get('key')
  const isVerified = urlSearchParams.get('isVerified')
  const hasDownloads = urlSearchParams.get('hasDownloads')
  const isPremium = urlSearchParams.get('isPremium')

  const searchParams = useMemo(
    () => ({
      query: query || undefined,
      genre: (genre || undefined) as Genre,
      mood: (mood || undefined) as Mood,
      bpm: bpm || undefined,
      key: key || undefined,
      isVerified: isVerified === 'true',
      hasDownloads: hasDownloads === 'true',
      isPremium: isPremium === 'true',
      sortMethod: sortMethod || undefined
    }),
    [
      query,
      genre,
      mood,
      bpm,
      key,
      isVerified,
      hasDownloads,
      isPremium,
      sortMethod
    ]
  )
  return searchParams
}

export const useUpdateSearchParams = (key: string) => {
  const [searchParams, setUrlSearchParams] = useParams()
  return (value: string) => {
    if (value) {
      setUrlSearchParams({
        ...urlSearchParamsToObject(searchParams),
        [key]: value
      })
    } else {
      const { [key]: ignored, ...params } =
        urlSearchParamsToObject(searchParams)
      setUrlSearchParams(params)
    }
  }
}
