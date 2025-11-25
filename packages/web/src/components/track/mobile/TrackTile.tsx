import { useCallback, useEffect } from 'react'

import {
  useToggleFavoriteTrack,
  useCurrentUserId,
  useTrack,
  useUser
} from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  ModalSource,
  isContentUSDCPurchaseGated,
  ID,
  FavoriteSource,
  ShareSource,
  RepostSource
} from '@audius/common/models'
import {
  usePremiumContentPurchaseModal,
  gatedContentActions,
  gatedContentSelectors,
  PurchaseableContentType,
  tracksSocialActions,
  mobileOverflowMenuUIActions,
  shareModalUIActions,
  themeSelectors,
  OverflowAction,
  OverflowSource,
  playerSelectors
} from '@audius/common/store'
import { Genre, formatLineupTileDuration } from '@audius/common/utils'
import {
  IconVolumeLevel2 as IconVolume,
  Text,
  Flex,
  Box,
  IconButton,
  IconKebabHorizontal,
  IconPin,
  IconText
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { TextLink, UserLink } from 'components/link'
import Menu from 'components/menu/Menu'
import { OwnProps as TrackMenuProps } from 'components/menu/TrackMenu'
import Skeleton from 'components/skeleton/Skeleton'
import { TrackTileProps, TrackTileSize } from 'components/track/types'
import { AppState } from 'store/types'
import { isMatrix, shouldShowDark } from 'utils/theme/theme'

import { TrackDogEar } from '../TrackDogEar'
import { TrackTileStats } from '../TrackTileStats'
import { getTrackWithFallback, getUserWithFallback } from '../helpers'
import { messages } from '../trackTileMessages'

import BottomButtons from './BottomButtons'
import styles from './TrackTile.module.css'
import TrackTileArt from './TrackTileArt'

const { setLockedContentId } = gatedContentActions
const { getGatedContentStatusMap } = gatedContentSelectors
const { getUid, getPlaying, getBuffering } = playerSelectors
const { getTheme } = themeSelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { open } = mobileOverflowMenuUIActions
const { repostTrack, undoRepostTrack } = tracksSocialActions

type ConnectedTrackTileProps = Omit<
  TrackTileProps,
  | 'title'
  | 'userId'
  | 'genre'
  | 'duration'
  | 'artistName'
  | 'artistHandle'
  | 'repostCount'
  | 'saveCount'
  | 'commentCount'
  | 'followeeReposts'
  | 'followeeSaves'
  | 'hasCurrentUserReposted'
  | 'hasCurrentUserSaved'
  | 'artistIsVerified'
  | 'isPlaying'
>

export const TrackTile = ({
  uid,
  id,
  index,
  size,
  ordered,
  trackTileStyles,
  togglePlay,
  isLoading,
  hasLoaded,
  isTrending,
  isActive,
  variant,
  containerClassName,
  isFeed = false,
  source,
  noShimmer
}: ConnectedTrackTileProps) => {
  const dispatch = useDispatch()

  const { data: track } = useTrack(id)
  const { data: partialUser } = useUser(track?.owner_id, {
    select: (user) => ({
      user_id: user?.user_id,
      handle: user?.handle,
      name: user?.name,
      is_verified: user?.is_verified,
      is_deactivated: user?.is_deactivated,
      artist_pick_track_id: user?.artist_pick_track_id
    })
  })
  const { user_id, handle, name, is_deactivated } =
    getUserWithFallback(partialUser) ?? {}
  const playingUid = useSelector(getUid)
  const isBuffering = useSelector(getBuffering)
  const isPlaying = useSelector(getPlaying)
  const { data: currentUserId } = useCurrentUserId()
  const darkMode = useSelector((state: AppState) =>
    shouldShowDark(getTheme(state))
  )

  const handleRepostTrack = useCallback(
    (trackId: ID, isFeed: boolean) => {
      dispatch(repostTrack(trackId, RepostSource.TILE, isFeed))
    },
    [dispatch]
  )

  const handleUnrepostTrack = useCallback(
    (trackId: ID) => {
      dispatch(undoRepostTrack(trackId, RepostSource.TILE))
    },
    [dispatch]
  )

  const clickOverflow = useCallback(
    (trackId: ID, overflowActions: OverflowAction[]) => {
      dispatch(
        open({ source: OverflowSource.TRACKS, id: trackId, overflowActions })
      )
    },
    [dispatch]
  )

  const trackWithFallback = getTrackWithFallback(track)
  const {
    is_delete,
    is_unlisted,
    is_stream_gated: isStreamGated,
    stream_conditions: streamConditions,
    track_id,
    title,
    genre,
    permalink,
    has_current_user_reposted,
    has_current_user_saved,
    _co_sign,
    duration,
    preview_cid,
    ddex_app: ddexApp,
    album_backlink
  } = trackWithFallback

  const isOwner = user_id === currentUserId
  const isArtistPick = partialUser?.artist_pick_track_id === track_id

  const { isFetchingNFTAccess, hasStreamAccess } =
    useGatedContentAccess(trackWithFallback)
  const loading = isLoading || isFetchingNFTAccess

  const toggleRepost = useCallback(
    (trackId: ID) => {
      if (has_current_user_reposted) {
        handleUnrepostTrack(trackId)
      } else {
        handleRepostTrack(trackId, isFeed)
      }
    },
    [has_current_user_reposted, handleUnrepostTrack, handleRepostTrack, isFeed]
  )

  // We wanted to use mobile track tile on desktop, which means shimming in the desktop overflow
  // menu whenever isMobile is false.
  const renderOverflowMenu = () => {
    const menu: Omit<TrackMenuProps, 'children'> = {
      extraMenuItems: [],
      handle,
      includeAddToPlaylist: !is_unlisted || isOwner,
      includeAddToAlbum: isOwner && !ddexApp,
      includeArtistPick: isOwner,
      includeEdit: isOwner,
      ddexApp: track?.ddex_app,
      includeEmbed: !(is_unlisted || isStreamGated),
      includeFavorite: hasStreamAccess,
      includeRepost: hasStreamAccess,
      includeShare: true,
      includeTrackPage: true,
      isDeleted: is_delete || is_deactivated,
      isFavorited: has_current_user_saved,
      isOwner,
      isReposted: has_current_user_reposted,
      isUnlisted: is_unlisted,
      trackId: track_id,
      trackTitle: title,
      genre: genre as Genre,
      trackPermalink: permalink,
      type: 'track'
    }

    return (
      <Menu menu={menu}>
        {(ref, triggerPopup) => (
          <Box>
            <IconButton
              ref={ref}
              icon={IconKebabHorizontal}
              onClick={(e) => {
                e.stopPropagation()
                triggerPopup()
              }}
              aria-label='More'
              color='subdued'
            />
          </Box>
        )}
      </Menu>
    )
  }

  const onClickOverflow = useCallback(
    (trackId: ID) => {
      const isLongFormContent =
        genre === Genre.PODCASTS || genre === Genre.AUDIOBOOKS

      const repostAction =
        !isOwner && hasStreamAccess
          ? has_current_user_reposted
            ? OverflowAction.UNREPOST
            : OverflowAction.REPOST
          : null
      const favoriteAction =
        !isOwner && hasStreamAccess
          ? has_current_user_saved
            ? OverflowAction.UNFAVORITE
            : OverflowAction.FAVORITE
          : null
      const addToAlbumAction =
        isOwner && !ddexApp ? OverflowAction.ADD_TO_ALBUM : null
      const overflowActions = [
        repostAction,
        favoriteAction,
        addToAlbumAction,
        !is_unlisted || isOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
        isLongFormContent
          ? OverflowAction.VIEW_EPISODE_PAGE
          : OverflowAction.VIEW_TRACK_PAGE,
        album_backlink ? OverflowAction.VIEW_ALBUM_PAGE : null,
        OverflowAction.VIEW_ARTIST_PAGE
      ].filter(Boolean) as OverflowAction[]

      clickOverflow(trackId, overflowActions)
    },
    [
      genre,
      isOwner,
      hasStreamAccess,
      has_current_user_reposted,
      has_current_user_saved,
      ddexApp,
      is_unlisted,
      album_backlink,
      clickOverflow
    ]
  )

  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId: id as number,
    source: FavoriteSource.TILE
  })

  const [, setModalVisibility] = useModalState('LockedContent')
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
  const trackId = isStreamGated ? id : null
  const gatedTrackStatus = trackId ? gatedTrackStatusMap[trackId] : undefined
  const isPurchase = isContentUSDCPurchaseGated(streamConditions)

  const onToggleRepost = useCallback(() => toggleRepost(id), [toggleRepost, id])

  const onClickShare = useCallback(() => {
    if (!trackId) return
    dispatch(
      requestOpenShareModal({
        type: 'track',
        trackId,
        source: ShareSource.TILE
      })
    )
  }, [dispatch, trackId])

  const onClickOverflowMenu = useCallback(
    () => onClickOverflow && onClickOverflow(id),
    [onClickOverflow, id]
  )

  const openLockedContentModal = useCallback(() => {
    if (trackId) {
      dispatch(setLockedContentId({ id: trackId }))
      setModalVisibility(true)
    }
  }, [trackId, dispatch, setModalVisibility])

  const onClickPill = useCallback(() => {
    if (isPurchase && trackId) {
      openPremiumContentPurchaseModal(
        { contentId: trackId, contentType: PurchaseableContentType.TRACK },
        { source: source ?? ModalSource.TrackTile }
      )
    } else if (trackId && !hasStreamAccess) {
      openLockedContentModal()
    }
  }, [
    isPurchase,
    trackId,
    hasStreamAccess,
    openPremiumContentPurchaseModal,
    source,
    openLockedContentModal
  ])

  useEffect(() => {
    if (!loading) {
      hasLoaded?.(index)
    }
  }, [hasLoaded, index, loading])

  const fadeIn = {
    [styles.show]: !loading,
    [styles.hide]: loading
  }

  const handleClick = useCallback(() => {
    if (loading) return

    if (trackId && !hasStreamAccess && !preview_cid) {
      openLockedContentModal()
      return
    }

    togglePlay(uid, id)
  }, [
    loading,
    togglePlay,
    uid,
    id,
    trackId,
    hasStreamAccess,
    preview_cid,
    openLockedContentModal
  ])

  const isReadonly = variant === 'readonly'

  if (is_delete || is_deactivated) return null

  return (
    <div
      className={cn(
        styles.container,
        { [styles.readonly]: isReadonly },
        containerClassName
      )}
      css={{ width: '100%' }}
    >
      <TrackDogEar trackId={track_id} hideUnlocked />
      <div className={styles.mainContent} onClick={handleClick}>
        <div className={cn(styles.topRight, styles.statText)}>
          <Flex
            gap='s'
            alignItems='center'
            className={cn(styles.duration, fadeIn)}
          >
            {isArtistPick ? (
              <IconText icons={[{ icon: IconPin }]}>
                {messages.artistPick}
              </IconText>
            ) : null}
            {duration
              ? formatLineupTileDuration(
                  duration,
                  genre === Genre.PODCASTS || genre === Genre.AUDIOBOOKS
                )
              : null}
          </Flex>
        </div>
        <div className={styles.metadata}>
          <TrackTileArt
            id={track_id}
            isTrack
            isPlaying={uid === playingUid && isPlaying}
            isBuffering={isBuffering}
            showSkeleton={loading}
            noShimmer={noShimmer}
            coSign={_co_sign}
            className={styles.albumArtContainer}
            label={`${title} by ${name}`}
            artworkIconClassName={styles.artworkIcon}
          />
          <Flex
            direction='column'
            gap='xs'
            pv='xs'
            mr='m'
            flex='0 1 65%'
            css={{ overflow: 'hidden' }}
          >
            <TextLink
              to={permalink}
              textVariant='title'
              isActive={uid === playingUid || isActive}
              applyHoverStylesToInnerSvg
            >
              <Text ellipses>{title || messages.loading}</Text>
              {uid === playingUid && isPlaying ? <IconVolume size='m' /> : null}
              {loading ? (
                <Skeleton
                  className={styles.skeleton}
                  height='20px'
                  noShimmer={noShimmer}
                />
              ) : null}
            </TextLink>
            <UserLink
              userId={user_id}
              badgeSize='xs'
              css={{ marginTop: '-4px' }}
            >
              {loading ? (
                <>
                  <Text>{messages.loading}</Text>
                  <Skeleton
                    className={styles.skeleton}
                    height='20px'
                    noShimmer={noShimmer}
                  />
                </>
              ) : null}
            </UserLink>
          </Flex>
        </div>
        <TrackTileStats
          trackId={track_id}
          isTrending={isTrending}
          rankIndex={index}
          size={TrackTileSize.SMALL}
          isLoading={loading}
          noShimmer={noShimmer}
        />
        {isReadonly ? null : (
          <BottomButtons
            hasSaved={has_current_user_saved}
            hasReposted={has_current_user_reposted}
            toggleRepost={onToggleRepost}
            toggleSave={toggleSaveTrack}
            onShare={onClickShare}
            onClickOverflow={onClickOverflowMenu}
            renderOverflow={renderOverflowMenu}
            onClickGatedUnlockPill={onClickPill}
            isOwner={isOwner}
            readonly={isReadonly}
            isLoading={loading}
            isUnlisted={is_unlisted}
            hasStreamAccess={hasStreamAccess}
            streamConditions={streamConditions}
            gatedTrackStatus={gatedTrackStatus}
            isDarkMode={darkMode}
            isMatrixMode={isMatrix()}
            isTrack
            contentId={track_id}
            contentType='track'
          />
        )}
      </div>
    </div>
  )
}
