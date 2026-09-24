import { useCallback } from 'react'

import { useSearchUserResults } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Kind } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Flex, useTheme } from '@audius/harmony-native'
import { UserCardList } from 'app/components/user-card-list'

import { NoResultsTile } from '../NoResultsTile'
import { SearchCatalogTile } from '../SearchCatalogTile'
import {
  useIsEmptySearch,
  useSearchFilters,
  useSearchQuery
} from '../searchState'

const { addItem: addRecentSearch } = searchActions

export const ProfileResults = () => {
  const dispatch = useDispatch()
  const { spacing } = useTheme()
  const [query] = useSearchQuery()
  const [filters] = useSearchFilters()
  const isEmptySearch = useIsEmptySearch()
  const {
    data: profiles,
    isSuccess,
    isLoading
  } = useSearchUserResults({
    query,
    ...filters
  })
  const hasNoResults = (!profiles || profiles.length === 0) && isSuccess

  const handlePress = useCallback(
    (id: ID) => {
      dispatch(
        addRecentSearch({
          searchItem: {
            kind: Kind.USERS,
            id
          }
        })
      )
    },
    [dispatch]
  )

  if (isEmptySearch) return <SearchCatalogTile />

  return (
    <Flex h='100%' backgroundColor='default'>
      {hasNoResults ? (
        <NoResultsTile />
      ) : (
        <UserCardList
          keyboardShouldPersistTaps='handled'
          style={{
            height: '100%',
            paddingVertical: spacing.m
          }}
          ListFooterComponent={<Flex h={200} />}
          profiles={profiles}
          isLoading={isLoading}
          onCardPress={handlePress}
        />
      )}
    </Flex>
  )
}
