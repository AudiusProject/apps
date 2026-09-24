import { useCallback } from 'react'

import { useSearchPlaylistResults } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Kind } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Flex, useTheme } from '@audius/harmony-native'
import { CollectionList } from 'app/components/collection-list/CollectionList'

import { NoResultsTile } from '../NoResultsTile'
import { SearchCatalogTile } from '../SearchCatalogTile'
import {
  useIsEmptySearch,
  useSearchFilters,
  useSearchQuery
} from '../searchState'

const { addItem: addRecentSearch } = searchActions

export const PlaylistResults = () => {
  const dispatch = useDispatch()
  const { spacing } = useTheme()
  const [query] = useSearchQuery()
  const [filters] = useSearchFilters()
  const {
    data: playlists,
    isLoading,
    isSuccess
  } = useSearchPlaylistResults({
    query,
    ...filters
  })
  const isEmptySearch = useIsEmptySearch()
  const hasNoResults = (!playlists || playlists.length === 0) && isSuccess

  const handlePress = useCallback(
    (id: ID) => {
      dispatch(
        addRecentSearch({
          searchItem: {
            kind: Kind.COLLECTIONS,
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
        <CollectionList
          style={{
            height: '100%',
            paddingVertical: spacing.m
          }}
          ListFooterComponent={<Flex h={200} />}
          keyboardShouldPersistTaps='handled'
          isLoading={isLoading}
          collection={playlists}
          onCollectionPress={handlePress}
        />
      )}
    </Flex>
  )
}
