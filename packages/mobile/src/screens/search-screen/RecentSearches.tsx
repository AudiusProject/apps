import type { ReactElement } from 'react'
import { useCallback, useMemo } from 'react'

import { recentSearchMessages as messages } from '@audius/common/messages'
import { Kind } from '@audius/common/models'
import { searchActions, searchSelectors } from '@audius/common/store'
import { ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Button, Flex, IconCloseAlt, Paper, Text } from '@audius/harmony-native'

import { useDeferredElement } from '../../hooks/useDeferredElement'

import { SearchItem } from './SearchItem'
import { useSearchCategory } from './searchState.tsx'

const { removeItem, clearHistory } = searchActions
const { getSearchHistory } = searchSelectors

const MAX_RECENT_SEARCHES = 12

const itemKindByCategory: Record<string, Kind | null> = {
  all: null,
  users: Kind.USERS,
  tracks: Kind.TRACKS,
  playlists: Kind.COLLECTIONS,
  albums: Kind.COLLECTIONS
}

type RecentSearchesProps = {
  ListHeaderComponent?: ReactElement
}

export const RecentSearches = (props: RecentSearchesProps) => {
  const { ListHeaderComponent } = props
  const dispatch = useDispatch()
  const { InViewWrapper } = useDeferredElement()

  const [category] = useSearchCategory()

  const history = useSelector(getSearchHistory)
  const categoryKind: Kind | null = category
    ? itemKindByCategory[category]
    : null

  const filteredSearchItems = useMemo(() => {
    const filtered = categoryKind
      ? history.filter((item) => item.kind === categoryKind)
      : history
    return filtered.slice(0, MAX_RECENT_SEARCHES)
  }, [categoryKind, history])

  const handleClearSearchHistory = useCallback(() => {
    dispatch(clearHistory())
  }, [dispatch])

  if (filteredSearchItems.length === 0) return ListHeaderComponent || null

  return (
    <InViewWrapper>
      <ScrollView>
        {ListHeaderComponent && (
          <Flex ph='xs' pv='l'>
            {ListHeaderComponent}
          </Flex>
        )}
        <Paper
          w='100%'
          pv='l'
          direction='column'
          shadow='mid'
          backgroundColor='surface1'
          border='default'
          gap='m'
        >
          <Flex ph='l'>
            <Text variant='title' size='l'>
              {messages.title}
            </Text>
          </Flex>

          <Flex direction='column' gap='m'>
            {filteredSearchItems.map((item) => (
              <SearchItem
                key={`${item.kind}-${item.id}`}
                searchItem={item}
                icon={IconCloseAlt}
                onPressIcon={() => dispatch(removeItem({ searchItem: item }))}
              />
            ))}
          </Flex>

          <Flex pt='l' ph='l'>
            <Button
              variant='secondary'
              size='small'
              style={{ alignSelf: 'center' }}
              onPress={handleClearSearchHistory}
            >
              {messages.clear}
            </Button>
          </Flex>
        </Paper>
      </ScrollView>
    </InViewWrapper>
  )
}
