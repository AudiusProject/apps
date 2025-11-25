import { useCallback, useContext, useMemo } from 'react'

import { SearchSortMethod } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Genre, Mood } from '@audius/sdk'
import { isEmpty } from 'lodash'
import { flushSync } from 'react-dom'
import {
  generatePath,
  useMatch,
  useNavigate,
  useSearchParams as useRouterSearchParams
} from 'react-router-dom'

import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import { useIsMobile } from 'hooks/useIsMobile'

import { CategoryKey, CategoryView } from './types'
import { urlSearchParamsToObject } from './utils'

const { SEARCH_BASE_ROUTE, SEARCH_PAGE } = route

export const useShowSearchResults = () => {
  const searchParamsResult = useSearchParams()
  const { query, genre, mood, isPremium, hasDownloads, isVerified, bpm, key } =
    searchParamsResult

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
  const routeMatch = useMatch(SEARCH_PAGE)
  const categoryParam = routeMatch?.params?.category as CategoryView | undefined

  const category = isMobile ? (categoryParam ?? 'all') : categoryParam

  const [searchParams] = useRouterSearchParams()
  const navigate = useNavigate()
  const { setStackReset } = useContext(RouterContext)

  const setCategory = useCallback(
    (newCategory: CategoryKey, params?: UseSearchParamsResult) => {
      // Do not animate on mobile - use flushSync to ensure this is processed before navigation
      if (isMobile) {
        flushSync(() => {
          setStackReset(true)
        })
      }

      const commonFilterParams = Object.fromEntries(
        Object.entries(params || searchParams)
          .filter(([key, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      )
      const pathname =
        newCategory === 'all'
          ? generatePath(SEARCH_BASE_ROUTE)
          : generatePath(SEARCH_PAGE, { category: newCategory })

      const search = !isEmpty(commonFilterParams)
        ? new URLSearchParams(
            Object.fromEntries(
              Object.entries(commonFilterParams).map(([k, v]) => [k, String(v)])
            )
          ).toString()
        : ''

      navigate(`${pathname}${search ? `?${search}` : ''}`)
    },
    [searchParams, navigate, setStackReset, isMobile]
  )

  return [category || CategoryView.ALL, setCategory] as const
}

type UseSearchParamsResult = {
  query?: string
  genre?: Genre
  mood?: Mood
  bpm?: string
  key?: string
  isVerified?: boolean
  hasDownloads?: boolean
  isPremium?: boolean
  sortMethod?: SearchSortMethod
}
export const useSearchParams = (): UseSearchParamsResult => {
  const [urlSearchParams] = useRouterSearchParams()

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
    () =>
      ({
        query: query || undefined,
        genre: (genre || undefined) as Genre | undefined,
        mood: (mood || undefined) as Mood | undefined,
        bpm: bpm || undefined,
        key: key || undefined,
        isVerified: isVerified === 'true' ? true : undefined,
        hasDownloads: hasDownloads === 'true' ? true : undefined,
        isPremium: isPremium === 'true' ? true : undefined,
        sortMethod: sortMethod || undefined
      }) as UseSearchParamsResult,
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
  const [searchParams, setUrlSearchParams] = useRouterSearchParams()
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
