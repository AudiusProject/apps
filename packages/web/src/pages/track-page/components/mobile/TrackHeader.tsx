import { Suspense, useCallback } from 'react'

import {
  useGetCurrentUserId,
  useGetTrackById,
  useGetUserById
} from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import {
  SquareSizes,
  isContentCollectibleGated,
  isContentUSDCPurchaseGated,
  ID,
  Track
} from '@audius/common/models'
import { trpc } from '@audius/common/services'
import { OverflowAction, PurchaseableContentType } from '@audius/common/store'
import { getDogEarType, formatReleaseDate } from '@audius/common/utils'
import {
  Flex,
  IconCollectible,
  IconPause,
  IconPlay,
  IconSpecialAccess,
  IconCart,
  Box,
  Button,
  MusicBadge,
  Text
} from '@audius/harmony'
import IconCalendarMonth from '@audius/harmony/src/assets/icons/CalendarMonth.svg'
import IconRobot from '@audius/harmony/src/assets/icons/Robot.svg'
import IconVisibilityHidden from '@audius/harmony/src/assets/icons/VisibilityHidden.svg'
import cn from 'classnames'
import dayjs from 'dayjs'

import CoSign from 'components/co-sign/CoSign'
import HoverInfo from 'components/co-sign/HoverInfo'
import { Size } from 'components/co-sign/types'
import { DogEar } from 'components/dog-ear'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import { UserLink } from 'components/link'
import { SearchTag } from 'components/search/SearchTag'
import { AiTrackSection } from 'components/track/AiTrackSection'
import { DownloadSection } from 'components/track/DownloadSection'
import { GatedContentSection } from 'components/track/GatedContentSection'
import { TrackMetadataList } from 'components/track/TrackMetadataList'
import { UserGeneratedText } from 'components/user-generated-text'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { getTrackDefaults } from 'pages/track-page/utils'
import { isDarkMode } from 'utils/theme/theme'

import ActionButtonRow from './ActionButtonRow'
import StatsButtonRow from './StatsButtonRow'
import styles from './TrackHeader.module.css'

