import { Suspense, lazy, useCallback, useState, useEffect, useRef } from 'react'

import {
  useTrackRank,
  useRemixContest,
  useToggleFavoriteTrack,
  useStems,
  useTrack
} from '@audius/common/api'
import {
  isContentUSDCPurchaseGated,
  ID,
  FieldVisibility,
  Remix,
  AccessConditions,
  FavoriteSource
} from '@audius/common/models'
import {
  PurchaseableContentType,
  useEarlyReleaseConfirmationModal,
  usePublishConfirmationModal
} from '@audius/common/store'
import {
  Genre,
  Nullable,
  dayjs,
  formatReleaseDate,
  formatContestDeadline
} from '@audius/common/utils'
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
  PlainButton,
  IconCaretDown,
  IconCaretUp,
  spacing,
  Tooltip
} from '@audius/harmony'
import IconCalendarMonth from '@audius/harmony/src/assets/icons/CalendarMonth.svg'
import IconTrending from '@audius/harmony/src/assets/icons/Trending.svg'
import IconVisibilityHidden from '@audius/harmony/src/assets/icons/VisibilityHidden.svg'
import { useTheme } from '@emotion/react'
import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import { pick } from 'lodash'
import { useToggle } from 'react-use'
import useMeasure from 'react-use-measure'

import { UserLink } from 'components/link'
import Menu from 'components/menu/Menu'
import { SearchTag } from 'components/search-bar/SearchTag'
import Skeleton from 'components/skeleton/Skeleton'
import Toast from 'components/toast/Toast'
import { UserGeneratedText } from 'components/user-generated-text'

import { CardTitle } from './CardTitle'
import { GatedContentSection } from './GatedContentSection'
import GiantArtwork from './GiantArtwork'
import styles from './GiantTrackTile.module.css'
import { GiantTrackTileProgressInfo } from './GiantTrackTileProgressInfo'
import { PlayPauseButton } from './PlayPauseButton'
import { TrackDogEar } from './TrackDogEar'
import { TrackMetadataList } from './TrackMetadataList'
import { TrackStats } from './TrackStats'

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
const MAX_DESCRIPTION_LINES = 8
const DEFAULT_LINE_HEIGHT = spacing.xl

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
  contestEnded: 'Contest Ended',
  deadline: (deadline?: string) => formatContestDeadline(deadline, 'long'),
  seeMore: 'See More',
  seeLess: 'See Less'
}

