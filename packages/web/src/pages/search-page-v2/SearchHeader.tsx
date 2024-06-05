import { ChangeEvent, useCallback } from 'react'

import { Maybe } from '@audius/common/utils'
import {
  Flex,
  IconAlbum,
  IconNote,
  IconPlaylists,
  IconUser,
  RadioGroup,
  SelectablePill,
  Text
} from '@audius/harmony'
import { capitalize } from 'lodash'

import Header from 'components/header/desktop/Header'
import { useMedia } from 'hooks/useMedia'

import { Category } from './types'
import { filters } from './SearchFilters'

export const categories = {
  all: { filters: [] },
  profiles: { icon: IconUser, filters: ['genre', 'isVerified'] },
  tracks: {
    icon: IconNote,
    filters: ['genre', 'mood', 'key', 'bpm', 'isPremium', 'hasDownloads']
  },
  albums: { icon: IconAlbum, filters: ['genre', 'mood'] },
  playlists: { icon: IconPlaylists, filters: ['genre', 'mood'] }
} satisfies Record<string, Category>

export type CategoryKey = keyof typeof categories

type SearchHeaderProps = {
  category?: CategoryKey
  setCategory: (category: CategoryKey) => void
  title: string
  query: Maybe<string>
}

export const SearchHeader = (props: SearchHeaderProps) => {
  const { category: categoryKey = 'all', setCategory, query, title } = props

  const { isMobile } = useMedia()

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCategory(value as CategoryKey)
    },
    [setCategory]
  )

  const filterKeys = categories[categoryKey].filters

  const categoryRadioGroup = (
    <RadioGroup
      direction='row'
      gap='s'
      aria-label={'Select search category'}
      name='searchcategory'
      value={categoryKey}
      onChange={handleChange}
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
    <Flex p='s' css={{ overflow: 'scroll' }}>
      {categoryRadioGroup}
    </Flex>
  ) : (
    <Header
      {...props}
      primary={title}
      secondary={
        query ? (
          <Flex ml='l'>
            <Text variant='heading' strength='weak'>
              &#8220;{query}&#8221;
            </Text>
          </Flex>
        ) : null
      }
      bottomBar={
        <Flex direction='row' gap='s' mv='m'>
          {filterKeys.map((filterKey) => {
            const FilterComponent = filters[filterKey]
            return <FilterComponent key={filterKey} />
          })}
        </Flex>
      }
      rightDecorator={categoryRadioGroup}
      variant='main'
    />
  )
}
