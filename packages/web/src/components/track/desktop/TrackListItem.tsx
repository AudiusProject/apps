import { memo, MouseEvent, useRef } from 'react'

import {
  CollectionTrackWithUid,
  useCurrentUserId,
  useUser
} from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  ID,
  isContentUSDCPurchaseGated,
  Track,
  UID
} from '@audius/common/models'
import { Genre, formatSeconds, route } from '@audius/common/utils'
import { IconKebabHorizontal } from '@audius/harmony'
import cn from 'classnames'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import Menu from 'components/menu/Menu'
import { OwnProps as TrackMenuProps } from 'components/menu/TrackMenu'
import Skeleton from 'components/skeleton/Skeleton'
import { TablePlayButton } from 'components/table/components/TablePlayButton'
import { isDescendantElementOf } from 'utils/domUtils'

import { TrackTileSize } from '../types'

import styles from './TrackListItem.module.css'
const { profilePage } = route

const makeStrings = ({ deleted }: { deleted: boolean }) => ({
  deleted: deleted ? ` [Deleted By Artist]` : '',
  by: 'by'
})

type TrackListItemProps = {
  index: number
  isLoading: boolean
  isAlbum: boolean
  active: boolean
  size: TrackTileSize
  disableActions: boolean
  playing: boolean
  togglePlay: (uid: UID, id: ID) => void
  goToRoute: (route: string) => void
  artistHandle: string
  forceSkeleton?: boolean
  isLastTrack?: boolean
  noShimmer?: boolean
} & ({ track?: CollectionTrackWithUid } | { isLoading: true }) // either a track must be passed or loading must be true

const TrackListItem = (props: TrackListItemProps) => {
  const {
    active,
    disableActions,
    playing,
    index,
    size,
    goToRoute,
    togglePlay,
    isLoading,
    isAlbum,
    isLastTrack,
    forceSkeleton = false,
    noShimmer = false
  } = props
  const track = 'track' in props ? props.track : null
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: currentUserId } = useCurrentUserId()
  const isOwner = track?.owner_id === currentUserId
  const isPrivate = track?.is_unlisted
  const isPremium = isContentUSDCPurchaseGated(track?.stream_conditions)
  const { hasStreamAccess } = useGatedContentAccess(track as Track)
  const { data: partialUser } = useUser(track?.owner_id, {
    select: (user) => ({
      is_deactivated: user?.is_deactivated,
      handle: user?.handle,
      name: user?.name,
      artist_pick_track_id: user?.artist_pick_track_id
    })
  })
  const {
    is_deactivated: isOwnerDeactivated = false,
    handle: userHandle,
    name: userName,
    artist_pick_track_id: artistPickTrackId
  } = partialUser ?? {}

  if (forceSkeleton) {
    return (
      <div
        className={cn(styles.playlistTrack, {
          [styles.large]: size === TrackTileSize.LARGE,
          [styles.small]: size === TrackTileSize.SMALL
        })}
      >
        <Skeleton
          className={styles.skeleton}
          width='96%'
          height='80%'
          noShimmer={noShimmer}
        />
      </div>
    )
  }

  if (!track) return null

  const deleted = track.is_delete || isOwnerDeactivated
  const strings = makeStrings({ deleted })

  const onClickArtistName = (e: MouseEvent) => {
    e.stopPropagation()
    if (goToRoute) goToRoute(profilePage(userHandle))
  }

  const onClickTrackName = (e: MouseEvent) => {
    if (!disableActions && !deleted) {
      e.stopPropagation()
      if (goToRoute) goToRoute(track.permalink)
    }
  }

  const onMoreClick = (triggerPopup: () => void) => (e: MouseEvent) => {
    triggerPopup()
  }

  const onPlayTrack = (e?: MouseEvent) => {
    e?.stopPropagation()
    // Skip toggle play if click event happened within track menu container
    // because clicking on it should not affect corresponding track.
    // We have to do this instead of stopping the event propagation
    // because we need it to bubble up to the document to allow
    // the document click listener to close other track/playlist tile menus
    // that are already open.
    const shouldSkipTogglePlay = isDescendantElementOf(
      e?.target,
      menuRef.current
    )
    if (!deleted && togglePlay && !shouldSkipTogglePlay)
      togglePlay(track.uid, track.track_id)
  }

  const hideShow = cn({
    [styles.hide]: isLoading,
    [styles.show]: !isLoading
  })

  const menu: Omit<TrackMenuProps, 'children'> = {
    handle: userHandle ?? '',
    includeAddToPlaylist: !isPrivate || isOwner,
    includeAddToAlbum: isOwner && !track?.ddex_app,
    includeArtistPick: false,
    includeEdit: false,
    includeFavorite: true,
    includeRepost: true,
    includeShare: false,
    includeTrackPage: true,
    isArtistPick: artistPickTrackId === track.track_id,
    isDeleted: deleted,
    isFavorited: track.has_current_user_saved,
    isOwner: false,
    isOwnerDeactivated,
    isReposted: track.has_current_user_reposted,
    trackId: track.track_id,
    trackTitle: track.title,
    genre: track.genre as Genre,
    trackPermalink: track.permalink,
    type: 'track'
  }

  return (
    <div
      className={cn(styles.playlistTrack, {
        [styles.large]: size === TrackTileSize.LARGE,
        [styles.small]: size === TrackTileSize.SMALL,
        [styles.deleted]: deleted,
        [styles.active]: active,
        [styles.disabled]: disableActions || deleted,
        [styles.noBorder]: isLoading,
        [styles.lastTrack]: isLastTrack
      })}
      onClick={onPlayTrack}
    >
      {isLoading && (
        <Skeleton
          className={styles.skeleton}
          width='96%'
          height='80%'
          noShimmer={noShimmer}
        />
      )}
      <div className={cn(styles.wrapper, hideShow)}>
        {deleted && size !== TrackTileSize.SMALL ? (
          <div className={styles.listButton} style={{ height: 24 }} />
        ) : null}
        {!disableActions && size !== TrackTileSize.SMALL && !deleted ? (
          <div className={styles.listButton}>
            <TablePlayButton
              playing={active}
              paused={!playing}
              hideDefault={false}
              isTrackPremium={isPremium}
              isLocked={!hasStreamAccess}
            />
          </div>
        ) : null}
        <div className={styles.trackNumber}>{index + 1}</div>
        <div className={styles.nameArtistContainer}>
          <div className={styles.trackTitle} onClick={onClickTrackName}>
            {track.title}
            {strings.deleted}
          </div>
          {!isAlbum ? (
            <div className={styles.artistName} onClick={onClickArtistName}>
              <div className={styles.by}>{strings.by}</div>
              {isOwnerDeactivated ? (
                `${userName} [Deactivated]`
              ) : (
                <ArtistPopover handle={userHandle}>{userName}</ArtistPopover>
              )}
            </div>
          ) : null}
        </div>
        <div className={styles.duration}>
          {track.duration && formatSeconds(track.duration)}
        </div>
        <Menu menu={menu}>
          {(ref, triggerPopup) => (
            <div className={cn(styles.menuContainer)} ref={menuRef}>
              {!disableActions && !deleted ? (
                <div ref={ref}>
                  <IconKebabHorizontal
                    color='subdued'
                    className={styles.iconKebabHorizontal}
                    onClick={onMoreClick(triggerPopup)}
                  />
                </div>
              ) : (
                <div className={styles.iconKebabHorizontal} />
              )}
            </div>
          )}
        </Menu>
      </div>
    </div>
  )
}

export default memo(TrackListItem)
