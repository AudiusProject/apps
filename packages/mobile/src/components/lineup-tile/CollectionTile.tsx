import { useCallback, useMemo, useRef } from 'react'

import { useCollection, useCurrentUserId, useUser } from '@audius/common/api'
import { useGatedCollectionAccess } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  SquareSizes
} from '@audius/common/models'
import type { Track } from '@audius/common/models'
import {
  collectionsSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  playerSelectors,
  PurchaseableContentType
} from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { Paper, type ImageProps } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { setVisibility } from 'app/store/drawers/slice'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'

import { CollectionDogEar } from '../collection/CollectionDogEar'
import { CollectionImage } from '../image/CollectionImage'

import { CollectionTileStats } from './CollectionTileStats'
import { CollectionTileTrackList } from './CollectionTileTrackList'
import { LineupTileActionButtons } from './LineupTileActionButtons'
import { LineupTileMetadata } from './LineupTileMetadata'
import { TilePressBlockContext } from './TilePressBlockContext'
import { LineupTileSource, type CollectionTileProps } from './types'
import { useEnhancedCollectionTracks } from './useEnhancedCollectionTracks'

const { getUid } = playerSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const {
  repostCollection,
  saveCollection,
  undoRepostCollection,
  unsaveCollection
} = collectionsSocialActions

