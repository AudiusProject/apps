import { useCallback, useMemo, useRef } from 'react'

import {
  useCollection,
  useCurrentUserId,
  useOrderedCollectionTracks,
  useUser
} from '@audius/common/api'
import type { CollectionTrack } from '@audius/common/api'
import { useGatedCollectionAccess } from '@audius/common/hooks'
import {
  ShareSource,
  RepostSource,
  FavoriteSource,
  PlaybackSource,
  SquareSizes
} from '@audius/common/models'
import {
  collectionsSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  OverflowAction,
  OverflowSource,
  playbackSelectors,
  PurchaseableContentType
} from '@audius/common/store'
import type { CommonState } from '@audius/common/store'
import { formatLineupTileDuration, removeNullable } from '@audius/common/utils'
import { TouchableOpacity, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  IconVolumeLevel2,
  Paper,
  Text,
  type ImageProps
} from '@audius/harmony-native'
import { UserLink } from 'app/components/user-link'
import { useNavigation } from 'app/hooks/useNavigation'
import { setVisibility } from 'app/store/drawers/slice'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { CollectionDogEar } from '../collection/CollectionDogEar'
import { CollectionImage } from '../image/CollectionImage'

import { CollectionTileStats } from './CollectionTileStats'
import { CollectionTileTrackList } from './CollectionTileTrackList'
import { LineupTileActionButtons } from './LineupTileActionButtons'
import { TilePressBlockContext } from './TilePressBlockContext'
import { LineupTileSource, type CollectionTileProps } from './types'

const { getTrackId, getPlaying } = playbackSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const {
  repostCollection,
  saveCollection,
  undoRepostCollection,
  unsaveCollection
} = collectionsSocialActions

const useStyles = makeStyles(({ spacing }) => ({
  metadata: {
    flexDirection: 'row',
    gap: spacing(2),
    width: '100%'
  },
  imageContainer: {
    marginTop: spacing(2),
    marginLeft: spacing(2)
  },
  image: {
    borderRadius: 4,
    height: 72,
    width: 72
  },
  titles: {
    flex: 1,
    alignItems: 'flex-start',
    marginTop: spacing(2),
    paddingRight: spacing(2),
    gap: spacing(1)
  },
  titleTouchable: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleText: {
    flexShrink: 1
  },
  playingIndicator: {
    marginLeft: 8
  },
  artistTouchable: {
    alignSelf: 'flex-start'
  },
  topRight: {
    marginTop: spacing(2),
    marginRight: spacing(2)
  }
}))

