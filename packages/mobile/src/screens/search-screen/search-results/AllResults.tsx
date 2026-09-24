import { useCallback, useContext, useMemo } from 'react'

import { useSearchAllResults } from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  searchActions,
  type SearchItem as SearchItemType
} from '@audius/common/store'
import { range } from 'lodash'
import { Keyboard } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useDispatch } from 'react-redux'

import { Flex, Paper, Text } from '@audius/harmony-native'

import { NoResultsTile } from '../NoResultsTile'
import { SearchItem, SearchItemSkeleton } from '../SearchItem'
import { SearchContext } from '../searchState'

const { addItem: addRecentSearch } = searchActions

type SearchSectionHeaderProps = { title: string }

export const SearchSectionHeader = (props: SearchSectionHeaderProps) => {
  const { title } = props

  return (
    <Flex direction='row' w='100%' mb='s' alignItems='center' gap='s'>
      <Text variant='label' size='s' textTransform='uppercase'>
        {title}
      </Text>
    </Flex>
  )
}

const AllResultsItem = ({
  item
}: {
  item: SearchItemType & { isLoading?: boolean; isAlbum?: boolean }
}) => {
  const dispatch = useDispatch()

  const handlePress = useCallback(() => {
    dispatch(addRecentSearch({ searchItem: item }))
  }, [item, dispatch])

  return item.isLoading ? (
    <SearchItemSkeleton />
  ) : (
    <SearchItem searchItem={item} onPress={handlePress} />
  )
}

const skeletonSections = [
  {
    title: 'profiles',
    data: range(5).map((i) => ({
      id: i,
      kind: Kind.USERS,
      isLoading: true
    }))
  },
  {
    title: 'tracks',
    data: range(5).map((i) => ({
      id: i,
      kind: Kind.TRACKS,
      isLoading: true
    }))
  },
  {
    title: 'playlists',
    data: range(5).map((i) => ({
      id: i,
      kind: Kind.COLLECTIONS,
      isLoading: true
    }))
  },
  {
    title: 'albums',
    data: range(5).map((i) => ({
      id: i,
      kind: Kind.COLLECTIONS,
      isLoading: true
    }))
  }
]

export const AllResults = () => {
  const searchParams = useContext(SearchContext)
  const { data, isLoading, isSuccess } = useSearchAllResults({
    ...searchParams,
    pageSize: 5
  })

  const sections = useMemo(
    () =>
      data
        ? [
            {
              title: 'profiles',
              data: data.users.map((user) => ({
                id: user.user_id,
                kind: Kind.USERS
              }))
            },
            {
              title: 'tracks',
              data: data.tracks.map((track) => ({
                id: track.track_id,
                kind: Kind.TRACKS
              }))
            },
            {
              title: 'playlists',
              data: data.playlists.map((playlist) => ({
                id: playlist.playlist_id,
                kind: Kind.COLLECTIONS,
                isAlbum: false
              }))
            },
            {
              title: 'albums',
              data: data.albums.map((album) => ({
                id: album.playlist_id,
                kind: Kind.COLLECTIONS,
                isAlbum: true
              }))
            }
          ].filter((section) => section.data.length > 0)
        : [],
    [data]
  )

  const hasNoResults = (!data || sections.length === 0) && isSuccess

  return (
    <ScrollView>
      <Flex onTouchStart={Keyboard.dismiss}>
        {hasNoResults ? (
          <NoResultsTile />
        ) : (
          <Flex mh='l' gap='l' mt='l' mb='xl'>
            {(isLoading ? skeletonSections : sections).map((section, index) => {
              const items = section.data.map((item) => (
                <AllResultsItem key={item.id} item={item} />
              ))

              return (
                <Paper key={`${section.title}`} border='default' shadow='mid'>
                  <Flex ph='l' mt='l'>
                    <SearchSectionHeader title={section.title} />
                  </Flex>
                  <Flex w={'90%'}>{items}</Flex>
                </Paper>
              )
            })}
          </Flex>
        )}
      </Flex>
    </ScrollView>
  )
}
