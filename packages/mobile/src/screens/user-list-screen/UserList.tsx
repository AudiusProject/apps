import { useCallback, useContext, useMemo } from 'react'

import type { ID, User } from '@audius/common/models'
import type { ListRenderItem } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { range } from 'lodash'
import { StyleSheet, View } from 'react-native'

import { Flex, useTheme } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { makeStyles } from 'app/styles'

import { UserListItem } from './UserListItem'
import { UserListItemSkeleton } from './UserListItemSkeleton'
import { UserListLargeTitleContext } from './UserListScreen'
import { USER_LIST_AVATAR_SIZE } from './constants'

const InsetSeparator = () => {
  const { color, spacing } = useTheme()
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginLeft: spacing.l + USER_LIST_AVATAR_SIZE + spacing.m,
        backgroundColor: color.border.default
      }}
    />
  )
}

const keyExtractor = (item: { user_id: ID } | SkeletonItem) =>
  item.user_id.toString()
const DEFAULT_SKELETON_COUNT = 10

type SkeletonItem = {
  _loading: true
  user_id: string
}

const useStyles = makeStyles(({ spacing }) => ({
  spinner: {
    alignSelf: 'center',
    height: spacing(8),
    width: spacing(8),
    marginBottom: spacing(4)
  },
  emptySpinner: {
    marginTop: spacing(4)
  }
}))

type UserListProps = {
  data?: ID[]
  totalCount?: number
  isFetchingNextPage: boolean
  isPending: boolean
  fetchNextPage?: () => void
  tag: string
  showRank?: boolean
  renderRightContent?: (userId: ID, index: number) => React.ReactNode
  hideFollowsYou?: boolean
}

export const UserList = (props: UserListProps) => {
  const {
    data = [],
    totalCount,
    isFetchingNextPage,
    isPending,
    fetchNextPage,
    tag,
    showRank = false,
    renderRightContent,
    hideFollowsYou
  } = props
  const styles = useStyles()
  const largeTitle = useContext(UserListLargeTitleContext)

  const isEmpty = data.length === 0

  const skeletonData: SkeletonItem[] = useMemo(() => {
    const loadedCount = data.length

    const skeletonCount = totalCount
      ? Math.min(totalCount - loadedCount, DEFAULT_SKELETON_COUNT)
      : DEFAULT_SKELETON_COUNT

    return range(skeletonCount).map((index) => ({
      _loading: true,
      user_id: `skeleton ${index}`
    }))
  }, [totalCount, data])

  const displayData = useMemo(() => {
    return [
      ...data.map((id) => ({ user_id: id })),
      ...(isPending || isFetchingNextPage ? skeletonData : [])
    ]
  }, [data, isPending, isFetchingNextPage, skeletonData])

  const renderItem: ListRenderItem<User | SkeletonItem> = useCallback(
    ({ item, index }) =>
      '_loading' in item ? (
        <UserListItemSkeleton tag={tag} />
      ) : (
        <UserListItem
          userId={item.user_id}
          tag={tag}
          showRank={showRank}
          rank={showRank ? index + 1 : undefined}
          renderRightContent={renderRightContent}
          hideFollowsYou={hideFollowsYou}
        />
      ),
    [tag, showRank, renderRightContent, hideFollowsYou]
  )

  const loadingSpinner = (
    <LoadingSpinner style={[styles.spinner, isEmpty && styles.emptySpinner]} />
  )

  const footer = <Flex h='2xl' mb='l' />

  return (
    <FlashList
      data={displayData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={InsetSeparator}
      ListHeaderComponent={largeTitle?.header}
      onScroll={largeTitle?.onScroll}
      scrollEventThrottle={16}
      onEndReached={fetchNextPage}
      onEndReachedThreshold={3}
      ListFooterComponent={
        isFetchingNextPage || isPending ? loadingSpinner : footer
      }
    />
  )
}
