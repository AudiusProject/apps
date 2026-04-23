import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useRemixes,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByPermalink,
  useUnfollowEvent,
  useUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { SquareSizes, ShareSource } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors,
  shareModalUIActions,
  useHostRemixContestModal
} from '@audius/common/store'
import { dayjs, getLocalTimezone, route } from '@audius/common/utils'
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

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { Avatar } from 'components/avatar/Avatar'
import Page from 'components/page/Page'
import UserBadges from 'components/user-badges/UserBadges'
import { UserGeneratedText } from 'components/user-generated-text'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { fullContestPage, hostRemixContestPage } from 'utils/route'

import {
  ContestFadeIn,
  ContestPageDesktopSkeleton
} from '../../ContestPageSkeletons'
import { ContestCommentsTile } from '../ContestCommentsTile'
import { ContestFollowersModal } from '../ContestFollowersModal'
import { ContestPickWinnersSection } from '../ContestPickWinnersSection'
import { ContestRemixesStyleSubmissions } from '../ContestRemixesStyleSubmissions'
import { ContestStemsCard } from '../ContestStemsCard'
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
  secs: 'Secs',
  coSigned: 'Co-Signed',
  sortRecent: 'Most Recent',
  sortPlays: 'Most Plays',
  sortFavorites: 'Most Favorites',
  noContestForTrack: 'No contest is currently running for this track.'
}

const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

export const CONTEST_PAGE_SIZE = 10

const HERO_HEIGHT = 288
const MAX_CONTENT_WIDTH = 1080
const RIGHT_COLUMN_WIDTH_PX = 360

type ContestTab = 'details' | 'submissions'

