import { Suspense, useCallback, useState } from 'react'

import { useRemixContest, useTrack, useTrackRank } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import {
  SquareSizes,
  isContentUSDCPurchaseGated,
  ID,
  FieldVisibility,
  Remix,
  AccessConditions,
  isContentTokenGated
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { OverflowAction, PurchaseableContentType } from '@audius/common/store'
import { Nullable, formatReleaseDate, dayjs } from '@audius/common/utils'
import {
  Flex,
  IconPause,
  IconPlay,
  IconSparkles,
  IconCart,
  Box,
  Button,
  MusicBadge,
  Text,
  IconArtistCoin
} from '@audius/harmony'
import IconCalendarMonth from '@audius/harmony/src/assets/icons/CalendarMonth.svg'
import IconTrending from '@audius/harmony/src/assets/icons/Trending.svg'
import IconVisibilityHidden from '@audius/harmony/src/assets/icons/VisibilityHidden.svg'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { DownloadMobileAppDrawer } from 'components/download-mobile-app-drawer/DownloadMobileAppDrawer'
import { UserLink } from 'components/link'
import { SearchTag } from 'components/search-bar/SearchTag'
import { GatedContentSection } from 'components/track/GatedContentSection'
import { TrackArtwork } from 'components/track/TrackArtwork'
import { TrackDogEar } from 'components/track/TrackDogEar'
import { TrackMetadataList } from 'components/track/TrackMetadataList'
import HoverInfo from 'components/track-flair/HoverInfo'
import { Size } from 'components/track-flair/types'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { push as pushRoute } from 'utils/navigation'
import { isDarkMode } from 'utils/theme/theme'

import ActionButtonRow from './ActionButtonRow'
import { DownloadSection } from './DownloadSection'
import StatsButtonRow from './StatsButtonRow'
import { TrackDescription } from './TrackDescription'
import styles from './TrackHeader.module.css'

const messages = {
  track: 'TRACK',
  remix: 'REMIX',
  play: 'PLAY',
  preview: 'PREVIEW',
  pause: 'PAUSE',
  premiumTrack: 'PREMIUM TRACK',
  specialAccess: 'SPECIAL ACCESS',
  coinGated: 'COIN GATED',
  generatedWithAi: 'Generated With AI',
  artworkAltText: 'Track Artwork',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate, withHour: true })}`,
  remixContest: 'Remix Contest'
}

type PlayButtonProps = {
  disabled?: boolean
  playing: boolean
  onPlay: () => void
}

const PlayButton = ({ disabled, playing, onPlay }: PlayButtonProps) => {
  return (
    <Button
      disabled={disabled}
      variant='primary'
      iconLeft={playing ? IconPause : IconPlay}
      onClick={onPlay}
      fullWidth
    >
      {playing ? messages.pause : messages.play}
    </Button>
  )
}

const PreviewButton = ({ playing, onPlay }: PlayButtonProps) => {
  return (
    <Button
      variant='secondary'
      iconLeft={playing ? IconPause : IconPlay}
      onClick={onPlay}
      fullWidth
    >
      {playing ? messages.pause : messages.preview}
    </Button>
  )
}

type TrackHeaderProps = {
  isLoading: boolean
  isPlaying: boolean
  isPreviewing: boolean
  isOwner: boolean
  isSaved: boolean
  isReposted: boolean
  isFollowing: boolean
  title: string
  trackId: ID
  userId: ID
  description: string
  releaseDate: string
  genre: string
  mood: string
  credits: string
  tags: string
  listenCount: number
  duration: number
  saveCount: number
  repostCount: number
  commentCount: number
  commentsDisabled: boolean
  isUnlisted: boolean
  isStreamGated: boolean
  streamConditions: Nullable<AccessConditions>
  hasStreamAccess: boolean
  hasDownloadAccess: boolean
  isRemix: boolean
  fieldVisibility: FieldVisibility
  coSign: Remix | null
  onClickMobileOverflow: (
    trackId: ID,
    overflowActions: OverflowAction[]
  ) => void
  onPlay: () => void
  onPreview: () => void
  onShare: () => void
  onSave: () => void
  onRepost: () => void
  goToFavoritesPage: (trackId: ID) => void
  goToRepostsPage: (trackId: ID) => void
}

const TrackHeader = ({
  title,
  trackId,
  userId,
  description,
  isOwner,
  isFollowing,
  releaseDate,
  isLoading,
  isPlaying,
  isPreviewing,
  isSaved,
  isReposted,
  isUnlisted,
  isStreamGated,
  streamConditions,
  hasStreamAccess,
  isRemix,
  fieldVisibility,
  coSign,
  listenCount,
  saveCount,
  repostCount,
  commentCount,
  commentsDisabled,
  tags,
  onPlay,
  onPreview,
  onShare,
  onSave,
  onRepost,
  onClickMobileOverflow,
  goToFavoritesPage,
  goToRepostsPage
}: TrackHeaderProps) => {
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        is_downloadable: track?.is_downloadable,
        album_backlink: track?.album_backlink,
        release_date: track?.release_date,
        ddex_app: track?.ddex_app,
        permalink: track?.permalink,
        _stems: track?._stems
      }
    }
  })
  const {
    is_downloadable,
    album_backlink,
    release_date,
    ddex_app,
    permalink,
    _stems
  } = partialTrack ?? {}

  const dispatch = useDispatch()
  const hasDownloadableAssets = is_downloadable || (_stems?.length ?? 0) > 0

  const showSocials = !isUnlisted && hasStreamAccess
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  // Preview button is shown for USDC-gated tracks if user does not have access
  // or is the owner
  const showPreview = isUSDCPurchaseGated && (isOwner || !hasStreamAccess)
  // Play button is conditionally hidden for USDC-gated tracks when the user does not have access
  const showPlay = isUSDCPurchaseGated ? hasStreamAccess : true
  const showListenCount = isOwner || (!isStreamGated && !isUnlisted)
  const albumInfo = album_backlink
  const shouldShowScheduledRelease =
    release_date && dayjs(release_date).isAfter(dayjs())
  const { isEnabled: isRemixContestEnabled } = useFeatureFlag(
    FeatureFlags.REMIX_CONTEST
  )
  const { data: remixContest } = useRemixContest(trackId)
  const isRemixContest = isRemixContestEnabled && !!remixContest

  const imageElement = (
    <TrackArtwork
      trackId={trackId}
      size={SquareSizes.SIZE_480_BY_480}
      flairSize={Size.LARGE}
      isLoading={isLoading}
      borderRadius='s'
      h={195}
      w={195}
    />
  )

  const onSaveHeroTrack = useRequiresAccountCallback(() => {
    if (!isOwner) onSave()
  }, [isOwner, onSave])

  const filteredTags = (tags || '').split(',').filter(Boolean)

  const onClickOverflow = () => {
    const overflowActions = [
      isOwner || !showSocials
        ? null
        : isReposted
          ? OverflowAction.UNREPOST
          : OverflowAction.REPOST,
      isOwner || !showSocials
        ? null
        : isSaved
          ? OverflowAction.UNFAVORITE
          : OverflowAction.FAVORITE,
      isOwner && !ddex_app ? OverflowAction.ADD_TO_ALBUM : null,
      isOwner || !isUnlisted ? OverflowAction.ADD_TO_PLAYLIST : null,
      albumInfo ? OverflowAction.VIEW_ALBUM_PAGE : null,
      isFollowing
        ? OverflowAction.UNFOLLOW_ARTIST
        : OverflowAction.FOLLOW_ARTIST,
      OverflowAction.VIEW_ARTIST_PAGE
    ].filter(Boolean) as OverflowAction[]

    onClickMobileOverflow(trackId, overflowActions)
  }

  const renderTags = () => {
    if ((isUnlisted && !fieldVisibility.tags) || filteredTags.length === 0) {
      return null
    }

    return (
      <Flex gap='s' wrap='wrap' w='100%'>
        {filteredTags.map((tag) => (
          <SearchTag key={tag} source='track page'>
            {tag}
          </SearchTag>
        ))}
      </Flex>
    )
  }

  const onClickFavorites = useCallback(() => {
    goToFavoritesPage(trackId)
  }, [goToFavoritesPage, trackId])

  const onClickReposts = useCallback(() => {
    goToRepostsPage(trackId)
  }, [goToRepostsPage, trackId])

  const onClickComments = useCallback(() => {
    dispatch(pushRoute(`${permalink}/comments`))
  }, [dispatch, permalink])

  const renderHeaderText = () => {
    if (isRemixContest) {
      return (
        <Flex justifyContent='center' alignItems='center'>
          <Text variant='label' color='subdued'>
            {messages.remixContest}
          </Text>
        </Flex>
      )
    }

    if (isStreamGated) {
      let IconComponent = IconSparkles
      let titleMessage = messages.specialAccess
      if (isContentUSDCPurchaseGated(streamConditions)) {
        IconComponent = IconCart
        titleMessage = messages.premiumTrack
      } else if (isContentTokenGated(streamConditions)) {
        IconComponent = IconArtistCoin
        titleMessage = messages.coinGated
      }
      return (
        <Flex gap='xs' justifyContent='center' alignItems='center'>
          <IconComponent color='subdued' size='s' />
          <Text variant='label' color='subdued'>
            {titleMessage}
          </Text>
        </Flex>
      )
    }

    return (
      <Flex justifyContent='center' alignItems='center'>
        <Text variant='label' color='subdued'>
          {isRemix ? messages.remix : messages.track}
        </Text>
      </Flex>
    )
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false)
  }, [setIsDrawerOpen])

  const trendingRank = useTrackRank(trackId)

  return (
    <Box w='100%' borderRadius='m' backgroundColor='white' p='l'>
      <TrackDogEar trackId={trackId} />
      <Flex column gap='l' alignItems='center'>
        <Flex gap='s' column>
          {renderHeaderText()}
          {trendingRank ? (
            <MusicBadge color='blue' icon={IconTrending} size='s'>
              {trendingRank}
            </MusicBadge>
          ) : null}
          {shouldShowScheduledRelease ? (
            <MusicBadge variant='accent' icon={IconCalendarMonth} size='s'>
              {messages.releases(releaseDate)}
            </MusicBadge>
          ) : isUnlisted ? (
            <MusicBadge icon={IconVisibilityHidden} size='s'>
              {messages.hidden}
            </MusicBadge>
          ) : null}
        </Flex>
        {imageElement}
        <div className={styles.titleArtistSection}>
          <h1 className={styles.title}>{title}</h1>
          <UserLink center userId={userId} variant='visible' size='l' />
        </div>
        {showPlay ? (
          <PlayButton
            disabled={!hasStreamAccess}
            playing={isPlaying && !isPreviewing}
            onPlay={onPlay}
          />
        ) : null}
        {showPreview ? (
          <PreviewButton
            playing={isPlaying && isPreviewing}
            onPlay={onPreview}
          />
        ) : null}
        {streamConditions && trackId ? (
          <Box w='100%'>
            <GatedContentSection
              isLoading={isLoading}
              contentId={trackId}
              contentType={PurchaseableContentType.TRACK}
              streamConditions={streamConditions}
              hasStreamAccess={hasStreamAccess}
              isOwner={isOwner}
              wrapperClassName={styles.gatedContentSectionWrapper}
              className={styles.gatedContentSection}
              buttonClassName={styles.gatedContentSectionButton}
              ownerId={userId}
            />
          </Box>
        ) : null}

        <ActionButtonRow
          showRepost={showSocials}
          showFavorite={showSocials}
          showShare={!isUnlisted || isOwner}
          showOverflow={!isUnlisted || isOwner}
          shareToastDisabled
          isOwner={isOwner}
          isReposted={isReposted}
          isSaved={isSaved}
          onClickOverflow={onClickOverflow}
          onRepost={onRepost}
          onFavorite={onSaveHeroTrack}
          onShare={onShare}
          darkMode={isDarkMode()}
        />
        {coSign ? (
          <div className={cn(styles.coSignInfo, styles.withSectionDivider)}>
            <HoverInfo
              coSignName={coSign.user.name}
              hasFavorited={coSign.has_remix_author_saved}
              hasReposted={coSign.has_remix_author_reposted}
              userId={coSign.user.user_id}
            />
          </div>
        ) : null}
        <StatsButtonRow
          className={styles.withSectionDivider}
          showListenCount={showListenCount}
          showFavoriteCount={!isUnlisted}
          showRepostCount={!isUnlisted}
          showCommentCount={!isUnlisted && !commentsDisabled}
          listenCount={listenCount}
          favoriteCount={saveCount}
          repostCount={repostCount}
          commentCount={commentCount}
          onClickFavorites={onClickFavorites}
          onClickReposts={onClickReposts}
          onClickComments={onClickComments}
        />

        {description ? (
          <TrackDescription
            description={description}
            className={styles.description}
          />
        ) : null}
        <TrackMetadataList trackId={trackId} />
        {renderTags()}
        {isRemix ? (
          <Flex>
            <Text variant='label' color='subdued'>
              {messages.remixContest}
            </Text>
          </Flex>
        ) : null}
        {hasDownloadableAssets ? (
          <Box pt='l' w='100%'>
            <Suspense>
              <DownloadSection trackId={trackId} />
            </Suspense>
          </Box>
        ) : null}
        <DownloadMobileAppDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
        />
      </Flex>
    </Box>
  )
}

export default TrackHeader
