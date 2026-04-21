import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByPermalink,
  useUnfollowEvent,
  useUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { ShareSource } from '@audius/common/models'
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors,
  shareModalUIActions,
  useHostRemixContestModal
} from '@audius/common/store'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  IconNotificationOff,
  IconNotificationOn,
  IconShare,
  Paper,
  SelectablePill,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { DownloadSection } from 'components/track/DownloadSection'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { RemixContestDetailsTab } from 'pages/track-page/components/desktop/RemixContestDetailsTab'
import { RemixContestPrizesTab } from 'pages/track-page/components/desktop/RemixContestPrizesTab'
import { fullContestPage, pickWinnersPage } from 'utils/route'

import { ContestCommentsTile } from '../ContestCommentsTile'
import { EventFollowersCard } from '../EventFollowersCard'

const messages = {
  title: 'Remix Contest',
  follow: 'Follow',
  following: 'Following',
  enterContest: 'Enter Contest',
  share: 'Share contest',
  submissionsDue: 'Submissions Due:',
  contestEnded: 'Contest Ended',
  hostedBy: 'Hosted By',
  followers: 'Followers',
  contestDetails: 'Contest Details',
  submissionsTab: (n?: number) =>
    n === undefined || n === null ? 'Submissions' : `Submissions (${n})`,
  aboutThisContest: 'ABOUT THIS CONTEST',
  prizes: 'PRIZES',
  postUpdates: 'Contest Feed',
  days: 'Days',
  hours: 'Hours',
  mins: 'Mins',
  secs: 'Secs'
}

const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

export const CONTEST_PAGE_SIZE = 10

const HERO_HEIGHT = 288
const MAX_CONTENT_WIDTH = 1080
const RIGHT_COLUMN_WIDTH_PX = 360
const COLUMN_GAP_PX = 24

type ContestTab = 'details' | 'submissions'

// Figma-aligned countdown: four plain columns on the page background,
// NO dark pill wrapper. Large heading numerals on top, uppercase
// labels beneath. Leading-zero units are subdued so the most-
// significant non-zero unit reads first. Reference:
// Figma node 2857-99124 (remix-contest empty-state desktop).
const CountdownTile = ({
  value,
  label,
  isSubdued
}: {
  value: number
  label: string
  isSubdued?: boolean
}) => (
  <Flex direction='column' alignItems='center' gap='xs' w={56}>
    <Text
      variant='heading'
      size='l'
      color={isSubdued ? 'subdued' : 'default'}
    >
      {String(value).padStart(2, '0')}
    </Text>
    <Text variant='label' size='xs' color='subdued' strength='strong'>
      {label}
    </Text>
  </Flex>
)

const HeaderCountdown = ({ endDate }: { endDate: string }) => {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(t)
  }, [])

  const end = dayjs(endDate)
  const diffMs = Math.max(0, end.diff(now))
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / dayMs)
  const hours = Math.floor((diffMs % dayMs) / (60 * 60 * 1000))
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  const secs = Math.floor((diffMs % (60 * 1000)) / 1000)

  const daysSubdued = days === 0
  const hoursSubdued = daysSubdued && hours === 0
  const minsSubdued = hoursSubdued && mins === 0

  return (
    <Flex gap='xl' alignItems='center'>
      <CountdownTile
        value={days}
        label={messages.days}
        isSubdued={daysSubdued}
      />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSubdued}
      />
      <CountdownTile
        value={mins}
        label={messages.mins}
        isSubdued={minsSubdued}
      />
      <CountdownTile value={secs} label={messages.secs} isSubdued={false} />
    </Flex>
  )
}

type ContestPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const ContestPage = ({ containerRef: _containerRef }: ContestPageProps) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { onOpen: openHostRemixContest } = useHostRemixContestModal()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  const { isEnabled: isContestsEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.CONTESTS)

  const originalTrackId = useSelector(getTrackId)
  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const track = originalTrackByPermalink
  const trackId = track?.track_id ?? originalTrackId ?? undefined
  const { data: user } = useUser(track?.owner_id)

  const { data: contest } = useRemixContest(trackId)
  const eventId = contest?.eventId

  const { data: currentUserId } = useCurrentUserId()
  const { data: followState } = useEventFollowState(eventId)
  const { mutate: followEvent, isPending: isFollowing } = useFollowEvent()
  const { mutate: unfollowEvent, isPending: isUnfollowing } = useUnfollowEvent()

  const isOwner = !!currentUserId && currentUserId === track?.owner_id

  const handleToggleFollow = useRequiresAccountCallback(() => {
    if (!eventId || !currentUserId) return
    if (followState?.isFollowed) {
      unfollowEvent({ userId: currentUserId, eventId })
    } else {
      followEvent({ userId: currentUserId, eventId })
    }
  }, [
    eventId,
    currentUserId,
    followState?.isFollowed,
    followEvent,
    unfollowEvent
  ])

  const { imageUrl: coverArtUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  // Only render the Stems & Downloads panel when the track actually has
  // downloadable content. The DownloadSection component assumes a
  // downloadable track and its internal useFileSizes query throws for
  // non-downloadable tracks, blowing up the whole page via the error
  // boundary.
  const { data: downloadableFlag } = useTrack(trackId, {
    select: (t) => t?.is_downloadable
  })
  const { data: trackStems } = useStems(trackId)
  const hasDownloads =
    !!downloadableFlag || (!!trackStems && trackStems.length > 0)

  const [activeTab, setActiveTab] = useState<ContestTab>('details')

  // Lineup for the submissions tab — full TrackTile treatment.
  const lineup = useRemixesLineup({
    trackId: trackId ?? undefined,
    includeOriginal: false,
    includeWinners: true,
    isContestEntry: true,
    sortMethod: 'recent'
  })

  useEffect(() => {
    if (trackId) {
      dispatch(fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(reset())
      dispatch(remixesPageLineupActions.reset())
    }
  }, [dispatch])

  const isEnded = useMemo(() => {
    if (!contest?.endDate) return true
    return dayjs(contest.endDate).isBefore(dayjs())
  }, [contest?.endDate])

  const dueLabel = useMemo(() => {
    if (!contest?.endDate) return ''
    return formatContestDeadline(contest.endDate, 'long')
  }, [contest?.endDate])

  const submissionsCount = lineup.data?.length

  const handleEditContest = useCallback(() => {
    if (!trackId) return
    openHostRemixContest({ trackId })
  }, [trackId, openHostRemixContest])

  const handlePickWinners = useCallback(() => {
    if (!track?.permalink) return
    navigate(pickWinnersPage(track.permalink))
  }, [track?.permalink, navigate])

  const handleEnterContest = useRequiresAccountCallback(() => {
    if (!trackId) return
    // Deep-link into the upload flow with remix_of pre-filled so the
    // resulting track is linked back to the contest track. No dedicated
    // "enter-contest" route today.
    navigate(`/upload?remix_of=${trackId}`)
  }, [trackId, navigate])

  const handleShareContest = useCallback(() => {
    if (!trackId) return
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'track',
        trackId,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, trackId])

  const renderActions = useCallback(() => {
    if (!eventId) return null
    if (isOwner) {
      return (
        <Flex gap='s'>
          <Button size='small' variant='secondary' onClick={handleEditContest}>
            Edit Contest
          </Button>
          <Button size='small' onClick={handlePickWinners}>
            Pick Winners
          </Button>
        </Flex>
      )
    }
    // Public view: Share icon + Follow pill (notification-style bell) +
    // Enter Contest primary CTA, per the Figma. Enter Contest is hidden
    // once the contest has ended — "entering" isn't meaningful anymore.
    return (
      <Flex gap='s' alignItems='center'>
        <IconButton
          icon={IconShare}
          color='default'
          aria-label={messages.share}
          onClick={handleShareContest}
        />
        <Button
          size='small'
          variant={followState?.isFollowed ? 'secondary' : 'secondary'}
          iconLeft={
            followState?.isFollowed ? IconNotificationOn : IconNotificationOff
          }
          disabled={isFollowing || isUnfollowing}
          onClick={handleToggleFollow}
        >
          {followState?.isFollowed ? messages.following : messages.follow}
        </Button>
        {!isEnded ? (
          <Button size='small' onClick={handleEnterContest}>
            {messages.enterContest}
          </Button>
        ) : null}
      </Flex>
    )
  }, [
    eventId,
    isOwner,
    isEnded,
    followState?.isFollowed,
    isFollowing,
    isUnfollowing,
    handleToggleFollow,
    handleEditContest,
    handlePickWinners,
    handleShareContest,
    handleEnterContest
  ])

  // Flag gate
  if (isFlagLoaded && !isContestsEnabled) {
    return <Navigate to='/' replace />
  }

  if (!track || !user) {
    return null
  }

  // No contest row on this track — keep the minimal placeholder behaviour.
  if (!contest || !eventId) {
    return (
      <Page
        title={messages.title}
        canonicalUrl={fullContestPage(track.permalink)}
      >
        <Flex column gap='l' p='xl'>
          <Text variant='body'>
            No contest is currently running for this track.
          </Text>
        </Flex>
      </Page>
    )
  }

  return (
    <Page
      title={messages.title}
      canonicalUrl={fullContestPage(track.permalink)}
      variant='flush'
    >
      {/* Content is centered to MAX_CONTENT_WIDTH and sits on the
          page background. The hero banner is contained inside this
          column (rounded corners, full column-width) instead of
          bleeding full-page-width — matches the Figma node 2857-99124. */}
      <Box
        css={{
          maxWidth: MAX_CONTENT_WIDTH,
          margin: '0 auto',
          width: '100%'
        }}
        ph='2xl'
        pv='xl'
      >
        {/* Contained hero banner. Rounded corners, max-column-width,
            so the page background frames it on all four sides. */}
        <Box
          w='100%'
          h={HERO_HEIGHT}
          css={{
            backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: 'var(--harmony-unit-3, 12px)',
            overflow: 'hidden'
          }}
        />

        {/* Header content block — sits below the hero, no outer tile. */}
        <Box pt='xl' pb='xl'>
          {/* Row 1: Submissions Due plain label + actions. Per Figma
              this is not a chip — just uppercase label text with the
              due date below it. */}
          <Flex justifyContent='space-between' alignItems='flex-start' gap='l'>
            <Flex direction='column' gap='2xs'>
              <Text variant='label' size='s' color='subdued' strength='strong'>
                {isEnded ? messages.contestEnded : messages.submissionsDue}
              </Text>
              {dueLabel ? (
                <Text variant='label' size='l' strength='strong'>
                  {dueLabel}
                </Text>
              ) : null}
            </Flex>
            {renderActions()}
          </Flex>

          {/* Title */}
          <Box mt='l'>
            <Text variant='display' size='s'>
              {track.title} {messages.title}
            </Text>
          </Box>

          {/* Hosted By row + Countdown (4 plain columns, not a pill) */}
          <Flex
            justifyContent='space-between'
            alignItems='center'
            gap='xl'
            mt='xl'
          >
            <Flex direction='column' gap='s'>
              <Text variant='label' size='s' color='subdued' strength='strong'>
                {messages.hostedBy}
              </Text>
              <Flex gap='m' alignItems='center'>
                <Avatar userId={user.user_id} h={56} w={56} />
                <Flex direction='column'>
                  <Text variant='title' size='m'>
                    {user.name}
                  </Text>
                  <Text variant='body' size='s' color='subdued'>
                    @{user.handle}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            {!isEnded && contest.endDate ? (
              <HeaderCountdown endDate={contest.endDate} />
            ) : null}
          </Flex>
        </Box>

        {/* Tabs — only when there are submissions (Figma 1-track variant
            has no tabs). */}
        {submissionsCount && submissionsCount > 0 ? (
          <Flex gap='s' pb='m'>
            <SelectablePill
              size='large'
              isSelected={activeTab === 'details'}
              label={messages.contestDetails}
              onClick={() => setActiveTab('details')}
            />
            <SelectablePill
              size='large'
              isSelected={activeTab === 'submissions'}
              label={messages.submissionsTab(submissionsCount)}
              onClick={() => setActiveTab('submissions')}
            />
          </Flex>
        ) : null}

        {/* Tab body — 2-column layout matching Figma. Left column is
            wider (flex 1) and holds About + Prizes as stacked cards.
            Right column is fixed width and holds Stems/Followers/
            Comments as stacked cards. Each section is its OWN Paper
            with its own border; there's no single outer tile. */}
        {activeTab === 'details' ? (
          <Flex gap={`${COLUMN_GAP_PX}px` as any} alignItems='flex-start'>
            {/* Left column: About + Prizes (and Updates if we add
                host-feed parity later). Cards sit on the page
                background. */}
            <Flex
              direction='column'
              gap='l'
              css={{ flex: '1 1 auto', minWidth: 0 }}
            >
              <Paper
                direction='column'
                p='xl'
                gap='l'
                borderRadius='l'
                border='default'
                backgroundColor='white'
                shadow='flat'
              >
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  strength='strong'
                >
                  {messages.aboutThisContest}
                </Text>
                <RemixContestDetailsTab trackId={trackId!} />
              </Paper>

              <Paper
                direction='column'
                p='xl'
                gap='l'
                borderRadius='l'
                border='default'
                backgroundColor='white'
                shadow='flat'
              >
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  strength='strong'
                >
                  {messages.prizes}
                </Text>
                <RemixContestPrizesTab trackId={trackId!} />
              </Paper>
            </Flex>

            {/* Right column: Stems & Downloads + Followers + Comments. */}
            <Flex
              direction='column'
              gap='l'
              css={{
                flex: `0 0 ${RIGHT_COLUMN_WIDTH_PX}px`,
                width: RIGHT_COLUMN_WIDTH_PX
              }}
            >
              {hasDownloads ? <DownloadSection trackId={trackId!} /> : null}

              <EventFollowersCard
                eventId={eventId}
                followerCount={followState?.followerCount ?? 0}
              />

              {/* Comments tile — in-column Figma card. */}
              <ContestCommentsTile
                eventId={eventId}
                eventOwnerUserId={contest?.userId}
                mode='comments'
              />
            </Flex>
          </Flex>
        ) : null}

        {activeTab === 'submissions' ? (
          <Paper
            direction='column'
            p='xl'
            borderRadius='l'
            border='default'
            shadow='flat'
            backgroundColor='white'
          >
            <TanQueryLineup
              data={lineup.data}
              isFetching={lineup.isFetching}
              isPending={lineup.isPending}
              isError={lineup.isError}
              hasNextPage={lineup.hasNextPage}
              play={lineup.play}
              pause={lineup.pause}
              loadNextPage={lineup.loadNextPage}
              isPlaying={lineup.isPlaying}
              lineup={lineup.lineup}
              pageSize={CONTEST_PAGE_SIZE}
              actions={remixesPageLineupActions}
            />
          </Paper>
        ) : null}
      </Box>
    </Page>
  )
}

export default ContestPage