// Figma-aligned countdown (node 2857-99182). Four plain columns
// separated by thin vertical dividers. Number and label share the
// same text color (both `default`, or both `subdued` when the unit
// is a leading zero). Leading-zero units read as subdued so the
// most-significant non-zero unit pulls focus.
const CountdownTile = ({
  value,
  label,
  isSubdued
}: {
  value: number
  label: string
  isSubdued?: boolean
}) => (
  <Flex direction='column' alignItems='center' gap='2xs' w={56}>
    <Text variant='heading' size='l' color={isSubdued ? 'subdued' : 'default'}>
      {String(value).padStart(2, '0')}
    </Text>
    <Text variant='label' size='xs' color={isSubdued ? 'subdued' : 'default'}>
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
    <Flex gap='l' alignItems='center'>
      <CountdownTile
        value={days}
        label={messages.days}
        isSubdued={daysSubdued}
      />
      <Divider orientation='vertical' css={{ height: 40 }} />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSubdued}
      />
      <Divider orientation='vertical' css={{ height: 40 }} />
      <CountdownTile
        value={mins}
        label={messages.mins}
        isSubdued={minsSubdued}
      />
      <Divider orientation='vertical' css={{ height: 40 }} />
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

  const { data: contest, isPending: isRemixContestPending } =
    useRemixContest(trackId)
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
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false)

  // Submissions tab filter state — reads from + writes to URL search
  // params so deep links + back/forward work the same way they do on
  // the track-page `RemixesPage` (the reference component for this
  // filter bar).
  const { sortMethod, isCosign, isContestEntry } = useRemixPageParams()
  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')
  const updateIsContestEntryParam = useUpdateSearchParams('isContestEntry')

  const { data: remixPages } = useRemixes({
    trackId: trackId ?? undefined,
    isContestEntry: true
  })
  const remixCount = remixPages?.pages[0]?.count ?? 0

  const isEnded = useMemo(() => {
    if (!contest?.endDate) return true
    return dayjs(contest.endDate).isBefore(dayjs())
  }, [contest?.endDate])

  const showOwnerPickWinners = isOwner && isEnded && remixCount > 0

  // Lineup for the submissions tab — mirrors track RemixesPage when not in
  // owner pick-winners mode (original + winners + filtered submissions).
  const lineup = useRemixesLineup(
    {
      trackId: trackId ?? undefined,
      includeOriginal: true,
      includeWinners: true,
      isContestEntry,
      sortMethod,
      isCosign
    },
    { enabled: !!trackId && !showOwnerPickWinners }
  )

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

  // Split the deadline into date + time so each part can be styled
  // independently — Figma 2888-131667 shows the date in strong
  // uppercase next to a lighter subdued time.
  const deadlineParts = useMemo(() => {
    if (!contest?.endDate) return null
    const d = dayjs(contest.endDate)
    return {
      date: d.format('MMM D, YYYY').toUpperCase(),
      time: `${d.format('h:mm A')} (${getLocalTimezone()})`
    }
  }, [contest?.endDate])

  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const submissionsCount = showOwnerPickWinners
    ? remixCount
    : (lineup.data?.length ?? lineup.count)

  const handleEditContest = useCallback(() => {
    if (track?.permalink) {
      navigate(hostRemixContestPage(track.permalink))
      return
    }
    if (trackId) {
      // Fallback to the legacy modal if we somehow don't have a permalink
      // for the track (which the page navigation route is built from).
      openHostRemixContest({ trackId })
    }
  }, [track?.permalink, trackId, navigate, openHostRemixContest])

  const handleEnterContest = useRequiresAccountCallback(() => {
    if (!trackId) return
    // Deep-link into the upload flow with remix_of pre-filled so the
    // resulting track is linked back to the contest track. No dedicated
    // "enter-contest" route today.
    navigate(`/upload?remix_of=${trackId}`)
  }, [trackId, navigate])

  const handleShareContest = useCallback(() => {
    if (!trackId) return
    // `type: 'contest'` routes through the contest share content
    // variant so the modal's copy-link + X share use the contest
    // URL (`{permalink}/contest`) rather than the parent track.
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'contest',
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

  if (isRemixContestPending) {
    return (
      <Page
        title={messages.title}
        canonicalUrl={fullContestPage(track.permalink)}
        variant='flush'
      >
        <ContestPageDesktopSkeleton />
      </Page>
    )
  }

  // No contest row on this track — keep the minimal placeholder behaviour.
  if (!contest || !eventId) {
    return (
      <Page
        title={messages.title}
        canonicalUrl={fullContestPage(track.permalink)}
      >
        <ContestFadeIn>
          <Flex column gap='l' p='xl'>
            <Text variant='body'>{messages.noContestForTrack}</Text>
          </Flex>
        </ContestFadeIn>
      </Page>
    )
  }

  return (
    <Page
      title={messages.title}
      canonicalUrl={fullContestPage(track.permalink)}
      variant='flush'
    >
      <ContestFadeIn>
        {/* Content is centered to MAX_CONTENT_WIDTH and sits on the
          page background. Per Figma node 2857-99152 the entire header
          (hero banner + submissions due + actions + title + divider +
          hosted by + countdown) lives inside a single rounded Paper
          tile — the hero is the top "photo" of the Paper, body content
          sits below it with matching padding. */}
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
          ph='2xl'
          pv='xl'
        >
          <Paper
            direction='column'
            borderRadius='l'
            border='default'
            shadow='flat'
            backgroundColor='white'
            css={{ overflow: 'hidden' }}
          >
            {/* Hero banner at the top of the Paper. The Paper's
              `overflow: hidden` clips the banner to the outer
              rounded corners so the top edge matches the Paper
              radius. */}
            <Box
              w='100%'
              h={HERO_HEIGHT}
              css={{
                backgroundImage: coverArtUrl
                  ? `url(${coverArtUrl})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />

            {/* Header body content — padded section below the hero. */}
            <Box p='xl'>
              {/* Row 1: Submissions Due plain label + actions. Per Figma
                this is not a chip — just uppercase label text with the
                due date below it. */}
              <Flex
                justifyContent='space-between'
                alignItems='flex-start'
                gap='l'
              >
                <Flex direction='column' gap='2xs'>
                  <Text variant='label' size='m' color='subdued'>
                    {isEnded ? messages.contestEnded : messages.submissionsDue}
                  </Text>
                  {deadlineParts ? (
                    <Flex alignItems='baseline' gap='s' wrap='wrap'>
                      {/* label / l / regular — matches native + Figma spec. */}
                      <Text variant='label' size='l'>
                        {deadlineParts.date}
                      </Text>
                      <Text variant='label' size='l' color='subdued'>
                        {deadlineParts.time}
                      </Text>
                    </Flex>
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

              {/* Horizontal divider separating title from host row. */}
              <Box mv='l'>
                <Divider />
              </Box>

              {/* Hosted By row + Countdown (4 plain columns, not a pill).
                The avatar + name/@handle stack is wrapped in
                `ArtistPopover` so hovering surfaces the standard
                artist tile used throughout Audius (profile preview,
                follow button). Avatar + name link directly to the
                profile page. Without this the host row was a plain
                visual with no navigation or hover card. */}
              <Flex justifyContent='space-between' alignItems='center' gap='xl'>
                <Flex direction='column' gap='s'>
                  <Text variant='label' size='m' color='subdued'>
                    {messages.hostedBy}
                  </Text>
                  <ArtistPopover handle={user.handle}>
                    <Flex
                      gap='m'
                      alignItems='center'
                      onClick={() => navigate(route.profilePage(user.handle))}
                      css={{ cursor: 'pointer' }}
                    >
                      <Avatar userId={user.user_id} h={56} w={56} />
                      <Flex direction='column'>
                        <Flex gap='xs' alignItems='center'>
                          <Text variant='title' size='m'>
                            {user.name}
                          </Text>
                          <UserBadges userId={user.user_id} size='s' />
                        </Flex>
                        <Text variant='body' size='s' color='subdued'>
                          @{user.handle}
                        </Text>
                      </Flex>
                    </Flex>
                  </ArtistPopover>
                </Flex>
                {!isEnded && contest.endDate ? (
                  <HeaderCountdown endDate={contest.endDate} />
                ) : null}
              </Flex>
            </Box>
          </Paper>

          {/* Spacer between the header Paper and the tab row below. */}
          <Box pt='xl' />

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
            <Flex gap='xl' alignItems='flex-start'>
              {/* Left column: About + Prizes (and Updates if we add
                host-feed parity later). Cards sit on the page
                background. */}
              <Flex
                direction='column'
                gap='l'
                css={{ flex: '1 1 auto', minWidth: 0 }}
              >
                {/* About — render description inline (same pattern as
                  mobile-web). Using the shared `RemixContestDetailsTab`
                  here previously double-padded the card AND prepended a
                  "Submission Due:" row that duplicated the page
                  header's deadline. */}
                <Paper
                  direction='column'
                  p='xl'
                  gap='l'
                  borderRadius='l'
                  border='default'
                  backgroundColor='white'
                  shadow='flat'
                >
                  <Text variant='label' size='m' color='subdued'>
                    {messages.aboutThisContest}
                  </Text>
                  <UserGeneratedText variant='body'>
                    {(contest.eventData as any)?.description ??
                      'Enter my remix contest before the deadline for your chance to win!'}
                  </UserGeneratedText>
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
                  <Text variant='label' size='m' color='subdued'>
                    {messages.prizes}
                  </Text>
                  {/* Inline prize info — avoids the `p='xl'` the
                    track-page `RemixContestPrizesTab` adds, which
                    double-padded this card. */}
                  <UserGeneratedText variant='body'>
                    {(contest.eventData as any)?.prizeInfo ?? ''}
                  </UserGeneratedText>
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
                {hasDownloads ? <ContestStemsCard trackId={trackId!} /> : null}

                <EventFollowersCard
                  eventId={eventId}
                  followerCount={followState?.followerCount ?? 0}
                  onOpenLeaderboard={() => setIsFollowersModalOpen(true)}
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

          <ContestFollowersModal
            eventId={eventId}
            isOpen={isFollowersModalOpen}
            onClose={() => setIsFollowersModalOpen(false)}
          />

          {activeTab === 'submissions' ? (
            showOwnerPickWinners && trackId ? (
              // Pick-winners is a unique interactive panel — keep it
              // framed in its own Paper so the dropzones + reorder
              // rows have a visible container. This is the only
              // variant of the submissions tab that still uses a card
              // wrapper.
              <Paper
                direction='column'
                p='xl'
                gap='l'
                borderRadius='l'
                border='default'
                shadow='flat'
                backgroundColor='white'
              >
                <ContestPickWinnersSection
                  trackId={trackId}
                  showEmbeddedFinalizeButton
                  onFinalizeNavigate={() =>
                    navigate(fullContestPage(track.permalink))
                  }
                />
              </Paper>
            ) : (
              // Regular submissions lineup — render directly on the
              // page background like the old `RemixesPage` (and the
              // Feed). TrackTiles already own their own card surface;
              // wrapping them in an extra Paper was nesting a card in
              // a card, which is what made the colors look wrong. No
              // extra "Submissions (N)" heading above the lineup:
              // the selected tab pill right above already reads
              // `Submissions (N)`, so an inline duplicate was
              // redundant. The lineup itself leads with "Original
              // Track" + winners + the filter bar via its
              // `delineatorMap`.
              <ContestRemixesStyleSubmissions
                lineup={lineup}
                pageSize={CONTEST_PAGE_SIZE}
                winnerCount={winnerCount}
                sortMethod={sortMethod}
                isCosign={isCosign}
                isContestEntry={isContestEntry}
                updateSortParam={updateSortParam}
                updateIsCosignParam={updateIsCosignParam}
                updateIsContestEntryParam={updateIsContestEntryParam}
              />
            )
          ) : null}
        </Box>
      </ContestFadeIn>
    </Page>
  )
}

export default ContestPage
