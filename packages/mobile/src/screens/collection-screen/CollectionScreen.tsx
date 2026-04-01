import { useCallback, useMemo, useEffect } from 'react'

import {
  useCollectionByParams,
  useCurrentUserId,
  useUser
} from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  FavoriteType,
  SquareSizes
} from '@audius/common/models'
import type {
  Collection,
  SearchUser,
  SearchPlaylist,
  User
} from '@audius/common/models'
import {
  collectionsSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  repostsUserListActions,
  favoritesUserListActions,
  RepostType,
  usePublishConfirmationModal,
  cacheCollectionsActions,
  useEarlyReleaseConfirmationModal
} from '@audius/common/store'
import { encodeUrlName, removeNullable } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { Divider, type ImageProps } from '@audius/harmony-native'
import {
  ScreenContent,
  Screen,
  VirtualizedScrollView
} from 'app/components/core'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { CollectionImage } from 'app/components/image/CollectionImage'
import { SuggestedTracks } from 'app/components/suggested-tracks'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'
import { setVisibility } from 'app/store/drawers/slice'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'
import { makeStyles } from 'app/styles'

import { CollectionScreenDetailsTile } from './CollectionScreenDetailsTile'
import { CollectionScreenSkeleton } from './CollectionScreenSkeleton'

const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const {
  repostCollection,
  saveCollection,
  undoRepostCollection,
  unsaveCollection
} = collectionsSocialActions

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    padding: spacing(3)
  }
}))

/**
 * `CollectionScreen` displays the details of a collection
 */
export const CollectionScreen = () => {
  const { params } = useRoute<'Collection'>()
  const navigation = useNavigation()

  // params is incorrectly typed and can sometimes be undefined
  const {
    id = null,
    searchCollection,
    collectionType,
    handle,
    slug
  } = params ?? {}

  // Use useCollectionByParams to handle both ID-based and permalink-based collection fetching.
  // collectionType comes from linking (e.g. ?collectionType=playlist) and is required for permalinks.
  const collectionParams = id
    ? { collectionId: id }
    : { handle, slug, collectionType }

  const { data: cachedCollection } = useCollectionByParams(collectionParams)
  const { data: cachedUser } = useUser(cachedCollection?.playlist_owner_id)

  const collection = cachedCollection ?? searchCollection
  const user = cachedUser ?? searchCollection?.user

  const isDeleted = collection?.is_delete
  const isMarkedDeleted =
    collection && '_marked_deleted' in collection
      ? collection._marked_deleted
      : false

  // Navigate back if collection is deleted or marked for deletion
  useEffect(() => {
    if (isDeleted || isMarkedDeleted) {
      navigation.goBack()
    }
  }, [isDeleted, isMarkedDeleted, navigation])

  if (!collection || !user) {
    return <CollectionScreenSkeleton collectionType={collectionType} />
  }

  return <CollectionScreenComponent collection={collection} user={user} />
}