type GiantTrackTileProps = {
  artistHandle: string
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
  artistHandle,
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
  const [artworkLoading, setArtworkLoading] = useState(false)
  const onArtworkLoad = useCallback(
    () => setArtworkLoading(false),
    [setArtworkLoading]
  )
  const toggleSaveTrack = useToggleFavoriteTrack({
    trackId,
    source: FavoriteSource.TRACK_PAGE
  })

  const { data: remixContest, isLoading: isEventsLoading } =
    useRemixContest(trackId)
  const isRemixContest = !!remixContest

  const isLongFormContent =
    genre === Genre.PODCASTS || genre === Genre.AUDIOBOOKS
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)
  const { data: track } = useTrack(trackId, {
    select: (track) => pick(track, ['is_downloadable', 'preview_cid'])
  })
  const { data: stems = [] } = useStems(trackId)
  const hasDownloadableAssets = track?.is_downloadable || stems.length > 0
  // Preview button is shown for USDC-gated tracks if user does not have access
  // or is the owner
  const showPreview =
    isUSDCPurchaseGated && (isOwner || !hasStreamAccess) && track?.preview_cid
  // Play button is conditionally hidden for USDC-gated tracks when the user does not have access
  const showPlay = isUSDCPurchaseGated ? hasStreamAccess : true
  const shouldShowScheduledRelease =
    isScheduledRelease && dayjs(releaseDate).isAfter(dayjs())
  const [isDescriptionExpanded, toggleDescriptionExpanded] = useToggle(false)
  const [showToggle, setShowToggle] = useState(false)
  const theme = useTheme()
  const toggleButtonRef = useRef<HTMLButtonElement>(null)

  const handleToggleDescription = useCallback(() => {
    toggleDescriptionExpanded()
    // If we're collapsing, scroll the button into view
    if (isDescriptionExpanded && toggleButtonRef.current) {
      toggleButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [isDescriptionExpanded, toggleDescriptionExpanded])

  // This ref holds the description height for expansion
  const [descriptionRef, descriptionBounds] = useMeasure({
    polyfill: ResizeObserver
  })

  // This ref holds the full content height for expansion
  const [fullContentRef, fullContentBounds] = useMeasure({
    polyfill: ResizeObserver
  })

  // Calculate if toggle should be shown based on content height
  useEffect(() => {
    if (description && descriptionBounds.height && fullContentBounds.height) {
      const lineHeight = DEFAULT_LINE_HEIGHT
      const maxHeight = lineHeight * MAX_DESCRIPTION_LINES
      setShowToggle(fullContentBounds.height > maxHeight)
    }
  }, [description, descriptionBounds.height, fullContentBounds.height])

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
          text={'Reposted!'}
          disabled={isReposted}
          delay={REPOST_TIMEOUT}
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'center', vertical: 'top' }}
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
          text={'Favorited!'}
          disabled={isSaved}
          delay={SAVED_TIMEOUT}
          anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'center', vertical: 'top' }}
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
      isReposted,
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
      includeRemixContest: true,
      extraMenuItems: overflowMenuExtraItems
    }
  }

  const fadeIn = {
    [styles.show]: !isLoading,
    [styles.hide]: isLoading
  }

  const trendingRank = useTrackRank(trackId)

  return (
    <Paper
      column
      w='100%'
      justifyContent='center'
      mh='auto'
      css={{ maxWidth: 1080, textAlign: 'left' }}
    >
      <TrackDogEar trackId={trackId} borderOffset={0} />
      <Flex p='l' gap='xl'>
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
                  {isLoading && <Skeleton width='686px' height='96px' />}
                </Box>
                <Flex>
                  {isLoading && <Skeleton width='200px' height='24px' />}
                  <Text
                    variant='title'
                    strength='weak'
                    tag='h2'
                    className={cn(fadeIn)}
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Text color='subdued'>By </Text>
                    <UserLink userId={userId} popover />
                  </Text>
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
          {trendingRank ? (
            <MusicBadge color='blue' icon={IconTrending}>
              {trendingRank}
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
        <Box p='l' pb='xl' w='100%' backgroundColor='surface1'>
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
          <Flex column gap='m'>
            {/* Container with height transition */}
            <Flex
              direction='column'
              css={{
                transition: `height ${theme.motion.expressive}, opacity ${theme.motion.quick}`,
                overflow: 'hidden',
                height: isDescriptionExpanded
                  ? fullContentBounds.height
                  : Math.min(
                      fullContentBounds.height,
                      DEFAULT_LINE_HEIGHT * MAX_DESCRIPTION_LINES
                    )
              }}
            >
              {/* Inner content that we measure */}
              <Flex ref={fullContentRef} direction='column'>
                <UserGeneratedText
                  ref={descriptionRef}
                  tag='h3'
                  size='s'
                  lineHeight='multi'
                >
                  {description}
                </UserGeneratedText>
              </Flex>
            </Flex>
            {showToggle && (
              <PlainButton
                ref={toggleButtonRef}
                iconRight={isDescriptionExpanded ? IconCaretUp : IconCaretDown}
                onClick={handleToggleDescription}
                css={{ alignSelf: 'flex-start' }}
              >
                {isDescriptionExpanded ? messages.seeLess : messages.seeMore}
              </PlainButton>
            )}
          </Flex>
        ) : null}

        {renderTags()}
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
