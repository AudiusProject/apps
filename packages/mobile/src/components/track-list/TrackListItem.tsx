import type { ComponentType } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'

import {
  useCollection,
  useUser,
  useTrack,
  useCurrentUserId
} from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  type ID,
  type UID,
  type Track,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  mobileOverflowMenuUIActions,
  OverflowAction,
  OverflowSource,
  playerSelectors,
  playbackPositionSelectors
} from '@audius/common/store'
import {
  Genre,
  getNumericIdFromUid,
  removeNullable,
  Uid
} from '@audius/common/utils'
import type {
  NativeSyntheticEvent,
  NativeTouchEvent,
  TouchableOpacityProps
} from 'react-native'
import { Text, TouchableOpacity, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  IconButton,
  IconDrag,
  IconKebabHorizontal,
  IconLock,
  IconPlaybackPause,
  IconPlaybackPlay,
  useTheme,
  IconRemove,
  IconVisibilityHidden
} from '@audius/harmony-native'
import { flexRowCentered, font, makeStyles } from 'app/styles'

import { TrackDownloadStatusIndicator } from '../offline-downloads/TrackDownloadStatusIndicator'
import { UserLink } from '../user-link'

import { TrackArtwork } from './TrackArtwork'
const { open: openOverflowMenu } = mobileOverflowMenuUIActions

const { getPlaying, getUid } = playerSelectors
const { getTrackPosition } = playbackPositionSelectors

export type TrackItemAction = 'overflow' | 'remove'

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  trackContainer: {
    width: '100%',
    height: 72,
    backgroundColor: palette.white
  },
  trackContainerActive: {
    backgroundColor: palette.neutralLight9
  },
  trackContainerDisabled: {
    backgroundColor: palette.neutralLight9
  },
  trackInnerContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4)
  },
  nameArtistContainer: {
    flexShrink: 1,
    flexBasis: '100%',
    height: '100%',
    justifyContent: 'center'
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trackTitle: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    textAlignVertical: 'top'
  },
  trackTitleText: {
    ...font('demiBold'),
    lineHeight: 16,
    paddingTop: 2,
    color: palette.neutral
  },
  downloadIndicator: {
    marginLeft: spacing(1)
  },
  iconContainer: {
    marginLeft: spacing(2)
  },
  icon: { height: 24, width: 24 },
  removeIcon: { height: 24, width: 24 },

  dragIcon: {
    marginRight: spacing(4)
  },
  locked: {
    ...flexRowCentered(),
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(2),
    backgroundColor: palette.accentBlue,
    borderRadius: 80
  },
  lockedIcon: {
    fill: palette.white
  },
  lockedText: {
    marginLeft: spacing(0.5),
    fontFamily: typography.fontByWeight.demiBold,
    fontSize: typography.fontSize.xxs,
    color: palette.white
  },
  halfTransparent: {
    opacity: 0.5
  }
}))

const getMessages = ({ isDeleted = false }: { isDeleted?: boolean } = {}) => ({
  deleted: isDeleted ? ' [Deleted By Artist]' : '',
  locked: 'Locked',
  reorderLabel: 'Reorder Track',
  overflowLabel: 'More Options',
  deleteLabel: 'Delete Track'
})

export type TrackListItemProps = {
  onDrag?: () => void
  hideArt?: boolean
  id?: ID
  contextPlaylistId?: ID
  index: number
  isReorderable?: boolean
  showViewAlbum?: boolean
  onRemove?: (index: number) => void
  togglePlay?: (uid: string, trackId: ID) => void
  trackItemAction?: TrackItemAction
  uid?: UID
}

// Using `memo` because FlatList renders these items
// And we want to avoid a full render when the props haven't changed
export const TrackListItem = memo((props: TrackListItemProps) => {
  const { id, uid } = props

  const trackId = id || (uid ? (Uid.fromString(uid).id as ID) : undefined)
  const { data: track } = useTrack(trackId, {
    select: (track) => ({ owner_id: track.owner_id })
  })
  const user = useUser(track?.owner_id, { select: (user) => !!user })

  if (!track || !user) {
    console.warn('Track or user missing for TrackListItem, preventing render')
    return null
  }
  return <TrackListItemComponent {...props} />
})

