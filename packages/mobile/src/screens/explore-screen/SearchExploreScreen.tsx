import React, { useEffect, useRef } from 'react'

import { IOScrollView } from 'react-native-intersection-observer'

import { Screen, ScreenContent } from 'app/components/core'
import { useScrollToTop } from 'app/hooks/useScrollToTop'

import { SearchResults } from '../search-screen/search-results/SearchResults'
import {
  SearchProvider,
  useSearchCategory,
  useSearchFilters,
  useSearchQuery,
  useSearchAutoFocus
} from '../search-screen/searchState'

import { ExploreContent } from './components/ExploreContent'
import { SearchExploreHeader } from './components/SearchExploreHeader'
import { useExploreRoute } from './hooks'

const SearchExploreContent = () => {
  const { params } = useExploreRoute<'SearchExplore'>()
  const scrollRef = useRef<any>(null)
  const [, setCategory] = useSearchCategory()
  const [filters, setFilters] = useSearchFilters()
  const [query, setQuery] = useSearchQuery()
  const [, setAutoFocus] = useSearchAutoFocus()

  const hasAnyFilter = Object.values(filters).some(
    (value) => value !== undefined
  )

  useEffect(() => {
    if (params?.category) setCategory(params.category)
    if (params?.filters) setFilters(params.filters)
    if (params?.query !== undefined) setQuery(params.query)
    if (params?.autoFocus !== undefined) setAutoFocus(!!params.autoFocus)
  }, [params, setCategory, setFilters, setQuery, setAutoFocus])

  useScrollToTop(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    setQuery('')
    setCategory('all')
    setFilters({})
  })

  useEffect(() => {
    if (query.length <= 1) {
      scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    }
  })

  const showSearch = Boolean(query || hasAnyFilter)

  return (
    <ScreenContent>
      <SearchExploreHeader scrollRef={scrollRef} />
      {showSearch ? (
        <SearchResults />
      ) : (
        <IOScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
          <ExploreContent />
        </IOScrollView>
      )}
    </ScreenContent>
  )
}

export const SearchExploreScreen = () => {
  const { params } = useExploreRoute<'SearchExplore'>()

  return (
    <SearchProvider
      initialCategory={(params?.category as any) ?? 'all'}
      initialFilters={params?.filters ?? {}}
      initialAutoFocus={params?.autoFocus ?? false}
      initialQuery={params?.query ?? ''}
    >
      <Screen url='Explore' header={() => <></>}>
        <SearchExploreContent />
      </Screen>
    </SearchProvider>
  )
}
