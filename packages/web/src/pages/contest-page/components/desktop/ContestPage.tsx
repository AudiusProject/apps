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

import { ContestCommentsSection } from '../ContestCommentsSection'
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
const RIGHT_COLUMN_WIDTH_PX = 400
const COLUMN_GAP_PX = 24

type ContestTab = 'details' | 'submissions'

// Inline countdown pill matching the Figma/track-page treatment.
// A single rounded dark pill containing four unit columns separated
// by vertical dividers. The track-page `RemixContestCountdown`
// absolutely positions itself over the hero banner and renders
// semi-transparent white over a purple gradient — here we want a
// solid readable pill against the gray page background, so we
// render our own with inverse text on a dark Paper.
const CountdownTile = ({
  value,
  label,
  isSubdued
}: {
  value: number
  label: string
  isSubdued?: boolean
}) => (
  <Flex direction='column' alignItems='center' gap='2xs' w={48}>
    <Text
      variant='heading'
      size='s'
      color={isSubdued ? 'subdued' : 'staticWhite'}
    >
      {String(value).padStart(2, '0')}
    </Text>
    <Text variant='label' size='xs' color='subdued'>
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

  // Subdue leading zeros so the most-significant non-zero unit reads first.
  const daysSubdued = days === 0
  const hoursSubdued = daysSubdued && hours === 0
  const minsSubdued = hoursSubdued && mins === 0

  return (
    <Paper
      pv='s'
      ph='l'
      gap='l'
      alignItems='center'
      borderRadius='l'
      shadow='near'
      css={{
        backgroundColor: 'var(--harmony-static-neutral, #1A1818)'
      }}
    >
      <CountdownTile
        value={days}
        label={messages.days}
        isSubdued={daysSubdued}
      />
      <Divider
        orientation='vertical'
        css={{
          height: 32,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSubdued}
      />
      <Divider
        orientation='vertical'
        css={{
          height: 32,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      />
      <CountdownTile
        value={mins}
        label={messages.mins}
        isSubdued={minsSubdued}
      />
      <Divider
        orientation='vertical'
        css={{
          height: 32,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      />
      <CountdownTile value={secs} label={messages.secs} isSubdued={false} />
    </Paper>
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
      <Box w='100%'>
        {/* Hero banner: track artwork blown up and cropped. This is the */}
        {/* closest analog to the "Explore Banner" in the design without */}
        {/* introducing a new per-contest cover-photo field. */}
        <Box
          w='100%'
          h={HERO_HEIGHT}
          css={{
            backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Centered content column. Sits BELOW the hero on the page
            background — the header content (chip, title, hosted by,
            countdown) renders in default dark text on the gray page,
            and the main tile starts below. Keeps the layout predictable
            without fighting white-on-white states when text happens to
            fall on the main tile. */}
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
          ph='2xl'
          pv='xl'
        >
          {/* Header content block. */}
          <Box pb='xl'>
            {/* Row 1: Submissions Due purple chip + actions */}
            <Flex
              justifyContent='space-between'
              alignItems='flex-start'
              gap='l'
            >
              <Box
                ph='m'
                pv='xs'
                borderRadius='s'
                css={{
                  backgroundColor: 'var(--harmony-accent-purple, #7E1BCC)'
                }}
              >
                <Text
                  variant='label'
                  size='s'
                  color='staticWhite'
                  strength='strong'
                >
                  {isEnded
                    ? messages.contestEnded
                    : dueLabel
                      ? `${messages.submissionsDue} ${dueLabel}`
                      : messages.submissionsDue}
                </Text>
              </Box>
              {renderActions()}
            </Flex>

            {/* Title */}
            <Box mt='l'>
              <Text variant='display' size='s'>
                {track.title} {messages.title}
              </Text>
            </Box>

            {/* Hosted By row + Countdown */}
            <Flex
              justifyContent='space-between'
              alignItems='center'
              gap='xl'
              mt='xl'
            >
              <Flex direction='column' gap='s'>
                <Text
                  variant='label'
                  size='s'
                  color='subdued'
                  strength='strong'
                >
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

          {/* Tabs — sit above the main tile, on page background. */}
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

          {/* Tab body */}
          {activeTab === 'details' ? (
            <Flex direction='column' gap='l'>
              {/* Main details tile: About + Prizes (left) and the
                  Stems/Followers stack (right), all wrapped in a
                  single elevated Paper tile. Matches the track
                  page's main-tile treatment. */}
              <Paper
                direction='column'
                p='xl'
                borderRadius='l'
                border='default'
                shadow='mid'
                backgroundColor='white'
              >
                <Flex
                  gap={`${COLUMN_GAP_PX}px` as any}
                  alignItems='flex-start'
                >
                  {/* Left column: About + Prizes */}
                  <Flex
                    direction='column'
                    gap='2xl'
                    css={{ flex: '1 1 auto', minWidth: 0 }}
                  >
                    <Flex direction='column' gap='l'>
                      <Text
                        variant='label'
                        size='s'
                        color='subdued'
                        strength='strong'
                      >
                        {messages.aboutThisContest}
                      </Text>
                      <RemixContestDetailsTab trackId={trackId!} />
                    </Flex>

                    <Divider />

                    <Flex direction='column' gap='l'>
                      <Text
                        variant='label'
                        size='s'
                        color='subdued'
                        strength='strong'
                      >
                        {messages.prizes}
                      </Text>
                      <RemixContestPrizesTab trackId={trackId!} />
                    </Flex>
                  </Flex>

                  {/* Right column: Stems & Downloads + Followers.
                      Each is already a Paper on its own, so inside the
                      outer tile they read as nested sub-cards — the
                      track page treats the downloadable section the
                      same way. */}
                  <Flex
                    direction='column'
                    gap='l'
                    css={{
                      flex: `0 0 ${RIGHT_COLUMN_WIDTH_PX}px`,
                      width: RIGHT_COLUMN_WIDTH_PX
                    }}
                  >
                    {hasDownloads ? (
                      <DownloadSection trackId={trackId!} />
                    ) : null}

                    <EventFollowersCard
                      eventId={eventId}
                      followerCount={followState?.followerCount ?? 0}
                    />
                  </Flex>
                </Flex>
              </Paper>

              {/* Comments tile — full width below the main tile. */}
              <Paper
                direction='column'
                p='xl'
                borderRadius='l'
                border='default'
                shadow='mid'
                backgroundColor='white'
              >
                <ContestCommentsSection
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                  mode='comments'
                />
              </Paper>

              {/* Updates tile — full width below Comments. The host posts
                  contest updates here; these fan out as notifications to
                  contest followers via the event-comments indexer. */}
              <Paper
                direction='column'
                p='xl'
                borderRadius='l'
                border='default'
                shadow='mid'
                backgroundColor='white'
              >
                <ContestCommentsSection
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                  mode='updates'
                />
              </Paper>
            </Flex>
          ) : null}

          {activeTab === 'submissions' ? (
            <Paper
              direction='column'
              p='xl'
              borderRadius='l'
              border='default'
              shadow='mid'
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
      </Box>
    </Page>
  )
}

export default ContestPage
