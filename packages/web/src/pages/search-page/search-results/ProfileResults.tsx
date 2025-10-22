import { useCallback } from 'react'

import { useSearchUserResults } from '@audius/common/api'
import { Kind, Name, UserMetadata } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { Box, Flex, useTheme } from '@audius/harmony'
import { range } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { UserCard } from 'components/user-card'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import { NoResultsTile } from '../NoResultsTile'
import { useSearchParams } from '../hooks'

const { addItem: addRecentSearch } = searchActions

type ProfileResultsProps = {
  isFetching: boolean
  isPending: boolean
  data: UserMetadata[]
  limit?: number
  skeletonCount?: number
}

const ProfileResultsSkeletons = ({
  skeletonCount = 12
}: {
  skeletonCount: number
}) => {
  const isMobile = useIsMobile()
  return (
    <>
      {range(skeletonCount).map((_, i) => (
        <UserCard
          key={`user_card_sekeleton_${i}`}
          id={0}
          size={isMobile ? 'xs' : 's'}
          css={isMobile ? { maxWidth: 320 } : undefined}
          loading={true}
        />
      ))}
    </>
  )
}

export const ProfileResultsTiles = (props: ProfileResultsProps) => {
  const { limit, skeletonCount = 10, data, isFetching, isPending } = props
  const ids = data?.map((user) => user.user_id) ?? []
  const { query } = useSearchParams()

  const isMobile = useIsMobile()
  const dispatch = useDispatch()

  const truncatedIds = limit !== undefined ? (ids?.slice(0, limit) ?? []) : ids

  const handleClick = useCallback(
    (id?: number) => {
      if (id) {
        dispatch(
          addRecentSearch({
            searchItem: {
              kind: Kind.USERS,
              id
            }
          })
        )
        dispatch(
          make(Name.SEARCH_RESULT_SELECT, {
            term: query,
            source: 'search results page',
            id,
            kind: 'profile'
          })
        )
      }
    },
    [dispatch, query]
  )

  // Only show pagination skeletons when we're not loading the first page & still under the limit
  const shouldShowMoreSkeletons =
    isFetching && !isPending && (limit === undefined || data?.length < limit)

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
      {!truncatedIds.length ? (
        <ProfileResultsSkeletons skeletonCount={skeletonCount} />
      ) : (
        truncatedIds.map((id) => (
          <UserCard
            key={id}
            id={id}
            size={isMobile ? 'xs' : 's'}
            css={isMobile ? { maxWidth: 320 } : undefined}
            onClick={() => handleClick(id)}
            onUserLinkClick={() => handleClick(id)}
          />
        ))
      )}
      {shouldShowMoreSkeletons ? (
        <ProfileResultsSkeletons skeletonCount={skeletonCount} />
      ) : null}
    </Box>
  )
}

export const ProfileResultsPage = () => {
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
  const {
    data: ids,
    isFetching,
    hasNextPage,
    loadNextPage,
    isPending
  } = useSearchUserResults(searchParams)

  const isResultsEmpty = ids?.length === 0
  const showNoResultsTile = !isFetching && isResultsEmpty

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
          <ProfileResultsTiles
            isFetching={isFetching}
            isPending={isPending}
            data={ids}
            skeletonCount={5}
          />
        )}
      </Flex>
    </InfiniteScroll>
  )
}
