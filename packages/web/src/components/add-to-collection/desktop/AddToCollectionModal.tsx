import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useCurrentAccountUser,
  useUserAlbums,
  useUserPlaylists
} from '@audius/common/api'
import { useDebounce } from '@audius/common/hooks'
import {
  CreatePlaylistSource,
  SquareSizes,
  Collection
} from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  cacheCollectionsActions,
  addToCollectionUISelectors,
  duplicateAddConfirmationModalUIActions,
  toastActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Modal,
  Scrollbar,
  IconMultiselectAdd,
  LoadingSpinner,
  Tooltip,
  Image
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import cn from 'classnames'
import { capitalize } from 'lodash'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch, useSelector } from 'react-redux'

import SearchBar from 'components/search-bar/SearchBar'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'

import styles from './AddToCollectionModal.module.css'
const { getCollectionType, getTrackId, getTrackTitle } =
  addToCollectionUISelectors
const { addTrackToPlaylist, createAlbum, createPlaylist } =
  cacheCollectionsActions
const { requestOpen: openDuplicateAddConfirmation } =
  duplicateAddConfirmationModalUIActions
const { toast } = toastActions
const { collectionPage } = route

const getMessages = (collectionType: 'album' | 'playlist') => ({
  title: `Add to ${capitalize(collectionType)}`,
  newCollection: `New ${capitalize(collectionType)}`,
  searchPlaceholder: `Find one of your ${collectionType}s`,
  addedToast: `Added To ${capitalize(collectionType)}!`,
  createdToast: `${capitalize(collectionType)} Created!`,
  view: `View`,
  hiddenAdd: `You cannot add hidden tracks to a public ${collectionType}.`
})

const AddToCollectionModal = NiceModal.create(() => {
  const dispatch = useDispatch()

  const modal = useModal()
  const handleClose = useCallback(() => modal.hide(), [modal])
  const collectionType = useSelector(getCollectionType)
  const trackId = useSelector(getTrackId)
  const trackTitle = useSelector(getTrackTitle)
  const isAlbumType = collectionType === 'album'
  const { data: currentUserHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearchValue = useDebounce(searchValue, 300)

  const messages = getMessages(collectionType)

  const { data: currentUserId } = useCurrentUserId()

  const useUserCollections = isAlbumType ? useUserAlbums : useUserPlaylists

  const {
    data: collections = [],
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending
  } = useUserCollections({
    userId: currentUserId,
    query: debouncedSearchValue
  })

  const collectionTrackIdMap = useMemo(
    () =>
      collections.reduce<Record<number, number[]>>((acc, collection) => {
        const trackIds = collection.playlist_contents.track_ids.map(
          (t) => t.track
        )
        acc[collection.playlist_id] = trackIds
        return acc
      }, {}),
    [collections]
  )

  const handleLoadMore = () => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }

  const handleCollectionClick = (playlist: Collection) => {
    if (!trackId) return

    const doesCollectionContainTrack =
      collectionTrackIdMap[playlist.playlist_id]?.includes(trackId)

    if (doesCollectionContainTrack) {
      dispatch(
        openDuplicateAddConfirmation({
          playlistId: playlist.playlist_id,
          trackId
        })
      )
    } else {
      dispatch(
        addTrackToPlaylist(trackId, playlist.playlist_id, { silent: true })
      )
      if (trackTitle) {
        toast({
          content: messages.addedToast,
          link: collectionPage(
            currentUserHandle,
            trackTitle,
            playlist.playlist_id,
            playlist.permalink,
            playlist.is_album
          ),
          linkText: messages.view
        })
      }
    }

    handleClose()
  }

  const handleCreateCollection = () => {
    if (!trackTitle) return
    const metadata = { playlist_name: trackTitle }
    dispatch(
      (isAlbumType ? createAlbum : createPlaylist)(
        metadata,
        CreatePlaylistSource.FROM_TRACK,
        trackId,
        'toast'
      )
    )
    handleClose()
  }

  return (
    <Modal
      isOpen={modal.visible}
      showTitleHeader
      showDismissButton
      title={messages.title}
      onClose={handleClose}
      allowScroll={false}
      bodyClassName={styles.modalBody}
      headerContainerClassName={styles.modalHeader}
    >
      <SearchBar
        className={styles.searchBar}
        iconClassname={styles.searchIcon}
        open
        value={searchValue}
        onSearch={setSearchValue}
        onOpen={() => {}}
        onClose={() => {}}
        placeholder={messages.searchPlaceholder}
        shouldAutoFocus={false}
      />
      <Scrollbar>
        <div className={styles.listContent}>
          <div className={cn(styles.listItem)} onClick={handleCreateCollection}>
            <IconMultiselectAdd className={styles.add} size='xl' />
            <span>{messages.newCollection}</span>
          </div>
          {isPending ? <LoadingSpinner m='auto' /> : null}
          <InfiniteScroll
            pageStart={1}
            loadMore={handleLoadMore}
            hasMore={hasNextPage}
            useWindow={false}
            loader={<LoadingSpinner m='auto' />}
          >
            <div className={styles.list}>
              {collections.map((collection) => (
                <div key={`${collection.playlist_id}`}>
                  <CollectionItem
                    collectionType={collectionType}
                    collection={collection}
                    handleClick={handleCollectionClick}
                  />
                </div>
              ))}
            </div>
          </InfiniteScroll>
        </div>
      </Scrollbar>
    </Modal>
  )
})

type CollectionItemProps = {
  collectionType: 'album' | 'playlist'
  handleClick: (playlist: Collection) => void
  collection: Collection
  disabled?: boolean
}

const CollectionItem = ({
  disabled = false,
  handleClick,
  collection,
  collectionType
}: CollectionItemProps) => {
  const { imageUrl: image } = useCollectionCoverArt({
    collectionId: collection.playlist_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const messages = getMessages(collectionType)
  return (
    <div
      className={cn(styles.listItem, [{ [styles.disabled]: disabled }])}
      onClick={() => handleClick(collection)}
    >
      <Image className={cn(styles.imageWrapper, styles.image)} src={image} />
      {disabled ? (
        <Tooltip text={messages.hiddenAdd} placement='right'>
          <span className={styles.playlistName}>
            {collection.playlist_name}
          </span>
        </Tooltip>
      ) : (
        <span className={styles.playlistName}>{collection.playlist_name}</span>
      )}
    </div>
  )
}

NiceModal.register('AddToCollection', AddToCollectionModal)
registerNiceModalId('AddToCollection')

export default AddToCollectionModal