const messages = {
  track: 'TRACK',
  remix: 'REMIX',
  play: 'PLAY',
  preview: 'PREVIEW',
  pause: 'PAUSE',
  collectibleGated: 'COLLECTIBLE GATED',
  premiumTrack: 'PREMIUM TRACK',
  specialAccess: 'SPECIAL ACCESS',
  generatedWithAi: 'Generated With AI',
  artworkAltText: 'Track Artwork',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate, withHour: true })}`
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
  id: ID
  isPlaying: boolean
  isPreviewing: boolean
  commentCount: number
  commentsDisabled: boolean
  onPlay: () => void
  onPreview: () => void
  onShare: () => void
  onSave: () => void
  onRepost: () => void
  onClickMobileOverflow: (
    trackId: ID,
    overflowActions: OverflowAction[]
  ) => void
  goToFavoritesPage: (trackId: ID) => void
  goToRepostsPage: (trackId: ID) => void
}

const TrackHeader = (props: TrackHeaderProps) => {
  const {
    id,
    isPlaying,
    isPreviewing,
    commentCount,
    commentsDisabled,
    onPlay,
    onPreview,
    onShare,
    onSave,
    onRepost,
    onClickMobileOverflow,
    goToFavoritesPage,
    goToRepostsPage
  } = props
  const { data: currentUserId } = useGetCurrentUserId({})
  const track = (useGetTrackById({ id, currentUserId }).data ??
    undefined) as unknown as Track | undefined
  const { data: user } = useGetUserById(
    { id: track?.owner_id ?? 0 },
    { disabled: !track?.owner_id }
  )
  const isFollowing = user?.does_current_user_follow ?? false

  const {
    aiAttributionUserId,
    coSign,
    coverArtSizes,
    description,
    fieldVisibility,
    isReposted,
    isSaved,
    isStreamGated,
    isUnlisted,
    releaseDate,
    streamConditions,
    ownerId,
    tags,
    title,
    trackId,
    saveCount,
    listenCount,
    repostCount,
    remixParentTrackId
  } = getTrackDefaults(track ?? null)
  const { isFetchingNFTAccess, hasStreamAccess } = useGatedContentAccess(
    track ?? null
  )
  const isOwner = ownerId === currentUserId
  const isRemix = !!remixParentTrackId
  const isLoading = !track || isFetchingNFTAccess

  const hasDownloadableAssets =
    track?.is_downloadable || (track?._stems?.length ?? 0) > 0

  const showSocials = !isUnlisted && hasStreamAccess
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  // Preview button is shown for USDC-gated tracks if user does not have access
  // or is the owner
  const showPreview = isUSDCPurchaseGated && (isOwner || !hasStreamAccess)
  // Play button is conditionally hidden for USDC-gated tracks when the user does not have access
  const showPlay = isUSDCPurchaseGated ? hasStreamAccess : true
  const showListenCount = isOwner || (!isStreamGated && !isUnlisted)
  const { data: albumInfo } = trpc.tracks.getAlbumBacklink.useQuery(
    { trackId },
    { enabled: !!trackId }
  )
  const shouldShowScheduledRelease =
    track?.release_date && dayjs(track.release_date).isAfter(dayjs())

  const image = useTrackCoverArt(
    trackId,
    coverArtSizes,
    SquareSizes.SIZE_480_BY_480
  )

  const onSaveHeroTrack = () => {
    if (!isOwner) onSave()
  }
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
      isOwner && !track?.ddex_app ? OverflowAction.ADD_TO_ALBUM : null,
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

  const imageElement = coSign ? (
    <CoSign
      size={Size.LARGE}
      hasFavorited={coSign.has_remix_author_saved}
      hasReposted={coSign.has_remix_author_reposted}
      coSignName={coSign.user.name}
      className={styles.coverArt}
      userId={coSign.user.user_id}
    >
      <DynamicImage
        image={image ?? undefined}
        alt={messages.artworkAltText}
        wrapperClassName={cn(styles.imageWrapper, styles.cosignImageWrapper)}
      />
    </CoSign>
  ) : (
    <DynamicImage
      image={image ?? undefined}
      alt='Track Artwork'
      wrapperClassName={cn(styles.coverArt, styles.imageWrapper)}
    />
  )

  const renderDogEar = () => {
    const DogEarType = getDogEarType({
      streamConditions,
      isOwner,
      hasStreamAccess
    })
    if (!isLoading && DogEarType) {
      return (
        <div className={styles.borderOffset}>
          <DogEar type={DogEarType} />
        </div>
      )
    }
    return null
  }

  const renderHeaderText = () => {
    if (isStreamGated) {
      let IconComponent = IconSpecialAccess
      let titleMessage = messages.specialAccess
      if (isContentCollectibleGated(streamConditions)) {
        IconComponent = IconCollectible
        titleMessage = messages.collectibleGated
      } else if (isContentUSDCPurchaseGated(streamConditions)) {
        IconComponent = IconCart
        titleMessage = messages.premiumTrack
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

  return (
    <div className={styles.trackHeader}>
      {renderDogEar()}
      <Flex gap='s' direction='column'>
        {renderHeaderText()}
        {aiAttributionUserId ? (
          <MusicBadge icon={IconRobot} color='lightGreen' size='s'>
            {messages.generatedWithAi}
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
        {ownerId ? (
          <UserLink userId={ownerId} variant='visible' size='l' />
        ) : null}
      </div>
      {showPlay ? (
        <PlayButton
          disabled={!hasStreamAccess}
          playing={isPlaying && !isPreviewing}
          onPlay={onPlay}
        />
      ) : null}
      {showPreview ? (
        <PreviewButton playing={isPlaying && isPreviewing} onPlay={onPreview} />
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
            ownerId={ownerId}
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
      />
      {aiAttributionUserId ? (
        <AiTrackSection
          attributedUserId={aiAttributionUserId}
          className={cn(styles.aiSection, styles.withSectionDivider)}
          descriptionClassName={styles.aiSectionDescription}
        />
      ) : null}

      {description ? (
        <UserGeneratedText
          className={styles.description}
          linkSource='track page'
        >
          {description}
        </UserGeneratedText>
      ) : null}
      <TrackMetadataList trackId={trackId} />
      {renderTags()}
      {hasDownloadableAssets ? (
        <Box pt='l' w='100%'>
          <Suspense>
            <DownloadSection trackId={trackId} />
          </Suspense>
        </Box>
      ) : null}
    </div>
  )
}

export default TrackHeader