type TrackListItemComponentProps = TrackListItemProps

const TrackListItemComponent = (props: TrackListItemComponentProps) => {
  const {
    id,
    contextPlaylistId,
    onDrag,
    hideArt,
    index,
    isReorderable = false,
    showViewAlbum = false,
    onRemove,
    togglePlay,
    trackItemAction,
    uid
  } = props

  const { data: contextPlaylist } = useCollection(contextPlaylistId)
  const trackId = id ?? (uid ? getNumericIdFromUid(uid) : undefined)
  const { data: track } = useTrack(trackId)
  const { data: user } = useUser(track?.owner_id, {
    select: (user) => ({
      user_id: user?.user_id,
      is_deactivated: user?.is_deactivated
    })
  })

  const {
    has_current_user_saved,
    has_current_user_reposted,
    is_delete,
    is_unlisted: isUnlisted,
    title,
    track_id,
    owner_id,
    ddex_app: ddexApp,
    stream_conditions: streamConditions,
    album_backlink
  } = track ?? {}
  const { is_deactivated, user_id } = user ?? {}

  const isDeleted = is_delete || !!is_deactivated

  const { isFetchingNFTAccess, hasStreamAccess } = useGatedContentAccess(track)
  const isLocked = !isFetchingNFTAccess && !hasStreamAccess

  const isActive = useSelector((state) => {
    const playingUid = getUid(state)
    return uid !== undefined && uid === playingUid
  })

  const isPlaying = useSelector((state) => {
    return isActive && getPlaying(state)
  })
  const isPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  // Unlike other gated tracks, USDC purchase gated tracks are playable because they have previews
  const isPlayable = !isDeleted && (!isLocked || isPurchaseGated)

  const messages = getMessages({ isDeleted })
  const styles = useStyles()
  const dispatch = useDispatch()
  const { spacing } = useTheme()
  const [titleWidth, setTitleWidth] = useState(0)

  const deletedTextWidth = useMemo(
    () => (messages.deleted.length ? 124 : 0),
    [messages]
  )
  const titleMaxWidth = useMemo(
    () =>
      titleWidth && deletedTextWidth ? titleWidth - deletedTextWidth : '100%',
    [deletedTextWidth, titleWidth]
  )

  const onPressTrack = () => {
    if (uid && track_id && isPlayable && togglePlay) {
      togglePlay(uid, track_id)
    }
  }

  const { data: currentUserId } = useCurrentUserId()
  const isTrackOwner = currentUserId && currentUserId === owner_id
  const isContextPlaylistOwner =
    currentUserId && contextPlaylist?.playlist_owner_id === currentUserId

  const isLongFormContent =
    track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
  const playbackPositionInfo = useSelector((state) =>
    getTrackPosition(state, { trackId: track_id, userId: currentUserId })
  )

  const handleOpenOverflowMenu = useCallback(() => {
    const overflowActions = [
      !isUnlisted || isTrackOwner ? OverflowAction.SHARE : null,
      !isTrackOwner && !isLocked && !isUnlisted
        ? has_current_user_saved
          ? OverflowAction.UNFAVORITE
          : OverflowAction.FAVORITE
        : null,
      !isTrackOwner && !isLocked && !isUnlisted
        ? has_current_user_reposted
          ? OverflowAction.UNREPOST
          : OverflowAction.REPOST
        : null,
      !isTrackOwner && isLocked && isPurchaseGated && !isDeleted
        ? OverflowAction.PURCHASE_TRACK
        : null,
      isTrackOwner && !ddexApp ? OverflowAction.ADD_TO_ALBUM : null,
      !isUnlisted || isTrackOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
      isLongFormContent
        ? OverflowAction.VIEW_EPISODE_PAGE
        : OverflowAction.VIEW_TRACK_PAGE,
      !showViewAlbum && album_backlink ? OverflowAction.VIEW_ALBUM_PAGE : null,
      isLongFormContent
        ? playbackPositionInfo?.status === 'COMPLETED'
          ? OverflowAction.MARK_AS_UNPLAYED
          : OverflowAction.MARK_AS_PLAYED
        : null,
      isTrackOwner && !ddexApp ? OverflowAction.EDIT_TRACK : null,
      !isTrackOwner ? OverflowAction.VIEW_ARTIST_PAGE : null,
      isContextPlaylistOwner ? OverflowAction.REMOVE_FROM_PLAYLIST : null
    ].filter(removeNullable)

    if (!track_id) {
      return
    }

    dispatch(
      openOverflowMenu({
        source: OverflowSource.TRACKS,
        id: track_id,
        contextPlaylistId,
        overflowActions
      })
    )
  }, [
    isTrackOwner,
    isLocked,
    isUnlisted,
    has_current_user_saved,
    has_current_user_reposted,
    isDeleted,
    ddexApp,
    isLongFormContent,
    showViewAlbum,
    album_backlink,
    playbackPositionInfo?.status,
    isContextPlaylistOwner,
    dispatch,
    track_id,
    contextPlaylistId,
    isPurchaseGated
  ])

  const handlePressOverflow = (e: NativeSyntheticEvent<NativeTouchEvent>) => {
    e.stopPropagation()
    handleOpenOverflowMenu()
  }

  const handlePressRemove = () => {
    onRemove?.(index)
  }

  const ListItemView = (
    isReorderable ? View : TouchableOpacity
  ) as ComponentType<TouchableOpacityProps>

  return (
    <View>
      <View
        style={[
          styles.trackContainer,
          isActive && styles.trackContainerActive,
          isDeleted && styles.trackContainerDisabled
        ]}
      >
        <ListItemView
          style={styles.trackInnerContainer}
          onPress={isReorderable || isLocked ? undefined : onPressTrack}
          disabled={!isPlayable}
        >
          {!hideArt ? (
            <TrackArtwork
              track={track as Track}
              isActive={isActive}
              isPlaying={isPlaying}
              isUnlisted={isUnlisted}
            />
          ) : isActive && isPlayable ? (
            <IconButton
              icon={isPlaying ? IconPlaybackPause : IconPlaybackPlay}
              onPress={onPressTrack}
              color='active'
              size='xl'
              style={{ marginRight: spacing.l }}
            />
          ) : null}
          {isReorderable ? (
            <IconButton
              icon={IconDrag}
              color='subdued'
              style={styles.dragIcon}
              onLongPress={onDrag}
              delayLongPress={100}
              aria-label={messages.reorderLabel}
            />
          ) : null}
          <View
            style={[
              styles.nameArtistContainer,
              isPlayable ? null : styles.halfTransparent
            ]}
          >
            <View
              style={styles.topLine}
              onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
            >
              <View style={styles.trackTitle}>
                <Text
                  numberOfLines={1}
                  style={[styles.trackTitleText, { maxWidth: titleMaxWidth }]}
                >
                  {title}
                </Text>
                <Text numberOfLines={1} style={[styles.trackTitleText]}>
                  {messages.deleted}
                </Text>
              </View>

              {!isDeleted && (
                <View style={styles.downloadIndicator}>
                  <TrackDownloadStatusIndicator trackId={track_id} size='s' />
                </View>
              )}
            </View>
            {user_id && <UserLink userId={user_id} size='s' disabled />}
          </View>
          {isUnlisted ? (
            <IconVisibilityHidden
              color='subdued'
              width={spacing.l}
              height={spacing.l}
            />
          ) : null}
          {!isDeleted && isLocked ? (
            <IconLock color='subdued' width={spacing.l} height={spacing.l} />
          ) : null}
          {trackItemAction === 'overflow' ? (
            <IconButton
              icon={IconKebabHorizontal}
              color='subdued'
              size='m'
              style={styles.iconContainer}
              onPress={handlePressOverflow}
              aria-label={messages.overflowLabel}
            />
          ) : null}
          {trackItemAction === 'remove' ? (
            <IconButton
              icon={IconRemove}
              color='danger'
              style={styles.iconContainer}
              aria-label={messages.deleteLabel}
              onPress={handlePressRemove}
            />
          ) : null}
        </ListItemView>
      </View>
    </View>
  )
}
