import { createElement, memo, useCallback, useMemo } from 'react'

import type { Collection, ID } from '@audius/common/models'
import { CreatePlaylistSource } from '@audius/common/models'
import type { ListRenderItem } from 'react-native'

import type { CardListProps } from 'app/components/core'
import { CardList } from 'app/components/core'

import { AddCollectionCard } from './AddCollectionCard'
import { CollectionCard } from './CollectionCard'
import { CollectionCardSkeleton } from './CollectionCardSkeleton'

const MemoizedCollectionCard = memo(CollectionCard)

type FullListProps = Omit<
  CardListProps<Collection>,
  'data' | 'renderItem' | 'FlatListComponent'
>
type IDCardListItem = {
  id: ID
}
type IDListProps = Omit<
  CardListProps<IDCardListItem>,
  'data' | 'renderItem' | 'FlatListComponent'
>
type CreateCard = { _create: boolean }

// Props to show and setup tile for creating new playlists
type CreateCollectionTileProps = {
  collectionType?: 'playlist' | 'album'
  showCreateCollectionTile?: boolean
  createPlaylistSource?: CreatePlaylistSource | null
  createPlaylistTrackId?: ID | null
  createPlaylistCallback?: () => void
}

// Props for infinite loading
type InfiniteLoadingProps = {
  onEndReached?: () => void
  onEndReachedThreshold?: number
  isLoadingMore?: boolean
}

type FullCollectionListProps = {
  collection?: Collection[]
  renderItem?: ListRenderItem<Collection | CreateCard> | null
  onCollectionPress?: (id: ID) => void
} & FullListProps &
  CreateCollectionTileProps &
  InfiniteLoadingProps

type CollectionIdListProps = {
  collectionIds: ID[]
} & IDListProps &
  CreateCollectionTileProps &
  InfiniteLoadingProps

type CollectionListProps = FullCollectionListProps | CollectionIdListProps

const FullCollectionList = (props: FullCollectionListProps) => {
  const {
    collection,
    collectionType = 'playlist',
    showCreateCollectionTile = false,
    createPlaylistSource = CreatePlaylistSource.LIBRARY_PAGE,
    createPlaylistTrackId,
    createPlaylistCallback,
    renderItem,
    onCollectionPress,
    onEndReached,
    onEndReachedThreshold,
    isLoadingMore,
    ...other
  } = props

  const renderCard: ListRenderItem<Collection | CreateCard> = useCallback(
    ({ item }) =>
      '_create' in item ? (
        <AddCollectionCard
          source={createPlaylistSource!}
          sourceTrackId={createPlaylistTrackId}
          onCreate={createPlaylistCallback}
          collectionType={collectionType}
        />
      ) : (
        <MemoizedCollectionCard
          id={item.playlist_id}
          onPress={
            onCollectionPress
              ? () => onCollectionPress(item.playlist_id)
              : undefined
          }
        />
      ),
    [
      collectionType,
      createPlaylistCallback,
      createPlaylistSource,
      createPlaylistTrackId,
      onCollectionPress
    ]
  )

  const updatedCollection = showCreateCollectionTile
    ? [{ _create: true }, ...(collection ?? [])]
    : collection

  return (
    <CardList
      data={updatedCollection}
      renderItem={renderItem ?? renderCard}
      LoadingCardComponent={CollectionCardSkeleton}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      isLoadingMore={isLoadingMore}
      {...other}
    />
  )
}

function isIdListProps(
  props: CollectionListProps
): props is CollectionIdListProps {
  return (props as CollectionIdListProps).collectionIds !== undefined
}

const CollectionIDList = (props: CollectionIdListProps) => {
  const {
    collectionIds,
    collectionType = 'playlist',
    showCreateCollectionTile = false,
    createPlaylistSource = CreatePlaylistSource.LIBRARY_PAGE,
    createPlaylistTrackId,
    createPlaylistCallback,
    onEndReached,
    onEndReachedThreshold,
    isLoadingMore,
    ...other
  } = props

  const renderCard: ListRenderItem<IDCardListItem | CreateCard> = useCallback(
    ({ item }) =>
      '_create' in item ? (
        <AddCollectionCard
          source={createPlaylistSource!}
          sourceTrackId={createPlaylistTrackId}
          onCreate={createPlaylistCallback}
          collectionType={collectionType}
        />
      ) : (
        <MemoizedCollectionCard id={item.id} />
      ),
    [
      collectionType,
      createPlaylistCallback,
      createPlaylistSource,
      createPlaylistTrackId
    ]
  )

  const idList: (IDCardListItem | CreateCard)[] = useMemo(() => {
    const collectionIdData = collectionIds.map((id) => ({ id }))
    return showCreateCollectionTile
      ? [{ _create: true }, ...collectionIdData]
      : collectionIdData
  }, [collectionIds, showCreateCollectionTile])

  return (
    <CardList
      data={idList}
      renderItem={renderCard}
      LoadingCardComponent={CollectionCardSkeleton}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      isLoadingMore={isLoadingMore}
      {...other}
    />
  )
}

// Helper to switch between legacy version and newer version of CollectionList.
// The latter just takes IDs and allows the child components to fetch their data
export const CollectionList = (props: CollectionListProps) => {
  return isIdListProps(props)
    ? createElement(CollectionIDList, props)
    : createElement(FullCollectionList, props)
}