export const CollectionTile = (props: CollectionTileProps) => {
  const {
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
  const styles = useStyles()
  const { primary } = useThemeColors()
  const { data: currentUserId } = useCurrentUserId()

  // Mirror the web mobile CollectionTile path exactly: fetch the collection
  // by ID (no select), feed it to useOrderedCollectionTracks. Returns plain
  // CollectionTrack[] / TrackMetadata[] — no UID plumbing required.
  const { data: cachedCollection } = useCollection(id)
  const collection = collectionOverride ?? cachedCollection
  const collectionTracks = useOrderedCollectionTracks(cachedCollection)
  const tracks = tracksOverride ?? collectionTracks

  const { data: user } = useUser(collection?.playlist_owner_id, {
    select: (user) => ({
      user_id: user.user_id,
      is_deactivated: user.is_deactivated
    })
  })

  const { hasStreamAccess } = useGatedCollectionAccess(id)

  const currentTrack = useSelector((state: CommonState) => {
    const trackId = getTrackId(state)
    return tracks.find((track) => track.track_id === trackId) ?? null
  })

  // Title tints to the active/playing color whenever any track in this
  // collection is the one currently playing. Mirrors TrackTile's per-tile
  // highlight (LineupTileMetadata: `color={isActive ? 'primary' : 'neutral'}`)
  // and the per-row highlight in CollectionTileTrackList (each TrackItem
  // already runs its own `getTrackId(state) === trackId` selector and
  // applies `styles.active` / `palette.primary` to its title text).
  const isActive = currentTrack != null
  // True only while audio is actively playing (not paused) AND one of this
  // collection's tracks is the current track. Mirrors LineupTileMetadata's
  // `isPlaying` derivation — drives the speaker icon next to the title.
  const isPlaying = useSelector((state) => getPlaying(state) && isActive)

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
        size={SquareSizes.SIZE_480_BY_480}
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
      // Don't try to play a deleted-by-artist track. Pick the current
      // track (if it's one of ours and not deleted), else the first
      // non-deleted track in the collection. If everything is deleted,
      // the tile tap is a no-op.
      const startTrackId =
        currentTrack && !currentTrack.is_delete
          ? currentTrack.track_id
          : tracks.find((t) => !t.is_delete)?.track_id
      if (!startTrackId) return
      togglePlay({
        id: startTrackId,
        source: PlaybackSource.PLAYLIST_TILE_TRACK,
        collectionId: collection.playlist_id
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
      (duration: number, track: CollectionTrack) =>
        duration + (track.duration ?? 0),
      0
    )
  }, [tracks])

  // Use track_count if present on the collection (canonical full count);
  // fall back to the loaded tracks length. Drives the skeleton state on the
  // track list while tracks are still being fetched.
  const trackCount =
    collection?.track_count ??
    collection?.playlist_contents?.track_ids?.length ??
    tracks.length
  const tracksLoading = tracks.length === 0 && trackCount > 0

  const handlePressOverflow = useCallback(() => {
    if (!collection) return
    const isOwner = collection.playlist_owner_id === currentUserId

    const overflowActions = [
      OverflowAction.PLAY_COLLECTION_NEXT,
      OverflowAction.ADD_COLLECTION_TO_QUEUE,
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
    return null
  }

  if (collection.is_delete || user?.is_deactivated) {
    return null
  }

  const isOwner = collection.playlist_owner_id === currentUserId
  const isReadonly = variant === 'readonly'
  const contentType = collection.is_album ? 'album' : 'playlist'
  const durationText =
    duration > 0 ? formatLineupTileDuration(duration, false, true) : null

  return (
    <TilePressBlockContext.Provider value={handlePressWithPropagationBlock}>
      <Paper onPress={handlePress} style={style}>
        <CollectionDogEar collectionId={collection.playlist_id} hideUnlocked />

        {/* Compact header: small square artwork beside label + title + artist,
            with total duration in the top-right (mirrors web mobile) */}
        <View style={styles.metadata}>
          <View style={styles.imageContainer}>
            {renderImage({ style: styles.image })}
          </View>
          <Flex column style={styles.titles}>
            <Text
              variant='label'
              size='xs'
              textTransform='uppercase'
              color='subdued'
            >
              {contentType}
            </Text>
            <TouchableOpacity
              style={styles.titleTouchable}
              onPressIn={handlePressWithPropagationBlock}
              onPress={handlePressTitle}
            >
              <Text
                variant='title'
                color={isActive ? 'active' : 'default'}
                numberOfLines={1}
                style={styles.titleText}
              >
                {collection.playlist_name}
              </Text>
              {/* Speaker icon next to the title while one of this
                  collection's tracks is the currently-playing track and
                  the audio engine is actively playing (not paused). Same
                  icon + sizing TrackTile uses via LineupTileMetadata. */}
              {isPlaying ? (
                <IconVolumeLevel2
                  fill={primary}
                  size='m'
                  style={styles.playingIndicator}
                />
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              onPressIn={handlePressWithPropagationBlock}
              activeOpacity={0.7}
              style={styles.artistTouchable}
            >
              <View pointerEvents='none'>
                <UserLink textVariant='body' userId={user.user_id} />
              </View>
            </TouchableOpacity>
          </Flex>
          {durationText ? (
            <View style={styles.topRight}>
              <Text variant='body' size='xs' color='subdued'>
                {durationText}
              </Text>
            </View>
          ) : null}
        </View>

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
          trackCount={trackCount}
          isLoading={tracksLoading}
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
