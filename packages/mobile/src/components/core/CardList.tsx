import type { ComponentType } from 'react'
import { useMemo, useCallback, useRef } from 'react'

import type { ListRenderItem, ListRenderItemInfo } from 'react-native'
import { View } from 'react-native'

import { Flex } from '@audius/harmony-native'
import { useScrollToTop } from 'app/hooks/useScrollToTop'
import { makeStyles } from 'app/styles'

import type { FlatListT, FlatListProps } from './FlatList'
import { FlatList } from './FlatList'

export type CardListProps<ItemT> = Omit<FlatListProps<ItemT>, 'data'> & {
  data: ItemT[] | null | undefined
  disableTopTabScroll?: boolean
  FlatListComponent?: ComponentType<FlatListProps<ItemT | LoadingCard>>
  isLoading?: boolean
  isLoadingMore?: boolean
  LoadingCardComponent?: ComponentType<{ noShimmer?: boolean }>
  // If total count is known, use this to aid in rendering the right number
  // of skeletons
  totalCount?: number

  // Use carousel spacing to override the parent's margins
  // e.g. make carousel start and end at edge of the screen
  carouselSpacing?: number

  // Override the per-item slot width in horizontal mode. Defaults to
  // `spacing(43)` (172px), which is right for small thumbnail-style cards
  // (tracks, playlists) but too narrow for the redesigned contest card.
  horizontalCardWidth?: number | `${number}%`
}

export type LoadingCard = { _loading: true }

const MAX_INITIAL_SKELETON_CARDS = 12

const getSkeletonData = (requestedCount?: number): LoadingCard[] => {
  const defaultCount = 6
  const count = Math.min(
    Math.max(requestedCount ?? defaultCount, defaultCount),
    MAX_INITIAL_SKELETON_CARDS
  )
  return Array.from({ length: count }, () => ({ _loading: true }))
}

const DefaultLoadingCard = () => null

const useStyles = makeStyles(({ spacing }) => ({
  cardList: {
    paddingRight: 0
  },
  columnWrapper: {
    paddingLeft: spacing(3)
  },
  card: {
    width: '50%',
    paddingRight: spacing(3),
    paddingBottom: spacing(3)
  },
  cardListHorizontal: {
    paddingHorizontal: spacing(4),
    paddingRight: 0,
    flexGrow: 0
  },
  cardHorizontal: {
    paddingRight: spacing(3),
    paddingBottom: spacing(3)
  }
}))

const DEFAULT_HORIZONTAL_CARD_WIDTH = 172

export function CardList<ItemT extends {}>(props: CardListProps<ItemT>) {
  const {
    renderItem,
    disableTopTabScroll,
    data: dataProp,
    isLoading: isLoadingProp,
    isLoadingMore,
    LoadingCardComponent = DefaultLoadingCard,
    FlatListComponent = FlatList,
    totalCount,
    horizontal: isHorizontal = false,
    carouselSpacing = 0,
    horizontalCardWidth = DEFAULT_HORIZONTAL_CARD_WIDTH,
    ...other
  } = props

  const styles = useStyles()
  const ref = useRef<FlatListT<ItemT | LoadingCard>>(null)
  const isLoading = isLoadingProp ?? !dataProp

  useScrollToTop(() => {
    ref.current?.scrollToOffset({
      offset: 0,
      animated: true
    })
  }, disableTopTabScroll)

  const data = useMemo(() => {
    const skeletonData = isLoading ? getSkeletonData(totalCount) : []
    const moreSkeletonData = isLoadingMore ? getSkeletonData(6) : []

    return [...(dataProp ?? []), ...skeletonData, ...moreSkeletonData]
  }, [dataProp, isLoading, isLoadingMore, totalCount])

  const handleRenderItem: ListRenderItem<ItemT | LoadingCard> = useCallback(
    (info) => {
      const itemElement =
        '_loading' in info.item ? (
          <LoadingCardComponent noShimmer />
        ) : (
          (renderItem?.(info as ListRenderItemInfo<ItemT>) ?? null)
        )

      return (
        <View
          style={
            isHorizontal
              ? [styles.cardHorizontal, { width: horizontalCardWidth }]
              : styles.card
          }
        >
          {itemElement}
        </View>
      )
    },
    [
      LoadingCardComponent,
      renderItem,
      styles.card,
      styles.cardHorizontal,
      isHorizontal,
      horizontalCardWidth
    ]
  )

  const keyExtractor = useCallback(
    (item: ItemT | LoadingCard, index: number) => {
      if ('_loading' in item) return `loading-${index}`
      const id =
        (item as { id?: string | number; playlist_id?: string | number }).id ??
        (item as { playlist_id?: string | number }).playlist_id
      return id != null ? String(id) : String(index)
    },
    []
  )

  if (isHorizontal) {
    return (
      <Flex mh={carouselSpacing * -1}>
        <FlatListComponent
          key='horizontal'
          style={[
            styles.cardListHorizontal,
            { paddingHorizontal: carouselSpacing }
          ]}
          showsHorizontalScrollIndicator={false}
          ref={ref}
          data={data}
          renderItem={handleRenderItem}
          keyExtractor={keyExtractor}
          horizontal
          {...(other as Partial<CardListProps<ItemT | LoadingCard>>)}
        />
      </Flex>
    )
  }

  return (
    <FlatListComponent
      style={styles.cardList}
      columnWrapperStyle={styles.columnWrapper}
      ref={ref}
      data={data}
      renderItem={handleRenderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      {...(other as Partial<CardListProps<ItemT | LoadingCard>>)}
    />
  )
}
