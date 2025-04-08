import { Suspense, lazy, useCallback, useState } from 'react'

import {
  useRemixContest,
  useToggleFavoriteTrack,
  useTrack
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import {
  isContentUSDCPurchaseGated,
  ID,
  FieldVisibility,
  Remix,
  AccessConditions,
  FavoriteSource
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  PurchaseableContentType,
  useEarlyReleaseConfirmationModal,
  usePublishConfirmationModal
} from '@audius/common/store'
import { Genre, Nullable, formatReleaseDate, route } from '@audius/common/utils'
import {
  Text,
  Box,
  Flex,
  IconRepost,
  IconHeart,
  IconKebabHorizontal,
  IconShare,
  IconRocket,
  Button,
  MusicBadge,
  Paper,
  IconCloudUpload
} from '@audius/harmony'
import IconCalendarMonth from '@audius/harmony/src/assets/icons/CalendarMonth.svg'
import IconRobot from '@audius/harmony/src/assets/icons/Robot.svg'
import IconTrending from '@audius/harmony/src/assets/icons/Trending.svg'
import IconVisibilityHidden from '@audius/harmony/src/assets/icons/VisibilityHidden.svg'
import { GetEntityEventsEntityTypeEnum } from '@audius/sdk'
import cn from 'classnames'
import dayjs from 'dayjs'

import { UserLink } from 'components/link'
import Menu from 'components/menu/Menu'
import { SearchTag } from 'components/search-bar/SearchTag'
import Skeleton from 'components/skeleton/Skeleton'
import Toast from 'components/toast/Toast'
import Tooltip from 'components/tooltip/Tooltip'
import { ComponentPlacement } from 'components/types'
import { UserGeneratedText } from 'components/user-generated-text'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { AiTrackSection } from './AiTrackSection'
import { CardTitle } from './CardTitle'
import { GatedContentSection } from './GatedContentSection'
import GiantArtwork from './GiantArtwork'
import styles from './GiantTrackTile.module.css'
import { GiantTrackTileProgressInfo } from './GiantTrackTileProgressInfo'
import { PlayPauseButton } from './PlayPauseButton'
import { TrackDogEar } from './TrackDogEar'
import { TrackMetadataList } from './TrackMetadataList'
import { TrackStats } from './TrackStats'

const { UPLOAD_PAGE } = route

const DownloadSection = lazy(() =>
  import('./DownloadSection').then((module) => ({
    default: module.DownloadSection
  }))
)

const BUTTON_COLLAPSE_WIDTHS = {
  first: 1095,
  second: 1190,
  third: 1286
}
// Toast timeouts in ms
const REPOST_TIMEOUT = 1000
const SAVED_TIMEOUT = 1000

const messages = {
  makePublic: 'MAKE PUBLIC',
  releaseNow: 'RELEASE NOW',
  isPublishing: 'PUBLISHING',
  repostButtonText: 'repost',
  repostedButtonText: 'reposted',
  unplayed: 'Unplayed',
  timeLeft: 'left',
  played: 'Played',
  generatedWithAi: 'Generated With AI',
  actionGroupLabel: 'track actions',
  hidden: 'hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate, withHour: true })}`,
  contestDeadline: 'Contest Deadline',
  uploadRemixButtonText: 'Upload Your Remix',
  deadline: (deadline?: string) => {
    const userTimezone = dayjs.tz.guess()
    const localTime = dayjs(deadline).utc(true).local().tz(userTimezone)
    return deadline
      ? `${localTime.format('MM/DD/YYYY')} at ${localTime.format('h:mm A')}`
      : ''
  }
}

type GiantTrackTileProps = {
  aiAttributionUserId: Nullable<number>
  artistHandle: string
  trendingBadgeLabel: Nullable<string>
  coSign: Nullable<Remix>
  credits: string
  currentUserId: Nullable<ID>
  description: string
  hasStreamAccess: boolean
  duration: number
  fieldVisibility: FieldVisibility
  following: boolean
  genre: string
  isArtistPick: boolean
  isOwner: boolean
  isStreamGated: boolean
  isDownloadGated: boolean
  isPublishing: boolean
  isRemix: boolean
  isReposted: boolean
  isSaved: boolean
  isUnlisted: boolean
  isScheduledRelease: boolean
  listenCount: number
  loading: boolean
  mood: string
  onMakePublic: (trackId: ID) => void
  onFollow: () => void
  onPlay: () => void
  onPreview: () => void
  onRepost: () => void
  onSave: () => void
  onShare: () => void
  onUnfollow: () => void
  playing: boolean
  previewing: boolean
  streamConditions: Nullable<AccessConditions>
  downloadConditions: Nullable<AccessConditions>
  releaseDate: string
  repostCount: number
  saveCount: number
  tags: string
  trackId: number
  trackTitle: string
  userId: number
  ddexApp?: string | null
  scrollToCommentSection: () => void
}

export const GiantTrackTile = ({
  aiAttributionUserId,
  artistHandle,
  trendingBadgeLabel,
  coSign,
  description,
  hasStreamAccess,
  duration,
  fieldVisibility,
  following,
  genre,
  isArtistPick,
  isOwner,
  isStreamGated,
  isRemix,
  isReposted,
  isPublishing,
  isSaved,
  isScheduledRelease,
  isUnlisted,
  listenCount,
  loading,
  onFollow,
  onMakePublic,
  onPlay,
  onPreview,
  onSave,
  onShare,
  onRepost,
  onUnfollow,
  releaseDate,
  repostCount,
  saveCount,
  playing,
  previewing,
  streamConditions,
  tags,
  trackId,
  trackTitle,
  userId,
  ddexApp,
  scrollToCommentSection
}: GiantTrackTileProps) => {
  const navigate = useNavigateToPage()
  const [artworkLoading, setArtworkLoading] = useState(false)
  const onArtworkLoad = useCallback(
    () => setArtworkLoading(false),
    [setArtworkLoading]
  )
  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId,
    source: FavoriteSource.TRACK_PAGE
  })

  const { isEnabled: isRemixContestEnabled } = useFeatureFlag(
    FeatureFlags.REMIX_CONTEST
  )
  const { data: events, isLoading: isEventsLoading } = useRemixContest(
    trackId,
    {
      entityType: GetEntityEventsEntityTypeEnum.Track
    }
  )
  const event = events?.[0]
  const isRemixContest = isRemixContestEnabled && event

  const isLongFormContent =
    genre === Genre.PODCASTS || genre === Genre.AUDIOBOOKS
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        is_downloadable: track?.is_downloadable,
        _stems: track?._stems,
        preview_cid: track?.preview_cid
      }
    }
  })
  const { is_downloadable, _stems, preview_cid } = partialTrack ?? {}
  const hasDownloadableAssets = is_downloadable || (_stems?.length ?? 0) > 0
  // Preview button is shown for USDC-gated tracks if user does not have access
  // or is the owner
  const showPreview =
    isUSDCPurchaseGated && (isOwner || !hasStreamAccess) && preview_cid
  // Play button is conditionally hidden for USDC-gated tracks when the user does not have access
  const showPlay = isUSDCPurchaseGated ? hasStreamAccess : true
  const shouldShowScheduledRelease =
    isScheduledRelease && dayjs(releaseDate).isAfter(dayjs())
  const renderCardTitle = (className: string) => {
    return (
      <CardTitle
        className={className}
        isUnlisted={isUnlisted}
        isScheduledRelease={isScheduledRelease}
        isRemix={isRemix}
        isStreamGated={isStreamGated}
        isPodcast={genre === Genre.PODCASTS}
        streamConditions={streamConditions}
        isRemixContest={!!isRemixContest}
      />
    )
  }

  const renderShareButton = () => {
    const shouldShow =
      (!isUnlisted && !isPublishing) || fieldVisibility.share || isOwner
    return shouldShow ? (
      <Button
        variant='secondary'
        iconLeft={IconShare}
        widthToHideText={BUTTON_COLLAPSE_WIDTHS.first}
        onClick={onShare}
      >
        share
      </Button>
    ) : null
  }

  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()
  const { onOpen: openEarlyReleaseConfirmation } =
    useEarlyReleaseConfirmationModal()

  const renderMakePublicButton = () => {
    let text = messages.isPublishing
    if (isUnlisted && !isPublishing) {
      text = isScheduledRelease ? messages.releaseNow : messages.makePublic
    }

    return (
      (isUnlisted || isPublishing) &&
      isOwner && (
        <Button
          variant='secondary'
          isLoading={isPublishing}
          iconLeft={IconRocket}
          widthToHideText={BUTTON_COLLAPSE_WIDTHS.second}
          onClick={() => {
            if (isScheduledRelease) {
              openEarlyReleaseConfirmation({
                contentType: 'track',
                confirmCallback: () => {
                  onMakePublic(trackId)
                }
              })
            } else {
              openPublishConfirmation({
                contentType: 'track',
                confirmCallback: () => {
                  onMakePublic(trackId)
                }
              })
            }
          }}
        >
          {text}
        </Button>
      )
    )
  }

  const renderRepostButton = () => {
    return (
      !isUnlisted &&
      !isPublishing &&
      !isOwner && (
        <Toast
          placement={ComponentPlacement.BOTTOM}
          text={'Reposted!'}
          disabled={isReposted}
          delay={REPOST_TIMEOUT}
          fillParent={false}
        >
          <Tooltip
            disabled={isOwner || repostCount === 0}
            text={isReposted ? 'Unrepost' : 'Repost'}
          >
            <div>
              <Button
                variant={isReposted ? 'primary' : 'secondary'}
                name='repost'
                disabled={isOwner}
                widthToHideText={BUTTON_COLLAPSE_WIDTHS.second}
                iconLeft={IconRepost}
                onClick={onRepost}
              >
                {isReposted
                  ? messages.repostedButtonText
                  : messages.repostButtonText}
              </Button>
            </div>
          </Tooltip>
        </Toast>
      )
    )
  }

  const renderFavoriteButton = () => {
    return (
      !isUnlisted &&
      !isOwner && (
        <Toast
          placement={ComponentPlacement.BOTTOM}
          text={'Favorited!'}
          disabled={isSaved}
          delay={SAVED_TIMEOUT}
          fillParent={false}
        >
          <Tooltip
            disabled={isOwner || saveCount === 0}
            text={isSaved ? 'Unfavorite' : 'Favorite'}
          >
            <div>
              <Button
                name='favorite'
                disabled={isOwner}
                variant={isSaved ? 'primary' : 'secondary'}
                widthToHideText={BUTTON_COLLAPSE_WIDTHS.third}
                iconLeft={IconHeart}
                onClick={toggleSaveTrack}
              >
                {isSaved ? 'favorited' : 'favorite'}
              </Button>
            </div>
          </Tooltip>
        </Toast>
      )
    )
  }

  const renderListenCount = () => {
    const shouldShow = isOwner || (!isStreamGated && !isUnlisted)

    if (!shouldShow) {
      return null
    }
    return (
      <Text variant='title' color='subdued' size='l'>
        {!isOwner && listenCount === 0 ? (
          <span className={styles.firstListen}>
            Be the first to listen to this track!
          </span>
        ) : (
          <>
            <span className={styles.numberOfListens}>
              {listenCount.toLocaleString()}
            </span>{' '}
            <span className={styles.listenText}>
              {listenCount === 1 ? 'Play' : 'Plays'}
            </span>
          </>
        )}
      </Text>
    )
  }

  const renderTags = () => {
    const shouldShow = !isUnlisted || fieldVisibility.tags
    if (!shouldShow || !tags) return null
    return (
      <Flex wrap='wrap' gap='s'>
        {tags
          .split(',')
          .filter((t) => t)
          .map((tag) => (
            <SearchTag key={tag} source='track page'>
              {tag}
            </SearchTag>
          ))}
      </Flex>
    )
  }

  const goToUploadWithRemix = useCallback(() => {
    if (!trackId) return
    const state = {
      initialMetadata: {
        is_remix: true,
        remix_of: {
          tracks: [{ parent_track_id: trackId }]
        }
      }
    }
    navigate(UPLOAD_PAGE, state)
  }, [trackId, navigate])

  const renderSubmitRemixContestSection = useCallback(() => {
    if (!isRemixContest) return null
    return (
      <Flex row gap='m'>
        <Flex gap='xs' alignItems='center'>
          <Text variant='label' color='accent'>
            {messages.contestDeadline}
          </Text>
          <Text>{messages.deadline(event?.endDate)}</Text>
        </Flex>
        {!isOwner ? (
          <Button
            variant='secondary'
            size='small'
            onClick={goToUploadWithRemix}
            iconLeft={IconCloudUpload}
          >
            {messages.uploadRemixButtonText}
          </Button>
        ) : null}
      </Flex>
    )
  }, [isRemixContest, event?.endDate, isOwner, goToUploadWithRemix])

  const isLoading = loading || artworkLoading || isEventsLoading

  const overflowMenuExtraItems = []
  if (!isOwner) {
    overflowMenuExtraItems.push({
      text: following ? 'Unfollow Artist' : 'Follow Artist',
      onClick: () =>
        setTimeout(() => (following ? onUnfollow() : onFollow()), 0)
    })
  }

  const overflowMenu = {
    menu: {
      type: 'track',
      trackId,
      trackTitle,
      ddexApp,
      genre,
      handle: artistHandle,
      isFavorited: isSaved,
      mount: 'page',
      isOwner,
      includeFavorite: hasStreamAccess,
      includeRepost: hasStreamAccess,
      includeShare: true,
      includeTrackPage: false,
      isArtistPick,
      isUnlisted,
      includeEmbed: !(isUnlisted || isStreamGated),
      includeArtistPick: true,
      includeAddToAlbum: isOwner && !ddexApp,
      includeRemixContest: isRemixContestEnabled,
      extraMenuItems: overflowMenuExtraItems
    }
  }

  const fadeIn = {
    [styles.show]: !isLoading,
    [styles.hide]: isLoading
  }

  return (
    <Paper
      column
      w='100%'
      justifyContent='center'
      mh='auto'
      css={{ maxWidth: 1080, textAlign: 'left' }}
    >
      <TrackDogEar trackId={trackId} borderOffset={0} />
      <Flex p='l' gap='xl' css={{ flexWrap: 'wrap' }}>
        <GiantArtwork
          trackId={trackId}
          coSign={coSign}
          callback={onArtworkLoad}
        />
        <Flex
          column
          justifyContent='space-between'
          flex={1}
          css={{ minWidth: '386px', flexBasis: '386px' }}
        >
          <Flex column gap='2xl'>
            <Flex column gap='xl'>
              <Flex column gap='l' alignItems='flex-start'>
                {renderCardTitle(cn(fadeIn))}
                <Box>
                  <Text variant='heading' size='xl' className={cn(fadeIn)}>
                    {trackTitle}
                  </Text>
                  {isLoading && <Skeleton className={styles.skeleton} />}
                </Box>
                <Flex>
                  <Text
                    variant='title'
                    strength='weak'
                    tag='h2'
                    className={cn(fadeIn)}
                  >
                    <Text color='subdued'>By </Text>
                    <UserLink userId={userId} popover />
                  </Text>
                  {isLoading && (
                    <Skeleton className={styles.skeleton} width='60%' />
                  )}
                </Flex>
                <div className={cn(fadeIn)}>
                  <TrackStats
                    trackId={trackId}
                    scrollToCommentSection={scrollToCommentSection}
                  />
                </div>
              </Flex>

              <Flex gap='xl' alignItems='center' className={cn(fadeIn)}>
                {showPlay ? (
                  <PlayPauseButton
                    disabled={!hasStreamAccess}
                    playing={playing && !previewing}
                    onPlay={onPlay}
                    trackId={trackId}
                  />
                ) : null}
                {showPreview ? (
                  <PlayPauseButton
                    playing={playing && previewing}
                    onPlay={onPreview}
                    trackId={trackId}
                    isPreview
                  />
                ) : null}
                {isLongFormContent ? (
                  <GiantTrackTileProgressInfo
                    duration={duration}
                    trackId={trackId}
                  />
                ) : (
                  renderListenCount()
                )}
              </Flex>
            </Flex>
          </Flex>
          {isUnlisted && !isOwner ? null : (
            <div
              className={cn(styles.actionButtons, fadeIn)}
              role='group'
              aria-label={messages.actionGroupLabel}
            >
              {renderShareButton()}
              {renderMakePublicButton()}
              {hasStreamAccess && renderRepostButton()}
              {hasStreamAccess && renderFavoriteButton()}
              <span>
                {/* prop types for overflow menu don't work correctly
              so we need to cast here */}
                <Menu {...(overflowMenu as any)}>
                  {(ref, triggerPopup) => (
                    <div className={cn(styles.menuKebabContainer)} ref={ref}>
                      <Button
                        variant='secondary'
                        aria-label='More options'
                        iconLeft={IconKebabHorizontal}
                        onClick={() => triggerPopup()}
                      />
                    </div>
                  )}
                </Menu>
              </span>
            </div>
          )}
        </Flex>
        <Flex
          gap='s'
          justifyContent='flex-end'
          css={{ position: 'absolute', right: 'var(--harmony-unit-6)' }}
        >
          {aiAttributionUserId ? (
            <MusicBadge icon={IconRobot} color='lightGreen'>
              {messages.generatedWithAi}
            </MusicBadge>
          ) : null}
          {trendingBadgeLabel ? (
            <MusicBadge color='blue' icon={IconTrending}>
              {trendingBadgeLabel}
            </MusicBadge>
          ) : null}
          {shouldShowScheduledRelease ? (
            <MusicBadge variant='accent' icon={IconCalendarMonth}>
              {messages.releases(releaseDate)}
            </MusicBadge>
          ) : isUnlisted ? (
            <MusicBadge icon={IconVisibilityHidden}>
              {messages.hidden}
            </MusicBadge>
          ) : null}
        </Flex>
      </Flex>

      {isStreamGated && streamConditions ? (
        <Box pb='xl' ph='xl' w='100%' backgroundColor='surface1'>
          <GatedContentSection
            isLoading={isLoading}
            contentId={trackId}
            contentType={PurchaseableContentType.TRACK}
            streamConditions={streamConditions}
            hasStreamAccess={hasStreamAccess}
            isOwner={isOwner}
            ownerId={userId}
          />
        </Box>
      ) : null}

      {aiAttributionUserId ? (
        <AiTrackSection attributedUserId={aiAttributionUserId} />
      ) : null}

      <Flex
        column
        p='l'
        backgroundColor='surface1'
        borderTop='default'
        className={cn(fadeIn)}
        gap='m'
      >
        <TrackMetadataList trackId={trackId} />
        {description ? (
          <UserGeneratedText tag='h3' size='s' lineHeight='multi'>
            {description}
          </UserGeneratedText>
        ) : null}

        {renderTags()}
        {renderSubmitRemixContestSection()}
        {hasDownloadableAssets ? (
          <Box w='100%'>
            <Suspense>
              <DownloadSection trackId={trackId} />
            </Suspense>
          </Box>
        ) : null}
      </Flex>
    </Paper>
  )
}
