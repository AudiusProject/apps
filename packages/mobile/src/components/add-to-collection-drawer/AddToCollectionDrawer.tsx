import { useCallback, useState } from 'react'

import {
  useCurrentUserId,
  useUserAlbums,
  useUserPlaylists
} from '@audius/common/api'
import type { Collection } from '@audius/common/models'
import { CreatePlaylistSource } from '@audius/common/models'
import {
  cacheCollectionsActions,
  addToCollectionUISelectors,
  duplicateAddConfirmationModalUIActions
} from '@audius/common/store'
import { capitalize } from 'lodash'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, LoadingSpinner } from '@audius/harmony-native'
import { AppDrawer, useDrawerState } from 'app/components/drawer'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import { CollectionList } from '../collection-list'
import { AddCollectionCard } from '../collection-list/AddCollectionCard'
import { CollectionCard } from '../collection-list/CollectionCard'
import { FilterInput } from '../filter-input'

const { addTrackToPlaylist, createAlbum, createPlaylist } =
  cacheCollectionsActions
const { getTrackId, getTrackTitle, getCollectionType } =
  addToCollectionUISelectors
const { requestOpen: openDuplicateAddConfirmation } =
  duplicateAddConfirmationModalUIActions

const getMessages = (collectionType: 'album' | 'playlist') => ({
  title: `Add To ${capitalize(collectionType)}`,
  addedToast: `Added To ${capitalize(collectionType)}!`,
  newCollection: `New ${capitalize(collectionType)}`,
  hiddenAdd: `You cannot add hidden tracks to a public ${collectionType}.`,
  tracks: (count: number) => `${count} track${count === 1 ? '' : 's'}`,
  filterPlaceholder: 'Find one of your playlists'
})

const useStyles = makeStyles(() => ({
  cardList: {
    paddingBottom: 240
  }
}))

export const AddToCollectionDrawer = () => {
  const styles = useStyles()
  const { toast } = useToast()
  const dispatch = useDispatch()
  const { onClose } = useDrawerState('AddToCollection')
  const collectionType = useSelector(getCollectionType)
  const isAlbumType = collectionType === 'album'
  const trackId = useSelector(getTrackId)
  const trackTitle = useSelector(getTrackTitle)
  const [filter, setFilter] = useState('')
  const { data: currentUserId } = useCurrentUserId()

  const messages = getMessages(collectionType)

  const useUserCollections = isAlbumType ? useUserAlbums : useUserPlaylists

  const {
    data: collections = [],
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending
  } = useUserCollections({
    userId: currentUserId,
    query: filter
  })

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  const handleAddToNewCollection = useCallback(() => {
    const metadata = {
      playlist_name: trackTitle ?? messages.newCollection
    }
    dispatch(
      (isAlbumType ? createAlbum : createPlaylist)(
        metadata,
        CreatePlaylistSource.FROM_TRACK,
        trackId,
        'toast'
      )
    )
    onClose()
  }, [
    dispatch,
    isAlbumType,
    messages.newCollection,
    onClose,
    trackId,
    trackTitle
  ])

  const renderCard = useCallback(
    ({ item }: { item: Collection | { _create: boolean } }) =>
      '_create' in item ? (
        <AddCollectionCard
          source={CreatePlaylistSource.FROM_TRACK}
          sourceTrackId={trackId}
          onCreate={handleAddToNewCollection}
          collectionType={collectionType}
        />
      ) : (
        <CollectionCard
          key={item.playlist_id}
          id={item.playlist_id}
          noNavigation
          onPress={() => {
            if (!trackId) return

            const doesCollectionContainTrack =
              item.playlist_contents.track_ids.some(
                (track) => track.track === trackId
              )

            if (doesCollectionContainTrack) {
              dispatch(
                openDuplicateAddConfirmation({
                  playlistId: item.playlist_id,
                  trackId
                })
              )
            } else {
              toast({ content: messages.addedToast })
              dispatch(
                addTrackToPlaylist(trackId, item.playlist_id, {
                  silent: true
                })
              )
            }
            onClose()
          }}
        />
      ),
    [
      trackId,
      handleAddToNewCollection,
      collectionType,
      messages,
      onClose,
      toast,
      dispatch
    ]
  )

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null
    return (
      <Flex p='l' alignItems='center'>
        <LoadingSpinner />
      </Flex>
    )
  }, [isFetchingNextPage])

  if (!trackId || !trackTitle) {
    return null
  }

  return (
    <AppDrawer
      modalName='AddToCollection'
      isFullscreen
      isGestureSupported={false}
      title={messages.title}
    >
      <View>
        <CollectionList
          ListHeaderComponent={
            <FilterInput
              placeholder={messages.filterPlaceholder}
              onChangeText={setFilter}
            />
          }
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.cardList}
          collection={collections}
          showCreateCollectionTile
          renderItem={renderCard}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={isPending}
        />
      </View>
    </AppDrawer>
  )
}
