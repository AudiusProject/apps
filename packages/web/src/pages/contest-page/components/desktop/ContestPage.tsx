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
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors
} from '@audius/common/store'
import {
  dayjs,
  formatContestDeadline,
  formatCount
} from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconUserFollow,
  IconUserFollowing,
  Paper,
  SelectablePill,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useParams } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { DownloadSection } from 'components/track/DownloadSection'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { RemixContestDetailsTab } from 'pages/track-page/components/desktop/RemixContestDetailsTab'
import { RemixContestPrizesTab } from 'pages/track-page/components/desktop/RemixContestPrizesTab'
import { fullContestPage } from 'utils/route'

import { ContestCommentsSection } from '../ContestCommentsSection'

const messages = {
  title: 'Remix Contest',
  follow: 'Follow Contest',
  following: 'Following',
  submissionsDue: 'Submissions Due:',
  contestEnded: 'Contest Ended',
  hostedBy: 'Hosted By',
  followers: 'Followers',
  contestDetails: 'Contest Details',
  submissionsTab: (n?: number) =>
    n === undefined || n === null ? 'Submissions' : `Submissions (${n})`,
  details: 'Details',
  prizes: 'Prizes',
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

// Inline countdown tile matching the design. The existing
// RemixContestCountdown component absolutely-positions itself on the track
// page and is too compact for the hero-sized treatment the contest page
// calls for. Four 52-wide tiles split by vertical dividers.
const CountdownTile = ({
  value,
  label,
  isSubdued
}: {
  value: number
  label: string
  isSubdued?: boolean
}) => (
  <Flex direction='column' alignItems='center' gap='xs' w={52}>
    <Text variant='heading' size='l' color={isSubdued ? 'subdued' : 'default'}>
      {String(value).padStart(2, '0')}
    </Text>
    <Text variant='label' size='s' color='subdued'>
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
    <Flex gap='l' alignItems='center'>
      <CountdownTile
        value={days}
        label={messages.days}
        isSubdued={daysSubdued}
      />
      <Divider orientation='vertical' css={{ height: 52 }} />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSubdued}
      />
      <Divider orientation='vertical' css={{ height: 52 }} />
      <CountdownTile
        value={mins}
        label={messages.mins}
        isSubdued={minsSubdued}
      />
      <Divider orientation='vertical' css={{ height: 52 }} />
      <CountdownTile value={secs} label={messages.secs} isSubdued={false} />
    </Flex>
  )
}

type ContestPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const ContestPage = ({ containerRef: _containerRef }: ContestPageProps) => {
  const dispatch = useDispatch()
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

  const renderActions = useCallback(() => {
    if (!eventId) return null
    if (isOwner) {
      return (
        <Flex gap='s'>
          <Button size='small' variant='secondary'>
            Edit Contest
          </Button>
          <Button size='small'>Pick Winners</Button>
        </Flex>
      )
    }
    return (
      <Button
        size='small'
        variant={followState?.isFollowed ? 'secondary' : 'primary'}
        iconLeft={followState?.isFollowed ? IconUserFollowing : IconUserFollow}
        disabled={isFollowing || isUnfollowing}
        onClick={handleToggleFollow}
      >
        {followState?.isFollowed ? messages.following : messages.follow}
      </Button>
    )
  }, [
    eventId,
    isOwner,
    followState?.isFollowed,
    isFollowing,
    isUnfollowing,
    handleToggleFollow
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

        {/* Header content block */}
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
          ph='2xl'
          pv='xl'
        >
          {/* Row 1: Submissions Due / Contest Ended + actions */}
          <Flex justifyContent='space-between' alignItems='flex-start' gap='l'>
            <Flex direction='column' gap='xs'>
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

          <Box mv='xl'>
            <Divider />
          </Box>

          {/* Hosted By row + Countdown */}
          <Flex justifyContent='space-between' alignItems='center' gap='xl'>
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
                    {formatCount(user.follower_count ?? 0)}{' '}
                    {messages.followers}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            {!isEnded && contest.endDate ? (
              <HeaderCountdown endDate={contest.endDate} />
            ) : null}
          </Flex>
        </Box>

        {/* Tabs */}
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
          ph='2xl'
          pv='m'
        >
          <Flex gap='s'>
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
        </Box>

        {/* Tab body */}
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
          ph='2xl'
          pb='2xl'
        >
          {activeTab === 'details' ? (
            <Flex
              gap={`${COLUMN_GAP_PX}px` as any}
              alignItems='flex-start'
              pv='l'
            >
              {/* Left column: About + Prizes + Updates feed */}
              <Flex
                direction='column'
                gap='2xl'
                css={{ flex: '1 1 auto', minWidth: 0 }}
              >
                <Flex direction='column' gap='l'>
                  <Text variant='heading' size='s'>
                    {messages.details}
                  </Text>
                  <RemixContestDetailsTab trackId={trackId!} />
                </Flex>

                <Divider />

                <Flex direction='column' gap='l'>
                  <Text variant='heading' size='s'>
                    {messages.prizes}
                  </Text>
                  <RemixContestPrizesTab trackId={trackId!} />
                </Flex>

                <Divider />

                {/* Updates feed: host top-level posts only. Composer is
                    scoped to the host via the same `mode='updates'`. */}
                <ContestCommentsSection
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                  mode='updates'
                />
              </Flex>

              {/* Right column: Stems & Downloads / Followers / Comments */}
              <Flex
                direction='column'
                gap='l'
                css={{
                  flex: `0 0 ${RIGHT_COLUMN_WIDTH_PX}px`,
                  width: RIGHT_COLUMN_WIDTH_PX
                }}
              >
                {/* DownloadSection already renders its own "Stems &
                    Downloads" title, stems list, expand/collapse, and
                    access/gating state. Only mount it when the track
                    is downloadable — the component assumes that and
                    its useFileSizes query errors otherwise. */}
                {hasDownloads ? <DownloadSection trackId={trackId!} /> : null}

                {/* Followers card. Until there's an
                    /events/:eventId/followers list endpoint, we render
                    just the count (no avatar stack / leaderboard). */}
                <Paper
                  direction='column'
                  borderRadius='m'
                  border='default'
                  css={{ backgroundColor: 'var(--harmony-white)' }}
                >
                  <Flex p='l' gap='xs' alignItems='baseline'>
                    <Text variant='heading' size='s'>
                      {messages.followers}
                    </Text>
                    <Text variant='heading' size='s' color='subdued'>
                      ({formatCount(followState?.followerCount ?? 0)})
                    </Text>
                  </Flex>
                </Paper>

                <ContestCommentsSection
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                  mode='comments'
                />
              </Flex>
            </Flex>
          ) : (
            <Flex direction='column' gap='l' pv='l'>
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
            </Flex>
          )}
        </Box>
      </Box>
    </Page>
  )
}

export default ContestPage
