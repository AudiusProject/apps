import { useCallback } from 'react'

import { useSearchPlaylistResults } from '@audius/common/api'
import { Kind, Name, UserCollectionMetadata } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { Box, Flex, useTheme } from '@audius/harmony'
import { range } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionCard } from 'components/collection'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import { NoResultsTile } from '../NoResultsTile'
import { useSearchParams } from '../hooks'

import styles from './CardResults.module.css'

const { addItem: addRecentSearch } = searchActions

type PlaylistResultsProps = {
  limit?: number
  skeletonCount?: number
  data: UserCollectionMetadata[]
  isFetching: boolean
  isPending: boolean
}

const PlaylistResultsSkeletons = ({
  skeletonCount = 10
}: {
  skeletonCount: number
}) => {
  const isMobile = useIsMobile()
  const cardSize = isMobile ? 'xs' : 'm'
  const cardStyles = isMobile ? { maxWidth: 320 } : undefined
  return (
    <>
      {range(skeletonCount).map((_, i) => (
        <CollectionCard
          key={`playlist_card_skeleton_${i}`}
          id={0}
          size={cardSize}
          w={isMobile ? undefined : '100%'}
          css={cardStyles}
          loading={true}
        />
      ))}
    </>
  )
}

export const PlaylistResults = (props: PlaylistResultsProps) => {
  const { limit, skeletonCount = 10, data, isFetching, isPending } = props

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
    isFetching && !isPending && (limit === undefined || data?.length < limit)

  const resultCards = !truncatedResults.length
    ? [
        <PlaylistResultsSkeletons
          key='initial-skeletons'
          skeletonCount={skeletonCount}
        />
      ]
    : truncatedResults.map((playlist) => (
        <CollectionCard
          key={playlist.playlist_id}
          id={playlist.playlist_id}
          size={isMobile ? 'xs' : 'm'}
          w={isMobile ? undefined : '100%'}
          css={isMobile ? { maxWidth: 320 } : undefined}
          onClick={() => handleClick(playlist.playlist_id)}
          onCollectionLinkClick={() => handleClick(playlist.playlist_id)}
        />
      ))

  return (
    <Box className={isMobile ? undefined : styles.cardsLayoutWrapper}>
      <Box
        className={isMobile ? undefined : styles.cardsContainer}
        css={
          isMobile
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                justifyContent: 'space-between',
                gap: 16
              }
            : undefined
        }
        p={isMobile ? 'm' : undefined}
      >
        {resultCards}
        {shouldShowMoreSkeletons ? (
          <PlaylistResultsSkeletons skeletonCount={skeletonCount} />
        ) : null}
      </Box>
    </Box>
  )
}

export const PlaylistResultsPage = () => {
  const isMobile = useIsMobile()
  const { color } = useTheme()
  const mainContentRef = useMainContentRef()

  const getMainContentRef = useCallback(() => {
    if (isMobile) {
      return null
    }
    return mainContentRef?.current || null
  }, [isMobile, mainContentRef])

  const searchParams = useSearchParams()
  const queryData = useSearchPlaylistResults(searchParams)
  const {
    data: playlists,
    isFetching,
    hasNextPage,
    loadNextPage,
    isPending
  } = queryData

  const isResultsEmpty = playlists?.length === 0
  const showNoResultsTile = !isFetching && !isPending && isResultsEmpty

  return (
    <InfiniteScroll
      pageStart={0}
      loadMore={loadNextPage}
      hasMore={hasNextPage}
      getScrollParent={getMainContentRef}
      initialLoad={false}
      useWindow={isMobile}
    >
      <Flex
        direction='column'
        gap='xl'
        css={isMobile ? { backgroundColor: color.background.default } : {}}
      >
        {showNoResultsTile ? (
          <NoResultsTile />
        ) : (
          <PlaylistResults
            data={playlists ?? []}
            isFetching={isFetching}
            isPending={isPending}
            skeletonCount={5}
          />
        )}
      </Flex>
    </InfiniteScroll>
  )
}
