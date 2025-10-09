import { useCallback, useMemo, ReactNode } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { ID, FollowSource } from '@audius/common/models'
import { Flex, useScrollbarRef, Text } from '@audius/harmony'
import { range } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'

import { FollowButton } from 'components/follow-button/FollowButton'

import { UserListArtistChip } from './UserListArtistChip'
import { UserListItemSkeleton } from './UserListItemSkeleton'

const SCROLL_THRESHOLD = 400
const DEFAULT_SKELETON_COUNT = 10

type UserListDataItem = ID | { userId: ID; balance?: number }

function getUserId(item: UserListDataItem): ID {
  return typeof item === 'object' && item !== null ? item.userId : item
}

type UserListProps<T> = {
  /**
   * The list of users to display
   */
  data: T[] | undefined
  /**
   * If the number of users is known, use this prop to display the correct number of skeletons
   */
  totalCount?: number
  /**
   * Whether there are more users to load
   */
  hasNextPage: boolean
  /**
   * Whether we're loading more users
   */
  isFetchingNextPage: boolean
  /**
   * Whether we're loading the initial data
   */
  isPending: boolean
  /**
   * Function to load more users
   */
  fetchNextPage?: () => void
  /**
   * Optional user ID to show support for (used in top supporters list)
   */
  showSupportFor?: ID
  /**
   * Optional user ID to show support from (used in supporting list)
   */
  showSupportFrom?: ID
  /**
   * Whether to show ranks (1, 2, 3, etc.) next to users
   */
  showRank?: boolean
  /**
   * Function to render the right content for each user row
   */
  renderRightContent?: (item: T, index: number) => ReactNode
}

export const UserList = <T extends UserListDataItem>({
  data,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  isPending,
  fetchNextPage,
  showSupportFor,
  showSupportFrom,
  showRank = false,
  renderRightContent
}: UserListProps<T>) => {
  const { data: currentUserId } = useCurrentUserId()
  const scrollRef = useScrollbarRef()

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage?.()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const showSkeletons = isPending || isFetchingNextPage
  const loadedCount = data?.length ?? 0

  const skeletonData = useMemo(() => {
    // Determine the tag for skeleton items based on whether we're showing support info
    let skeletonTag: string | undefined
    if (showSupportFor) {
      skeletonTag = 'TOP SUPPORTERS'
    } else if (showSupportFrom) {
      skeletonTag = 'SUPPORTING'
    }

    const skeletonCount = totalCount
      ? Math.min(totalCount - loadedCount, DEFAULT_SKELETON_COUNT)
      : DEFAULT_SKELETON_COUNT

    return range(skeletonCount).map((index) => ({
      key: `skeleton ${index}`,
      tag: skeletonTag
    }))
  }, [totalCount, showSupportFor, showSupportFrom, loadedCount])

  const defaultRenderRightContent = (item: T, index: number) => {
    const userId = getUserId(item)
    if (userId !== currentUserId) {
      return (
        <FollowButton
          size='small'
          fullWidth={false}
          source={FollowSource.USER_LIST}
          userId={userId}
        />
      )
    }
    return null
  }

  return (
    <Flex h='100%' column>
      <InfiniteScroll
        pageStart={0}
        loadMore={handleLoadMore}
        hasMore={hasNextPage}
        useWindow={false}
        initialLoad={false}
        threshold={SCROLL_THRESHOLD}
        getScrollParent={scrollRef ? () => scrollRef?.current : undefined}
        css={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.s,
          padding: theme.spacing.s
        })}
      >
        {data?.map((item: T, index: number) => {
          const userId = getUserId(item)
          const rank = showRank ? index + 1 : undefined

          return (
            <Flex
              alignItems='center'
              justifyContent='space-between'
              borderBottom={index === data.length - 1 ? undefined : 'strong'}
              p='m'
              key={userId}
            >
              <Flex
                alignItems='center'
                gap='m'
                flex={1}
                css={{ overflow: 'hidden' }}
              >
                {showRank && rank && (
                  <Text variant='title' css={{ minWidth: '20px' }}>
                    {rank}
                  </Text>
                )}
                <UserListArtistChip
                  userId={userId}
                  showSupportFor={showSupportFor}
                  showSupportFrom={showSupportFrom}
                />
              </Flex>
              {renderRightContent
                ? renderRightContent(item, index)
                : defaultRenderRightContent(item, index)}
            </Flex>
          )
        })}
        {showSkeletons
          ? skeletonData.map((skeleton) => (
              <UserListItemSkeleton key={skeleton.key} tag={skeleton.tag} />
            ))
          : null}
      </InfiniteScroll>
    </Flex>
  )
}