export const CollectionTile = (props: CollectionTileProps) => {
  const {
    uid,
    id,
    collection: collectionOverride,
    tracks: tracksOverride,
    source = LineupTileSource.LINEUP_COLLECTION,
    togglePlay,
    variant,
    style,
    ...lineupTileProps
  } = props

  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { data: currentUserId } = useCurrentUserId()

  const { data: cachedCollection } = useCollection(id, {
    select: (collection) => ({
      has_current_user_reposted: collection.has_current_user_reposted,
      has_current_user_saved: collection.has_current_user_saved,
      is_album: collection.is_album,
      playlist_id: collection.playlist_id,
      playlist_name: collection.playlist_name,
      playlist_owner_id: collection.playlist_owner_id,
      stream_conditions: collection.stream_conditions,
      is_private: collection.is_private,
      is_delete: collection.is_delete,
      playlist_contents: collection.playlist_contents
    })
  })
  const collection = collectionOverride ?? cachedCollection
  const collectionTracks = useEnhancedCollectionTracks(uid)
  const tracks = tracksOverride ?? collectionTracks

  const { data: user } = useUser(collection?.playlist_owner_id, {
    select: (user) => ({
      user_id: user.user_id,
      is_deactivated: user.is_deactivated
    })
  })

  const { hasStreamAccess } = useGatedCollectionAccess(id)

  const currentTrack = useSelector((state: CommonState) => {
    const uid = getUid(state)
    return tracks.find((track) => track.uid === uid) ?? null
  })
  const isPlayingUid = useSelector((state: CommonState) => {
    const uid = getUid(state)
    return tracks.some((track) => track.uid === uid)
  })

  const isCollectionMarkedForDownload = useSelector((state) =>
    collection
      ? getIsCollectionMarkedForDownload(collection.playlist_id.toString())(
          state
        )
      : false
  )

  const renderImage = useCallback(
    (props: ImageProps) => (
      <CollectionImage
        collectionId={collection?.playlist_id ?? 0}
        size={SquareSizes.SIZE_150_BY_150}
        {...props}
      />
    ),
    [collection?.playlist_id]
  )

  const childPressedRef = useRef(false)

  const handlePress = useCallback(() => {
    if (!tracks.length || !collection) return

    setTimeout(() => {
      if (childPressedRef.current) {
        childPressedRef.current = false
        return
      }
      togglePlay({
        uid: currentTrack?.uid ?? tracks[0]?.uid ?? null,
        id: currentTrack?.track_id ?? tracks[0]?.track_id ?? null,
        source: PlaybackSource.PLAYLIST_TILE_TRACK
      })
    }, 100)
  }, [currentTrack, togglePlay, tracks, collection])

  const handlePressWithPropagationBlock = useCallback(() => {
    childPressedRef.current = true
  }, [])

  const handlePressTitle = useCallback(() => {
    if (!collection) return
    navigation.push('Collection', { id: collection.playlist_id })
  }, [collection, navigation])

  const duration = useMemo(() => {
    return tracks.reduce(
      (duration: number, track: Track) => duration + track.duration,
      0
    )
  }, [tracks])

  const handlePressOverflow = useCallback(() => {
    if (!collection) return
    const isOwner = collection.playlist_owner_id === currentUserId

    const overflowActions = [
      collection.is_album
        ? OverflowAction.VIEW_ALBUM_PAGE
        : OverflowAction.VIEW_PLAYLIST_PAGE,
      isOwner ? OverflowAction.PUBLISH_PLAYLIST : null,
      isOwner
        ? collection.is_album
          ? OverflowAction.DELETE_ALBUM
          : OverflowAction.DELETE_PLAYLIST
        : null,
      OverflowAction.VIEW_ARTIST_PAGE
    ].filter(removeNullable)

    dispatch(
      openOverflowMenu({
        source: OverflowSource.COLLECTIONS,
        id: collection.playlist_id,
        overflowActions
      })
    )
  }, [collection, currentUserId, dispatch])

  const handlePressShare = useCallback(() => {
    if (!collection) return
    dispatch(
      requestOpenShareModal({
        type: 'collection',
        collectionId: collection.playlist_id,
        source: ShareSource.TILE
      })
    )
  }, [dispatch, collection])

  const handlePressSave = useCallback(() => {
    if (!collection) return

    if (collection.has_current_user_saved) {
      if (isCollectionMarkedForDownload) {
        dispatch(
          setVisibility({
            drawer: 'UnfavoriteDownloadedCollection',
            visible: true,
            data: { collectionId: collection.playlist_id }
          })
        )
      } else {
        dispatch(unsaveCollection(collection.playlist_id, FavoriteSource.TILE))
      }
    } else {
      dispatch(saveCollection(collection.playlist_id, FavoriteSource.TILE))
    }
  }, [collection, dispatch, isCollectionMarkedForDownload])

  const handlePressRepost = useCallback(() => {
    if (!collection) return
    if (collection.has_current_user_reposted) {
      dispatch(undoRepostCollection(collection.playlist_id, RepostSource.TILE))
    } else {
      dispatch(repostCollection(collection.playlist_id, RepostSource.TILE))
    }
  }, [collection, dispatch])

  if (!collection || !tracks || !user) {
    console.warn(
      'Collection, tracks, or user missing for CollectionTile, preventing render'
    )
    return null
  }

  if (collection.is_delete || user?.is_deactivated) {
    return null
  }

  const isOwner = collection.playlist_owner_id === currentUserId
  const isReadonly = variant === 'readonly'
  const contentType = collection.is_album ? 'album' : 'playlist'

  return (
    <TilePressBlockContext.Provider value={handlePressWithPropagationBlock}>
      <Paper onPress={handlePress} style={style}>
        <CollectionDogEar collectionId={collection.playlist_id} hideUnlocked />
        <LineupTileMetadata
          renderImage={renderImage}
          onPressTitle={handlePressTitle}
          onPressWithPropagationBlock={handlePressWithPropagationBlock}
          title={collection.playlist_name}
          userId={user.user_id}
          isPlayingUid={isPlayingUid}
          type={contentType}
          trackId={collection.playlist_id}
          duration={duration}
          isLongFormContent={false}
        />
        <CollectionTileStats
          collectionId={collection.playlist_id}
          rankIndex={lineupTileProps.index}
          isTrending={lineupTileProps.isTrending}
        />
        <CollectionTileTrackList
          tracks={tracks}
          onPress={handlePressTitle}
          onPressWithPropagationBlock={handlePressWithPropagationBlock}
          isAlbum={collection.is_album}
          trackCount={tracks.length}
        />
        {isReadonly ? null : (
          <LineupTileActionButtons
            hasReposted={collection.has_current_user_reposted}
            hasSaved={collection.has_current_user_saved}
            isOwner={isOwner}
            isShareHidden={false}
            isUnlisted={collection.is_private}
            readonly={isReadonly}
            contentId={collection.playlist_id}
            contentType={
              collection.is_album ? PurchaseableContentType.ALBUM : undefined
            }
            streamConditions={collection.stream_conditions}
            hasStreamAccess={hasStreamAccess}
            source={source}
            onPressOverflow={handlePressOverflow}
            onPressRepost={handlePressRepost}
            onPressSave={handlePressSave}
            onPressShare={handlePressShare}
          />
        )}
      </Paper>
    </TilePressBlockContext.Provider>
  )
}
