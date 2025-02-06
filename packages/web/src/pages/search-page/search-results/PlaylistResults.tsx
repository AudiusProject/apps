import { useCallback } from 'react'

import {
  FlatUseInfiniteQueryResult,
  useSearchPlaylistResults
} from '@audius/common/api'
import { Kind, Name, UserCollectionMetadata } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { Box, Flex, Text, useTheme } from '@audius/harmony'
import { range } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionCard } from 'components/collection'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import { NoResultsTile } from '../NoResultsTile'
import { SortMethodFilterButton } from '../SortMethodFilterButton'
import { useSearchParams } from '../hooks'

const { addItem: addRecentSearch } = searchActions

const messages = {
  playlists: 'Playlists',
  sortOptionsLabel: 'Sort By'
}

type PlaylistResultsProps = {
  limit?: number
  skeletonCount?: number
  queryData: Omit<FlatUseInfiniteQueryResult<UserCollectionMetadata>, 'status'>
}

const PlaylistResultsSkeletons = ({
  skeletonCount = 10
}: {
  skeletonCount: number
}) => {
  const isMobile = useIsMobile()
  return (
    <>
      {range(skeletonCount).map((_, i) => (
        <CollectionCard
          key={`playlist_card_skeleton_${i}`}
          id={0}
          size={isMobile ? 'xs' : 's'}
          css={isMobile ? { maxWidth: 320 } : undefined}
          loading={true}
        />
      ))}
    </>
  )
}

export const PlaylistResults = (props: PlaylistResultsProps) => {
  const { limit, skeletonCount = 10, queryData } = props
  const { data = [], isFetching, isInitialLoading } = queryData

  const searchParams = useSearchParams()
  const { query } = searchParams

  const isMobile = useIsMobile()
  const dispatch = useDispatch()

  const truncatedResults =
    limit !== undefined ? (data?.slice(0, limit) ?? []) : data

  const handleClick = useCallback(
    (id?: number) => {
      if (id) {
        dispatch(
          addRecentSearch({
            searchItem: {
              kind: Kind.COLLECTIONS,
              id
            }
          })
        )
        dispatch(
          make(Name.SEARCH_RESULT_SELECT, {
            term: query,
            source: 'search results page',
            id,
            kind: 'playlist'
          })
        )
      }
    },
    [dispatch, query]
  )

  // Only show pagination skeletons when we're not loading the first page & still under the limit
  const shouldShowMoreSkeletons =
    isFetching &&
    !isInitialLoading &&
    (limit === undefined || data?.length < limit)

  return (
    <Box
      css={{
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(auto-fill, minmax(150px, 1fr))'
          : 'repeat(auto-fill, 200px)',
        justifyContent: 'space-between',
        gap: 16
      }}
      p={isMobile ? 'm' : undefined}
    >
      {!truncatedResults.length ? (
        <PlaylistResultsSkeletons skeletonCount={skeletonCount} />
      ) : (
        truncatedResults.map((playlist) => (
          <CollectionCard
            key={playlist.playlist_id}
            id={playlist.playlist_id}
            size={isMobile ? 'xs' : 's'}
            css={isMobile ? { maxWidth: 320 } : undefined}
            onClick={() => handleClick(playlist.playlist_id)}
            onCollectionLinkClick={() => handleClick(playlist.playlist_id)}
          />
        ))
      )}
      {shouldShowMoreSkeletons ? (
        <PlaylistResultsSkeletons skeletonCount={skeletonCount} />
      ) : null}
    </Box>
  )
}

export const PlaylistResultsPage = () => {
  const isMobile = useIsMobile()
  const { color } = useTheme()
  const mainContentRef = useMainContentRef()

  const searchParams = useSearchParams()
  const queryData = useSearchPlaylistResults(searchParams)
  const { data: playlists, isLoading, hasNextPage, loadNextPage } = queryData

  const isResultsEmpty = playlists?.length === 0
  const showNoResultsTile = !isLoading && isResultsEmpty

  return (
    <InfiniteScroll
      pageStart={0}
      loadMore={loadNextPage}
      hasMore={hasNextPage}
      getScrollParent={() => mainContentRef?.current || null}
      initialLoad={false}
      useWindow={false}
    >
      <Flex
        direction='column'
        gap='xl'
        css={isMobile ? { backgroundColor: color.background.default } : {}}
      >
        {!isMobile ? (
          <Flex justifyContent='space-between' alignItems='center'>
            <Text variant='heading' textAlign='left'>
              {messages.playlists}
            </Text>
            <SortMethodFilterButton />
          </Flex>
        ) : null}
        {showNoResultsTile ? (
          <NoResultsTile />
        ) : (
          <PlaylistResults queryData={queryData} skeletonCount={10} />
        )}
      </Flex>
    </InfiniteScroll>
  )
}
