import { useCallback, useMemo } from 'react'

import { useCollection, useUser } from '@audius/common/api'
import { useProxySelector } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  SquareSizes,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import type { Collection, Track, User } from '@audius/common/models'
import {
  accountSelectors,
  cacheCollectionsSelectors,
  collectionsSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  playerSelectors
} from '@audius/common/store'
import type { EnhancedCollectionTrack, CommonState } from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import type { ImageProps } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { setVisibility } from 'app/store/drawers/slice'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'

import { CollectionImage } from '../image/CollectionImage'

import { CollectionTileTrackList } from './CollectionTileTrackList'
import { LineupTile } from './LineupTile'
import { LineupTileSource, type LineupItemProps } from './types'
const { getUid } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const {
  repostCollection,
  saveCollection,
  undoRepostCollection,
  unsaveCollection
} = collectionsSocialActions
const { getTracksFromCollection } = cacheCollectionsSelectors
const getUserId = accountSelectors.getUserId

export const CollectionTile = (props: LineupItemProps) => {
  const {
    uid,
    id,
    collection: collectionOverride,
    tracks: tracksOverride,
    source = LineupTileSource.LINEUP_COLLECTION
  } = props

  const { data: cachedCollection } = useCollection(id)
  const collection = collectionOverride ?? cachedCollection

  const tracks = useProxySelector(
    (state) => {
      return tracksOverride ?? getTracksFromCollection(state, { uid })
    },
    [tracksOverride, uid]
  )

  const { data: user } = useUser(collection?.playlist_owner_id)

  if (!collection || !tracks || !user) {
    console.warn(
      'Collection, tracks, or user missing for CollectionTile, preventing render'
    )
    return null
  }

  if (collection.is_delete || user?.is_deactivated) {
    return null
  }

  return (
    <CollectionTileComponent
      {...props}
      collection={collection}
      tracks={tracks}
      user={user}
      source={source}
    />
  )
}

type CollectionTileProps = LineupItemProps & {
  collection: Collection
  tracks: EnhancedCollectionTrack[]
  user: User
}

const CollectionTileComponent = ({
  collection,
  togglePlay,
  tracks,
  user,
  variant,
  ...lineupTileProps
}: CollectionTileProps) => {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const currentUserId = useSelector(getUserId)
  const currentTrack = useSelector((state: CommonState) => {
    const uid = getUid(state)
    return tracks.find((track) => track.uid === uid) ?? null
  })
  const isPlayingUid = useSelector((state: CommonState) => {
    const uid = getUid(state)
    return tracks.some((track) => track.uid === uid)
  })

  const {
    has_current_user_reposted,
    has_current_user_saved,
    is_album,
    playlist_id,
    playlist_name,
    playlist_owner_id,
    stream_conditions,
    is_private: isPrivate
  } = collection

  const hasPreview = isContentUSDCPurchaseGated(stream_conditions)

  const isOwner = playlist_owner_id === currentUserId

  const isCollectionMarkedForDownload = useSelector(
    getIsCollectionMarkedForDownload(playlist_id.toString())
  )

  const renderImage = useCallback(
    (props: ImageProps) => (
      <CollectionImage
        collectionId={playlist_id}
        size={SquareSizes.SIZE_150_BY_150}
        {...props}
      />
    ),
    [playlist_id]
  )

  const handlePress = useCallback(() => {
    if (!tracks.length) return

    setTimeout(() => {
      togglePlay({
        uid: currentTrack?.uid ?? tracks[0]?.uid ?? null,
        id: currentTrack?.track_id ?? tracks[0]?.track_id ?? null,
        source: PlaybackSource.PLAYLIST_TILE_TRACK
      })
    }, 100)
  }, [currentTrack, togglePlay, tracks])

  const handlePressTitle = useCallback(() => {
    navigation.push('Collection', { id: playlist_id })
  }, [playlist_id, navigation])

  const duration = useMemo(() => {
    return tracks.reduce(
      (duration: number, track: Track) => duration + track.duration,
      0
    )
  }, [tracks])

  const handlePressOverflow = useCallback(() => {
    if (playlist_id === undefined) {
      return
    }
    const overflowActions = [
      is_album
        ? OverflowAction.VIEW_ALBUM_PAGE
        : OverflowAction.VIEW_PLAYLIST_PAGE,
      isOwner ? OverflowAction.PUBLISH_PLAYLIST : null,
      isOwner
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
  }, [playlist_id, is_album, isOwner, dispatch])

  const handlePressShare = useCallback(() => {
    if (playlist_id === undefined) {
      return
    }
    dispatch(
      requestOpenShareModal({
        type: 'collection',
        collectionId: playlist_id,
        source: ShareSource.TILE
      })
    )
  }, [dispatch, playlist_id])

  const handlePressSave = useCallback(() => {
    if (playlist_id === undefined) {
      return
    }
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
        dispatch(unsaveCollection(playlist_id, FavoriteSource.TILE))
      }
    } else {
      dispatch(saveCollection(playlist_id, FavoriteSource.TILE))
    }
  }, [
    playlist_id,
    has_current_user_saved,
    dispatch,
    isCollectionMarkedForDownload
  ])

  const handlePressRepost = useCallback(() => {
    if (playlist_id === undefined) {
      return
    }
    if (has_current_user_reposted) {
      dispatch(undoRepostCollection(playlist_id, RepostSource.TILE))
    } else {
      dispatch(repostCollection(playlist_id, RepostSource.TILE))
    }
  }, [playlist_id, dispatch, has_current_user_reposted])

  return (
    <LineupTile
      {...lineupTileProps}
      duration={duration}
      id={playlist_id}
      renderImage={renderImage}
      isPlayingUid={isPlayingUid}
      onPress={handlePress}
      onPressOverflow={handlePressOverflow}
      onPressRepost={handlePressRepost}
      onPressSave={handlePressSave}
      onPressShare={handlePressShare}
      onPressTitle={handlePressTitle}
      hasPreview={hasPreview}
      title={playlist_name}
      item={collection}
      user={user}
      variant={variant}
      isUnlisted={isPrivate}
    >
      <CollectionTileTrackList
        tracks={tracks}
        onPress={handlePressTitle}
        isAlbum={is_album}
        trackCount={tracks.length}
      />
    </LineupTile>
  )
}
