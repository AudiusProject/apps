import { useCallback, useLayoutEffect } from 'react'

import { useCurrentUserId, useToggleFavoriteTrack } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  RepostSource,
  FavoriteSource,
  ModalSource
} from '@audius/common/models'
import type { Track } from '@audius/common/models'
import {
  castSelectors,
  castActions,
  reachabilitySelectors,
  tracksSocialActions,
  mobileOverflowMenuUIActions,
  OverflowAction,
  OverflowSource,
  usePremiumContentPurchaseModal,
  playbackPositionSelectors,
  PurchaseableContentType,
  playerActions,
  playerSelectors
} from '@audius/common/store'
import { Genre, removeNullable } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { View, Platform } from 'react-native'
import { CastButton, useDevices } from 'react-native-google-cast'
import { useDispatch, useSelector } from 'react-redux'

import {
  IconButton,
  IconCastAirplay,
  IconCastChromecast,
  IconKebabHorizontal,
  Button,
  IconMessage
} from '@audius/harmony-native'
import { useAirplay } from 'app/components/audio/Airplay'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { useCommentDrawer } from '../comments/CommentDrawerContext'

import { FavoriteButton } from './FavoriteButton'
import { RepostButton } from './RepostButton'

const { getUid } = playerSelectors
const { open: openOverflowMenu } = mobileOverflowMenuUIActions
const { repostTrack, undoRepostTrack } = tracksSocialActions
const { updateMethod } = castActions
const { getMethod: getCastMethod, getIsCasting } = castSelectors
const { getTrackPosition } = playbackPositionSelectors

const { getIsReachable } = reachabilitySelectors

const messages = {
  repostProhibited: "You can't Repost your own Track!",
  favoriteProhibited: "You can't Favorite your own Track!",
  castLabel: 'Cast to Device',
  shareLabel: 'Share Content',
  optionsLabel: 'More Options',
  price: (price: number) => `$${USDC(price / 100).toLocaleString()}`
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  container: {
    marginTop: spacing(10),
    height: spacing(12),
    flexDirection: 'row',
    gap: spacing(2)
  },
  actions: {
    borderRadius: 10,
    height: spacing(12),
    backgroundColor: palette.neutralLight8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexGrow: 1
  },
  button: {
    flexGrow: 1,
    alignItems: 'center'
  },
  buyButton: {
    backgroundColor: palette.specialLightGreen
  },
  animatedIcon: {
    width: spacing(7),
    height: spacing(7)
  },
  icon: {
    width: spacing(6),
    height: spacing(6)
  }
}))

type ActionsBarProps = {
  track: Nullable<Track>
}

