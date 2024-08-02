import { useCallback } from 'react'

import { isContentUSDCPurchaseGated } from '@audius/common/models'
import type { FavoriteType, ID, AccessConditions } from '@audius/common/models'
import {
  repostsUserListActions,
  favoritesUserListActions,
  PurchaseableContentType
} from '@audius/common/store'
import type { RepostType } from '@audius/common/store'
import { formatCount, formatReleaseDate } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import moment from 'moment'
import { View, TouchableOpacity } from 'react-native'
import { useDispatch } from 'react-redux'

import {
  IconCalendarMonth,
  IconHeart,
  IconVisibilityHidden,
  IconRepost,
  IconStar
} from '@audius/harmony-native'
import { LockedStatusBadge, Text } from 'app/components/core'
import { CollectionDownloadStatusIndicator } from 'app/components/offline-downloads/CollectionDownloadStatusIndicator'
import { TrackDownloadStatusIndicator } from 'app/components/offline-downloads/TrackDownloadStatusIndicator'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles, flexRowCentered } from 'app/styles'

import { GatedTrackLabel } from './GatedTrackLabel'
import { LineupTileAccessStatus } from './LineupTileAccessStatus'
import { LineupTileGatedContentLabel } from './LineupTileGatedContentLabel'
import { LineupTileLabel } from './LineupTileLabel'
import { LineupTileRankIcon } from './LineupTileRankIcon'
import { useStyles as useTrackTileStyles } from './styles'
import type { LineupItemVariant, LineupTileSource } from './types'
const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

const formatPlayCount = (playCount?: number) => {
  if (!playCount) {
    return null
  }
  const suffix = playCount === 1 ? 'Play' : 'Plays'
  return `${formatCount(playCount)} ${suffix}`
}

const messages = {
  artistPick: 'Artist Pick',
  hidden: 'Hidden',
  releases: (date: string) =>
    `Releases ${formatReleaseDate({
      date,
      withHour: true
    })}`
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing(2),
    marginHorizontal: spacing(2.5),
    justifyContent: 'space-between'
  },
  stats: {
    flexDirection: 'row',
    gap: spacing(4)
  },
  listenCount: {
    ...flexRowCentered(),
    justifyContent: 'center'
  },
  leftStats: {
    ...flexRowCentered(),
    gap: spacing(4),
    minHeight: spacing(4)
  },
  statItem: {
    gap: spacing(1)
  },
  disabledStatItem: {
    opacity: 0.5
  }
}))

type Props = {
  favoriteType: FavoriteType
  repostType: RepostType
  hidePlays?: boolean
  id: ID
  index: number
  isCollection?: boolean
  isTrending?: boolean
  variant?: LineupItemVariant
  isUnlisted?: boolean
  playCount?: number
  repostCount: number
  saveCount: number
  showRankIcon?: boolean
  hasStreamAccess?: boolean
  streamConditions: Nullable<AccessConditions>
  isOwner: boolean
  isArtistPick?: boolean
  showArtistPick?: boolean
  releaseDate?: string
  source?: LineupTileSource
  type: 'track' | 'album' | 'playlist'
}

export const LineupTileStats = ({
  favoriteType,
  repostType,
  hidePlays,
  id,
  index,
  isCollection,
  isTrending,
  variant,
  isUnlisted,
  playCount,
  repostCount,
  saveCount,
  showRankIcon,
  hasStreamAccess,
  streamConditions,
  isOwner,
  isArtistPick,
  showArtistPick,
  releaseDate,
  source,
  type
}: Props) => {
  const styles = useStyles()
  const trackTileStyles = useTrackTileStyles()
  const dispatch = useDispatch()
  const navigation = useNavigation()

  const hasEngagement = Boolean(repostCount || saveCount)
  const isPurchase = isContentUSDCPurchaseGated(streamConditions)

  const handlePressFavorites = useCallback(() => {
    dispatch(setFavorite(id, favoriteType))
    navigation.push('Favorited', { id, favoriteType })
  }, [dispatch, id, navigation, favoriteType])

  const handlePressReposts = useCallback(() => {
    dispatch(setRepost(id, repostType))
    navigation.push('Reposts', { id, repostType })
  }, [dispatch, id, navigation, repostType])

  const downloadStatusIndicator = isCollection ? (
    <CollectionDownloadStatusIndicator size='s' collectionId={id} />
  ) : (
    <TrackDownloadStatusIndicator size='s' trackId={id} />
  )

  const isReadonly = variant === 'readonly'
  const isScheduledRelease = isUnlisted && moment(releaseDate).isAfter(moment())

  const renderLockedContentOrPlayCount = () => {
    if (streamConditions && !isOwner) {
      if (isPurchase && isReadonly) {
        return (
          <LineupTileAccessStatus
            contentId={id}
            contentType={
              isCollection
                ? PurchaseableContentType.ALBUM
                : PurchaseableContentType.TRACK
            }
            streamConditions={streamConditions}
            hasStreamAccess={hasStreamAccess}
            source={source}
          />
        )
      }
      return (
        <LockedStatusBadge
          locked={!hasStreamAccess}
          variant={isPurchase ? 'purchase' : 'gated'}
        />
      )
    }

    return (
      !hidePlays &&
      playCount !== undefined &&
      playCount > 0 && (
        <Text style={[trackTileStyles.statText, styles.listenCount]}>
          {formatPlayCount(playCount)}
        </Text>
      )
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.stats}>
        {isTrending ? (
          <LineupTileRankIcon showCrown={showRankIcon} index={index} />
        ) : null}
        {showArtistPick && isArtistPick ? (
          <LineupTileLabel icon={IconStar} color='accent'>
            {messages.artistPick}
          </LineupTileLabel>
        ) : !isUnlisted ? (
          type === 'track' ? (
            <GatedTrackLabel trackId={id} />
          ) : streamConditions ? (
            <LineupTileGatedContentLabel
              streamConditions={streamConditions}
              hasStreamAccess={hasStreamAccess}
              isOwner={isOwner}
            />
          ) : null
        ) : null}
        {isUnlisted && !isScheduledRelease ? (
          <LineupTileLabel icon={IconVisibilityHidden}>
            {messages.hidden}
          </LineupTileLabel>
        ) : null}
        {isUnlisted && isScheduledRelease && releaseDate ? (
          <LineupTileLabel icon={IconCalendarMonth} color='accent'>
            {messages.releases(releaseDate)}
          </LineupTileLabel>
        ) : null}
        <View style={styles.leftStats}>
          {hasEngagement && !isUnlisted ? (
            <>
              <TouchableOpacity
                style={[
                  trackTileStyles.statItem,
                  styles.statItem,
                  !repostCount ? styles.disabledStatItem : null
                ]}
                disabled={!repostCount || isReadonly}
                onPress={handlePressReposts}
              >
                <IconRepost color='subdued' size='s' />
                <Text style={trackTileStyles.statText}>
                  {formatCount(repostCount)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  trackTileStyles.statItem,
                  styles.statItem,
                  !saveCount ? styles.disabledStatItem : null
                ]}
                disabled={!saveCount || isReadonly}
                onPress={handlePressFavorites}
              >
                <IconHeart color='subdued' size='s' />
                <Text style={trackTileStyles.statText}>
                  {formatCount(saveCount)}
                </Text>
              </TouchableOpacity>
              <View style={trackTileStyles.statItem}>
                {downloadStatusIndicator}
              </View>
            </>
          ) : null}
        </View>
      </View>
      {renderLockedContentOrPlayCount()}
    </View>
  )
}
