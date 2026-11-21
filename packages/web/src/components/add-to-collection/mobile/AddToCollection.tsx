import { useCallback, useContext } from 'react'

import {
  useCurrentUserId,
  useUserAlbums,
  useUserPlaylists
} from '@audius/common/api'
import { CreatePlaylistSource } from '@audius/common/models'
import {
  cacheCollectionsActions,
  addToCollectionUISelectors,
  addToCollectionUIActions,
  modalsActions
} from '@audius/common/store'
import { LoadingSpinner } from '@audius/harmony'
import { capitalize } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch, useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import CardLineup from 'components/lineup/CardLineup'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useTemporaryNavContext } from 'components/nav/mobile/NavContext'
import TextElement, { Type } from 'components/nav/mobile/TextElement'
import { ToastContext } from 'components/toast/ToastContext'
import useHasChangedRoute from 'hooks/useHasChangedRoute'
import NewCollectionButton from 'pages/library-page/components/mobile/NewCollectionButton'

import styles from './AddToCollection.module.css'

const { getTrackId, getTrackTitle, getCollectionType } =
  addToCollectionUISelectors
const { close } = addToCollectionUIActions
const { setVisibility } = modalsActions
const { addTrackToPlaylist, createPlaylist, createAlbum } =
  cacheCollectionsActions

const getMessages = (collectionType: 'album' | 'playlist') => ({
  title: `Add To ${capitalize(collectionType)}`,
  addedToast: `Added To ${capitalize(collectionType)}!`,
  createdToast: `${capitalize(collectionType)} created!`
})

const AddToCollection = () => {
  const dispatch = useDispatch()
  const trackId = useSelector(getTrackId)
  const trackTitle = useSelector(getTrackTitle)
  const collectionType = useSelector(getCollectionType)
  const { toast } = useContext(ToastContext)
  const { data: currentUserId } = useCurrentUserId()
  const isAlbumType = collectionType === 'album'

  const useUserCollections = isAlbumType ? useUserAlbums : useUserPlaylists

  const {
    data: collections = [],
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending
  } = useUserCollections({
    userId: currentUserId
  })

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage])

  const handleClose = useCallback(() => {
    dispatch(close())
    dispatch(setVisibility({ modal: 'AddToCollection', visible: false }))
  }, [dispatch])

  useHasChangedRoute(handleClose)

  const messages = getMessages(collectionType)
  const setters = useCallback(
    () => ({
      left: (
        <TextElement
          text='Cancel'
          type={Type.SECONDARY}
          onClick={handleClose}
        />
      ),
      center: messages.title,
      right: null
    }),
    [handleClose, messages.title]
  )
  useTemporaryNavContext(setters)

  const handleCollectionClick = useCallback(
    (collectionId: number) => {
      if (!trackId) return
      dispatch(addTrackToPlaylist(trackId, collectionId))
      toast(messages.addedToast)
      handleClose()
    },
    [trackId, dispatch, toast, messages.addedToast, handleClose]
  )

  const handleCreateCollection = useCallback(() => {
    if (!trackId || !trackTitle) return
    const metadata = { playlist_name: trackTitle }
    dispatch(
      collectionType === 'album'
        ? createAlbum(metadata, CreatePlaylistSource.FROM_TRACK, trackId)
        : createPlaylist(metadata, CreatePlaylistSource.FROM_TRACK, trackId)
    )
    toast(messages.createdToast)
    handleClose()
  }, [
    trackTitle,
    trackId,
    collectionType,
    dispatch,
    toast,
    messages.createdToast,
    handleClose
  ])

  if (!trackTitle) return null

  const cards = collections.map((collection) => (
    <CollectionCard
      key={collection.playlist_id}
      id={collection.playlist_id}
      size='xs'
      noNavigation
      onClick={() => handleCollectionClick(collection.playlist_id)}
    />
  ))

  return (
    <MobilePageContainer>
      <div className={styles.bodyContainer}>
        <NewCollectionButton
          onClick={handleCreateCollection}
          collectionType={collectionType}
        />
        <div className={styles.cardsContainer}>
          {isPending ? (
            <LoadingSpinner m='auto' />
          ) : (
            <InfiniteScroll
              pageStart={1}
              loadMore={handleLoadMore}
              hasMore={hasNextPage}
              useWindow={false}
              loader={<LoadingSpinner m='auto' />}
            >
              <CardLineup cards={cards} />
            </InfiniteScroll>
          )}
        </div>
      </div>
    </MobilePageContainer>
  )
}

export default AddToCollection