type CollectionScreenComponentProps = {
  collection: Collection | SearchPlaylist
  user: User | SearchUser
}
const CollectionScreenComponent = (props: CollectionScreenComponentProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { collection, user } = props
  const {
    _is_publishing,
    description,
    playlist_contents: { track_ids },
    has_current_user_reposted,
    has_current_user_saved,
    is_album,
    is_private,
    playlist_id,
    playlist_name,
    playlist_owner_id,
    repost_count,
    save_count,
    updated_at,
    stream_conditions,
    ddex_app,
    created_at,
    is_delete
  } = collection

  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()
  const { onOpen: openEarlyReleaseConfirmation } =
    useEarlyReleaseConfirmationModal()

  const releaseDate =
    'release_date' in collection ? collection.release_date : created_at
  const url = useMemo(() => {
    return `/${encodeUrlName(user.handle)}/${
      is_album ? 'album' : 'playlist'
    }/${encodeUrlName(playlist_name)}-${playlist_id}`
  }, [user.handle, is_album, playlist_name, playlist_id])

  const renderImage = useCallback(
    (props: ImageProps) => (
      <CollectionImage
        collectionId={playlist_id}
        size={SquareSizes.SIZE_480_BY_480}
        {...props}
      />
    ),
    [playlist_id]
  )

  const { data: currentUserId } = useCurrentUserId()
  const isOwner = currentUserId === playlist_owner_id

  const isCollectionMarkedForDownload = useSelector(
    getIsCollectionMarkedForDownload(playlist_id.toString())
  )

  const { hasStreamAccess } = useGatedContentAccess(collection as Collection)

  const handlePressOverflow = useCallback(() => {
    const overflowActions = [
      isOwner && !ddex_app
        ? is_album
          ? OverflowAction.EDIT_ALBUM
          : OverflowAction.EDIT_PLAYLIST
        : null,
      isOwner && is_private ? OverflowAction.PUBLISH_PLAYLIST : null,
      isOwner && !ddex_app
        ? is_album
          ? OverflowAction.DELETE_ALBUM
          : OverflowAction.DELETE_PLAYLIST
        : null,
      OverflowAction.VIEW_ARTIST_PAGE
    ].filter(removeNullable)

    dispatch(
      openOverflowMenu({
        source: OverflowSource.COLLECTIONS,
        id: playlist_id,
        overflowActions
      })
    )
  }, [is_album, isOwner, ddex_app, is_private, dispatch, playlist_id])

  const handlePressEdit = useCallback(() => {
    navigation?.push('EditCollection', { id: playlist_id })
  }, [navigation, playlist_id])

  const publish = useCallback(() => {
    dispatch(cacheCollectionsActions.publishPlaylist(playlist_id))
  }, [playlist_id, dispatch])

  const handlePressPublish = useCallback(() => {
    if (
      'is_scheduled_release' in collection &&
      collection.is_scheduled_release
    ) {
      openEarlyReleaseConfirmation({
        contentType: 'album',
        confirmCallback: publish
      })
    } else {
      openPublishConfirmation({
        contentType: is_album ? 'album' : 'playlist',
        confirmCallback: publish
      })
    }
  }, [
    is_album,
    openPublishConfirmation,
    publish,
    openEarlyReleaseConfirmation,
    collection
  ])

  const handlePressSave = useCallback(() => {
    if (has_current_user_saved) {
      if (isCollectionMarkedForDownload) {
        dispatch(
          setVisibility({
            drawer: 'UnfavoriteDownloadedCollection',
            visible: true,
            data: { collectionId: playlist_id }
          })
        )
      } else {
        dispatch(unsaveCollection(playlist_id, FavoriteSource.COLLECTION_PAGE))
      }
    } else {
      dispatch(saveCollection(playlist_id, FavoriteSource.COLLECTION_PAGE))
    }
  }, [
    dispatch,
    playlist_id,
    has_current_user_saved,
    isCollectionMarkedForDownload
  ])

  const handlePressShare = useCallback(() => {
    dispatch(
      requestOpenShareModal({
        type: 'collection',
        collectionId: playlist_id,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, playlist_id])

  const handlePressRepost = useCallback(() => {
    if (has_current_user_reposted) {
      dispatch(undoRepostCollection(playlist_id, RepostSource.COLLECTION_PAGE))
    } else {
      dispatch(repostCollection(playlist_id, RepostSource.COLLECTION_PAGE))
    }
  }, [dispatch, playlist_id, has_current_user_reposted])

  const handlePressFavorites = useCallback(() => {
    dispatch(setFavorite(playlist_id, FavoriteType.PLAYLIST))
    navigation.push('Favorited', {
      id: playlist_id,
      favoriteType: FavoriteType.PLAYLIST
    })
  }, [dispatch, playlist_id, navigation])

  const handlePressReposts = useCallback(() => {
    dispatch(setRepost(playlist_id, RepostType.COLLECTION))
    navigation.push('Reposts', {
      id: playlist_id,
      repostType: RepostType.COLLECTION
    })
  }, [dispatch, playlist_id, navigation])

  return (
    <Screen url={url}>
      <ScreenContent isOfflineCapable>
        <VirtualizedScrollView style={styles.root}>
          <>
            <CollectionScreenDetailsTile
              description={description ?? ''}
              hasReposted={has_current_user_reposted}
              hasSaved={has_current_user_saved}
              isAlbum={is_album}
              collectionId={playlist_id}
              isPublishing={_is_publishing ?? false}
              isDeleted={is_delete}
              onPressEdit={handlePressEdit}
              onPressFavorites={handlePressFavorites}
              onPressOverflow={handlePressOverflow}
              onPressPublish={handlePressPublish}
              onPressRepost={handlePressRepost}
              onPressReposts={handlePressReposts}
              onPressSave={handlePressSave}
              onPressShare={handlePressShare}
              renderImage={renderImage}
              repostCount={repost_count}
              saveCount={save_count}
              trackCount={track_ids.length}
              title={playlist_name}
              user={user}
              isOwner={isOwner}
              hasStreamAccess={hasStreamAccess}
              streamConditions={stream_conditions}
              ddexApp={ddex_app}
              releaseDate={releaseDate}
              updatedAt={updated_at}
            />
            {isOwner && !is_album && !ddex_app ? (
              <ScreenSecondaryContent>
                <Divider mt='s' mb='2xl' />
                <SuggestedTracks collectionId={playlist_id} />
              </ScreenSecondaryContent>
            ) : null}
          </>
        </VirtualizedScrollView>
      </ScreenContent>
    </Screen>
  )
}
