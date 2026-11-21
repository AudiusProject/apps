import { ChangeEvent, useCallback } from 'react'

import { Flex, RadioGroup, SelectablePill, Text } from '@audius/harmony'
import { CSSObject, useTheme } from '@emotion/react'
import { capitalize } from 'lodash'

import { Header, HeaderProps } from 'components/header/desktop/Header'
import { useIsMobile } from 'hooks/useIsMobile'

import { filters } from './SearchFilters'
import { categories } from './categories'
import { useSearchCategory, useSearchParams } from './hooks'
import { Category, CategoryKey } from './types'

export const SearchHeader = (props: Partial<HeaderProps>) => {
  const { query } = useSearchParams()
  const [categoryKey, setCategory] = useSearchCategory()
  const isMobile = useIsMobile()
  const { color } = useTheme()

  const mobileHeaderCss: CSSObject = {
    overflow: 'scroll',
    '::-webkit-scrollbar': {
      display: 'none'
    },

    '-ms-overflow-style': 'none',
    'scrollbar-width': 'none',

    backgroundColor: color.background.white,
    borderBottom: `1px solid ${color.border.default}`
  }

  const handleCategoryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCategory(value as CategoryKey)
    },
    [setCategory]
  )

  const searchParams = useSearchParams()
  const genre = searchParams.genre
  const isPodcastGenre = genre === 'Podcasts'

  const filterKeys: string[] = categories[categoryKey].filters.filter(
    (filter) => {
      if (isPodcastGenre && (filter === 'key' || filter === 'bpm')) {
        return false
      }
      return true
    }
  )

  const categoryRadioGroup = (
    <RadioGroup
      direction='row'
      gap='s'
      aria-label={'Select search category'}
      name='searchcategory'
      value={categoryKey}
      onChange={handleCategoryChange}
    >
      {Object.entries(categories)
        .filter(([key]) => !isMobile || key !== 'all')
        .map(([key, category]) => (
          <SelectablePill
            aria-label={`${key} search category`}
            icon={(category as Category).icon}
            key={key}
            label={capitalize(key)}
            size='large'
            type='radio'
            value={key}
            checked={key === categoryKey}
          />
        ))}
    </RadioGroup>
  )

  return isMobile ? (
    <Flex p='s' css={mobileHeaderCss}>
      {categoryRadioGroup}
    </Flex>
  ) : (
    <Header
      {...props}
      primary='Search'
      secondary={
        query ? (
          <Flex ml='l' css={{ maxWidth: 200 }}>
            <Text variant='heading' strength='weak' ellipses>
              {query}
            </Text>
          </Flex>
        ) : null
      }
      bottomBar={
        <Flex direction='row' gap='s' mv={filterKeys.length ? 'm' : undefined}>
          {filterKeys.map((filterKey) => {
            const FilterComponent = filters[filterKey]
            return <FilterComponent key={filterKey} />
          })}
        </Flex>
      }
      rightDecorator={categoryRadioGroup}
    />
  )
}