export const ActionsBar = ({ track }: ActionsBarProps) => {
  const styles = useStyles()
  const { toast } = useToast()
  const castMethod = useSelector(getCastMethod)
  const isCasting = useSelector(getIsCasting)
  const { data: accountUserId } = useCurrentUserId()
  const { neutral, neutralLight6, primary } = useThemeColors()
  const dispatch = useDispatch()
  const isReachable = useSelector(getIsReachable)
  const navigation = useNavigation()

  const { open } = useCommentDrawer()
  const isOwner = track?.owner_id === accountUserId

  const isUnlisted = track?.is_unlisted
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const uid = useSelector(getUid)

  const handlePurchasePress = useCallback(() => {
    if (track?.track_id) {
      openPremiumContentPurchaseModal(
        {
          contentId: track.track_id,
          contentType: PurchaseableContentType.TRACK
        },
        { source: ModalSource.NowPlaying }
      )
    }
  }, [track?.track_id, openPremiumContentPurchaseModal])
  const { hasStreamAccess } = useGatedContentAccess(track)
  const shouldShowPurchasePill =
    track?.stream_conditions &&
    'usdc_purchase' in track.stream_conditions &&
    !hasStreamAccess
  const shouldShowActions = hasStreamAccess && !isUnlisted

  useLayoutEffect(() => {
    if (Platform.OS === 'android' && castMethod === 'airplay') {
      dispatch(updateMethod({ method: 'chromecast' }))
    }
  }, [castMethod, dispatch])

  const handleFavorite = useToggleFavoriteTrack({
    trackId: track?.track_id,
    source: FavoriteSource.NOW_PLAYING
  })

  const handleRepost = useCallback(() => {
    if (track) {
      if (track.has_current_user_reposted) {
        dispatch(undoRepostTrack(track.track_id, RepostSource.NOW_PLAYING))
      } else if (isOwner) {
        toast({ content: messages.repostProhibited })
      } else {
        dispatch(repostTrack(track.track_id, RepostSource.NOW_PLAYING))
      }
    }
  }, [dispatch, isOwner, toast, track])

  const handleComments = useCallback(() => {
    if (track) {
      open({
        entityId: track.track_id,
        navigation,
        actions: playerActions,
        uid: uid as string
      })
    }
  }, [uid, navigation, open, track])

  const playbackPositionInfo = useSelector((state) =>
    getTrackPosition(state, {
      trackId: track?.track_id,
      userId: accountUserId
    })
  )
  const onPressOverflow = useCallback(() => {
    if (track) {
      const isLongFormContent =
        track.genre === Genre.PODCASTS || track.genre === Genre.AUDIOBOOKS
      const overflowActions = [
        OverflowAction.VIEW_COMMENTS,
        OverflowAction.SHARE,
        isOwner && !track?.ddex_app ? OverflowAction.ADD_TO_ALBUM : null,
        !isUnlisted || isOwner ? OverflowAction.ADD_TO_PLAYLIST : null,
        isLongFormContent
          ? OverflowAction.VIEW_EPISODE_PAGE
          : OverflowAction.VIEW_TRACK_PAGE,
        track.album_backlink ? OverflowAction.VIEW_ALBUM_PAGE : null,
        isLongFormContent
          ? playbackPositionInfo?.status === 'COMPLETED'
            ? OverflowAction.MARK_AS_UNPLAYED
            : OverflowAction.MARK_AS_PLAYED
          : null,
        OverflowAction.VIEW_ARTIST_PAGE
      ].filter(removeNullable)

      dispatch(
        openOverflowMenu({
          source: OverflowSource.TRACKS,
          id: track.track_id,
          overflowActions
        })
      )
    }
  }, [track, isOwner, isUnlisted, playbackPositionInfo?.status, dispatch])

  const { openAirplayDialog } = useAirplay()
  const castDevices = useDevices()

  const renderPurchaseButton = () => {
    if (
      track?.stream_conditions &&
      'usdc_purchase' in track.stream_conditions
    ) {
      const price = track.stream_conditions.usdc_purchase.price
      return (
        <Button
          color='lightGreen'
          style={styles.buyButton}
          onPress={handlePurchasePress}
        >
          {messages.price(price)}
        </Button>
      )
    }
  }

  const renderCastButton = () => {
    if (castMethod === 'airplay') {
      return (
        <IconButton
          onPress={openAirplayDialog}
          icon={IconCastAirplay}
          color={isCasting ? 'active' : 'default'}
          size='l'
          aria-label={messages.castLabel}
          style={styles.button}
        />
      )
    }
    return isReachable && castDevices.length > 0 ? (
      <CastButton
        style={{
          ...styles.button,
          ...styles.icon,
          tintColor: isCasting ? primary : neutral
        }}
      />
    ) : (
      <View style={{ ...styles.button, width: 24 }}>
        <IconCastChromecast fill={neutralLight6} height={24} width={24} />
      </View>
    )
  }

  const renderRepostButton = () => {
    return (
      <RepostButton
        iconIndex={track?.has_current_user_reposted ? 1 : 0}
        onPress={handleRepost}
        style={styles.button}
        wrapperStyle={styles.animatedIcon}
        isDisabled={!isReachable}
        isOwner={track?.owner_id === accountUserId}
      />
    )
  }

  const renderFavoriteButton = () => {
    return (
      <FavoriteButton
        iconIndex={track?.has_current_user_saved ? 1 : 0}
        onPress={handleFavorite}
        style={styles.button}
        wrapperStyle={styles.animatedIcon}
        isOwner={track?.owner_id === accountUserId}
      />
    )
  }

  const renderCommentsButton = () => {
    return (
      <IconButton
        icon={IconMessage}
        onPress={handleComments}
        size='l'
        aria-label={messages.shareLabel}
        style={styles.button}
      />
    )
  }

  const renderOptionsButton = () => {
    return (
      <IconButton
        icon={IconKebabHorizontal}
        onPress={onPressOverflow}
        size='l'
        disabled={!isReachable}
        aria-label={messages.optionsLabel}
        style={styles.button}
      />
    )
  }

  return (
    <View style={styles.container}>
      {shouldShowPurchasePill ? renderPurchaseButton() : null}
      <View style={styles.actions}>
        {renderCastButton()}
        {shouldShowActions ? renderRepostButton() : null}
        {shouldShowActions ? renderFavoriteButton() : null}
        {shouldShowActions ? renderCommentsButton() : null}
        {renderOptionsButton()}
      </View>
    </View>
  )
}
