import { useCallback, useContext, useMemo, useState } from 'react'

import { useNotifications } from '@audius/common/api'
import type { Notification } from '@audius/common/store'
import { useIsFocused } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import type { ViewToken } from 'react-native'
import { View } from 'react-native'

import { useBottomChinHeight } from 'app/components/core/BottomChin'
import {
  useGlassHeaderInset,
  useGlassScrollHandler
} from 'app/screens/app-screen/GlassChromeContext'
import { spacing } from 'app/styles/spacing'

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

const LIST_PADDING_BOTTOM = spacing(30)
const MVCP_DISABLED = { disabled: true }

const useIsViewable = () => {
  const isFocused = useIsFocused()
  const [viewableMap, setViewableMap] = useState<{ [index: number]: boolean }>(
    {}
  )

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setViewableMap((viewableMap) => {
        let didChange =
          viewableItems.length !== Object.values(viewableMap).length
        if (!didChange) {
          for (const viewable of viewableItems) {
            if (viewable.index !== null && !viewableMap[viewable.index]) {
              didChange = true
              break
            }
          }
        }
        if (!didChange) {
          return viewableMap
        }

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
  const glassHeaderInset = useGlassHeaderInset()
  const bottomChin = useBottomChinHeight()
  const handleGlassScroll = useGlassScrollHandler()
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
    return (
      <View style={{ paddingTop: glassHeaderInset }}>
        <EmptyNotifications />
      </View>
    )
  }

  return (
    <FlashList
      contentContainerStyle={{
        paddingTop: glassHeaderInset,
        paddingBottom: LIST_PADDING_BOTTOM + bottomChin
      }}
      progressViewOffset={glassHeaderInset}
      onScroll={handleGlassScroll}
      scrollEventThrottle={16}
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      scrollEnabled={!gesturesDisabled}
      onViewableItemsChanged={visibilityCallback}
      maintainVisibleContentPosition={MVCP_DISABLED}
    />
  )
}
