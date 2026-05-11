import { useCallback, useContext, useMemo, useState } from 'react'

import { useNotifications } from '@audius/common/api'
import type { Notification } from '@audius/common/store'
import { useIsFocused } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import type { ViewToken } from 'react-native'

import { makeStyles } from 'app/styles'

import { AppDrawerContext } from '../app-drawer-screen'

import { EmptyNotifications } from './EmptyNotifications'
import { NotificationListItem } from './NotificationListItem'
import { NotificationListItemSkeleton } from './NotificationListItemSkeleton'

const INITIAL_SKELETON_COUNT = 5
const PAGINATION_SKELETON_COUNT = 3

type LoadingItem = { _loading: true }
type RenderItem = Notification | LoadingItem

const isLoadingItem = (item: RenderItem): item is LoadingItem =>
  '_loading' in item

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    paddingBottom: spacing(30)
  }
}))

/**
 * Hook to handle tracking visibility for notification items, by index.
 * Returns a function to check the visibility for an index, and a callback for the Flatlist.
 */
const useIsViewable = () => {
  const isFocused = useIsFocused()
  const [viewableMap, setViewableMap] = useState<{ [index: number]: boolean }>(
    {}
  )

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setViewableMap((viewableMap) => {
        // First check length
        let didChange =
          viewableItems.length !== Object.values(viewableMap).length
        // If lengths same, check each element
        if (!didChange) {
          for (const viewable of viewableItems) {
            if (viewable.index !== null && !viewableMap[viewable.index]) {
              didChange = true
              break
            }
          }
        }
        // If no change, return same item to prevent re-render
        if (!didChange) {
          return viewableMap
        }

        // Reconstruct the viewableMap from the viewableItems
        return viewableItems.reduce((acc, cur) => {
          if (cur.index === null) return acc
          return {
            ...acc,
            [cur.index]: true
          }
        }, {})
      })
    },
    []
  )

  const isVisible = useCallback(
    (index: number) => isFocused && viewableMap[index] !== undefined,
    [isFocused, viewableMap]
  )

  return [isVisible, onViewableItemsChanged] as const
}

export const NotificationList = () => {
  const styles = useStyles()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { gesturesDisabled } = useContext(AppDrawerContext)

  const {
    notifications,
    isPending,
    isError,
    fetchNextPage,
    refetch,
    isFetchingNextPage
  } = useNotifications()

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    refetch().finally(() => setIsRefreshing(false))
  }, [refetch])

  const [isVisible, visibilityCallback] = useIsViewable()

  const data = useMemo<RenderItem[]>(() => {
    if (isError) return notifications
    if (isPending && notifications.length === 0 && !isRefreshing) {
      return Array.from(
        { length: INITIAL_SKELETON_COUNT },
        () => ({ _loading: true }) as LoadingItem
      )
    }
    if (isFetchingNextPage) {
      return [
        ...notifications,
        ...Array.from(
          { length: PAGINATION_SKELETON_COUNT },
          () => ({ _loading: true }) as LoadingItem
        )
      ]
    }
    return notifications
  }, [notifications, isPending, isFetchingNextPage, isError, isRefreshing])

  const keyExtractor = useCallback(
    (item: RenderItem, index: number) =>
      isLoadingItem(item) ? `skeleton-${index}` : item.id,
    []
  )

  const renderItem = useCallback(
    ({ item, index }: { item: RenderItem; index: number }) => {
      if (isLoadingItem(item)) {
        return <NotificationListItemSkeleton />
      }
      return (
        <NotificationListItem
          notification={item}
          isVisible={isVisible(index)}
        />
      )
    },
    [isVisible]
  )

  if (!isPending && !isError && notifications.length === 0) {
    return <EmptyNotifications />
  }

  return (
    <FlashList
      contentContainerStyle={styles.container}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      scrollEnabled={!gesturesDisabled}
      onViewableItemsChanged={visibilityCallback}
      estimatedItemSize={190} // size varies - this is an estimated average
    />
  )
}
