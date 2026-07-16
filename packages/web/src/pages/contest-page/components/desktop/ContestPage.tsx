import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getRemixesQueryKey,
  useCurrentUserId,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useRemixesCount,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByPermalink,
  useUnfollowEvent,
  useUser
} from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Name, SquareSizes, ShareSource } from '@audius/common/models'
import {
  remixesPageActions,
  remixesPageSelectors,
  shareModalUIActions,
  useHostRemixContestModal
} from '@audius/common/store'
import { dayjs, getLocalTimezone, route } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  FilterButton,
  Flex,
  IconShare,
  IconUserFollow,
  IconUserFollowing,
  IconUserUnfollow,
  Paper,
  SelectablePill,
  Skeleton,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router'

import { ArtistPopover } from 'components/artist/ArtistPopover'
import { Avatar } from 'components/avatar/Avatar'
import { TrackLineup } from 'components/lineup/TrackLineup'
import Page from 'components/page/Page'
import UserBadges from 'components/user-badges/UserBadges'
import { UserGeneratedText } from 'components/user-generated-text'
import { VideoEmbed } from 'components/video-embed/VideoEmbed'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { make, track as trackEvent } from 'services/analytics'
import {
  fullContestPage,
  hostRemixContestPage,
  pickWinnersPage
} from 'utils/route'

import { useEnterContest } from '../../hooks/useEnterContest'
import { ContestCommentsTile } from '../ContestCommentsTile'
import { ContestFollowersModal } from '../ContestFollowersModal'
import { ContestStemsCard } from '../ContestStemsCard'
import { EventFollowersCard } from '../EventFollowersCard'
import { PostUpdateComposer } from '../PostUpdateComposer'

const messages = {
  title: 'Remix Contest',
  enterContest: 'Enter Contest',
  follow: 'Follow',
  following: 'Following',
  unfollow: 'Unfollow',
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
  sortFavorites: 'Most Favorites'
}

const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

export const CONTEST_PAGE_SIZE = 10

// Fluid hero: clamps between the mobile-web height (≈220) and the design
// spec height (288). The `cqi` unit is relative to the named `contest`
// container so the hero tracks the real content width (collapsed sidebar,
// resizable nav) rather than the viewport.
const HERO_MIN_HEIGHT = 220
const HERO_MAX_HEIGHT = 288
const MAX_CONTENT_WIDTH = 1080
const RIGHT_COLUMN_WIDTH_PX = 360
// Container-query breakpoints. These stack the header rows and the
// details two-column layout when the desktop shell gets narrow
// (collapsed sidebar, short window, resizable main pane) without
// needing a viewport-based `useIsMobile()` check. Mobile web still
// renders the dedicated mobile file via the parent router.
const DETAILS_STACK_BREAKPOINT_PX = 900
const HEADER_STACK_BREAKPOINT_PX = 640

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
  <Flex direction='column' alignItems='center' gap='2xs' css={{ flex: 1 }}>
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
    <Flex
      gap='l'
      alignItems='center'
      css={{
        // When the header stacks below `HEADER_STACK_BREAKPOINT_PX` the
        // countdown sits on its own row and should fill the row instead
        // of hugging the right edge.
        [`@container contest (max-width: ${HEADER_STACK_BREAKPOINT_PX}px)`]: {
          width: '100%',
          justifyContent: 'space-between',
          gap: 'var(--harmony-unit-2)'
        }
      }}
    >
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
  const { data: followState, isPending: isFollowStatePending } =
    useEventFollowState(eventId)
  const { mutate: followEvent } = useFollowEvent()
  const { mutate: unfollowEvent } = useUnfollowEvent()
  // Drives the Following → Unfollow label swap on hover for the contest
  // follow button. Local state keeps the parity with FollowButton's old
  // behavior without bringing back the size mismatch.
  const [isFollowHovering, setIsFollowHovering] = useState(false)

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

  const { imageUrl: trackCoverArtUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const coverArtUrl = contest?.eventData?.coverPhotoUrl || trackCoverArtUrl

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
  const { sortMethod, isCosign } = useRemixPageParams()
  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')

  // Lineup for the submissions tab — full TrackTile treatment. Includes
  // the original (parent) track at the top of the lineup so viewers can
  // compare the source the remixes are built on without jumping back out
  // to the track page, matching the track-page `RemixesPage`.
  const remixesLineupArgs = useMemo(
    () => ({
      trackId: trackId ?? undefined,
      includeOriginal: true,
      includeWinners: true,
      isContestEntry: true,
      pageSize: CONTEST_PAGE_SIZE,
      sortMethod,
      isCosign
    }),
    [trackId, sortMethod, isCosign]
  )
  const lineup = useRemixesLineup(remixesLineupArgs)
  const lineupTrackIds = useMemo(
    () => (lineup.data ?? []).map((d) => d.id as ID),
    [lineup.data]
  )
  const submissionsQuerySource = useMemo(
    () => ({
      queryKey: [...getRemixesQueryKey(remixesLineupArgs)] as unknown[]
    }),
    [remixesLineupArgs]
  )

  useEffect(() => {
    if (trackId) {
      dispatch(fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(reset())
    }
  }, [dispatch])

  // Fire a Remix Contest: View event the first time the page resolves a
  // trackId + eventId for the contest. Guard with a ref so navigating
  // between contest tabs (which doesn't unmount the page) doesn't
  // re-fire the event.
  const hasFiredViewRef = useRef(false)
  useEffect(() => {
    if (hasFiredViewRef.current) return
    if (trackId == null || eventId == null) return
    hasFiredViewRef.current = true
    trackEvent(
      make({
        eventName: Name.REMIX_CONTEST_VIEW,
        remixContestId: eventId,
        trackId
      })
    )
  }, [trackId, eventId])

  const isEnded = useMemo(() => {
    if (!contest?.endDate) return true
    return dayjs(contest.endDate).isBefore(dayjs())
  }, [contest?.endDate])

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

  // Submissions count comes from the API total (count-only query) so
  // the SelectablePill matches the contest card on the explore grid.
  // Previously this was derived from `lineupTrackIds.length`, which
  // only reflects what infinite-scroll has loaded — the count crept
  // up as the user scrolled rather than reading as a stable total.
  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const { data: submissionsCount } = useRemixesCount(
    { trackId, isContestEntry: true },
    { enabled: !!trackId, staleTime: 60_000 }
  )

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

  const handlePickWinners = useCallback(() => {
    if (!track?.permalink) return
    navigate(pickWinnersPage(track.permalink))
  }, [track?.permalink, navigate])

  // Deep-link into the upload flow with the source track's artwork +
  // genre + remix_of pre-filled. See `useEnterContest` for the full
  // shape; reused across the desktop + mobile contest pages and the
  // mobile track-page contest details tab so submitters get the same
  // pre-filled form regardless of entry point.
  const enterContest = useEnterContest(trackId)
  const handleEnterContest = useCallback(async () => {
    if (trackId != null && eventId != null) {
      trackEvent(
        make({
          eventName: Name.REMIX_CONTEST_ENTER,
          remixContestId: eventId,
          trackId
        })
      )
    }
    await enterContest()
  }, [enterContest, trackId, eventId])

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
        <Flex gap='s' wrap='wrap'>
          <Button size='small' variant='secondary' onClick={handleEditContest}>
            Edit Contest
          </Button>
          <Button size='small' onClick={handlePickWinners}>
            Pick Winners
          </Button>
        </Flex>
      )
    }
    // Public view: Share icon + Follow / Following + Enter Contest, all
    // size='small' (h=32) to match Figma 2857:94748. Renders the
    // Follow / Following / Unfollow swap on the regular Button so its
    // height aligns with the Enter Contest CTA next to it (FollowButton
    // is 28px tall at small, which produced a visual mismatch).
    const isFollowed = !!followState?.isFollowed
    let followIcon = IconUserFollow
    let followLabel = messages.follow
    if (isFollowed && !isFollowHovering) {
      followIcon = IconUserFollowing
      followLabel = messages.following
    } else if (isFollowed && isFollowHovering) {
      followIcon = IconUserUnfollow
      followLabel = messages.unfollow
    }
    return (
      <Flex gap='s' alignItems='center' wrap='wrap'>
        <Button
          size='small'
          variant='secondary'
          iconLeft={IconShare}
          aria-label={messages.share}
          onClick={handleShareContest}
        />
        <Button
          size='small'
          variant={isFollowed ? 'primary' : 'secondary'}
          iconLeft={followIcon}
          // While the follow state is still loading, render a spinner-only
          // button (fixed width keeps layout stable) so it doesn't flash
          // "Follow" before snapping to "Following" for users who already
          // follow the contest.
          isLoading={isFollowStatePending}
          onClick={handleToggleFollow}
          onMouseEnter={() => setIsFollowHovering(true)}
          onMouseLeave={() => setIsFollowHovering(false)}
          css={{ width: 112, justifyContent: 'center' }}
        >
          {isFollowStatePending ? '' : followLabel}
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
    isFollowStatePending,
    isFollowHovering,
    handleToggleFollow,
    handleEditContest,
    handlePickWinners,
    handleShareContest,
    handleEnterContest
  ])

  if (!track || !user) {
    return null
  }

  // Contest hasn't resolved yet (or no contest exists for this track).
  // Render a skeleton matching the page layout instead of the old
  // "No contest is currently running" copy — covers the initial-load
  // flash and avoids a confusing empty state.
  if (!contest || !eventId) {
    return (
      <Page
        title={messages.title}
        canonicalUrl={fullContestPage(track.permalink)}
        variant='flush'
      >
        <Box
          css={{
            maxWidth: MAX_CONTENT_WIDTH,
            margin: '0 auto',
            width: '100%'
          }}
        >
          <Box
            css={{
              paddingInline: 'var(--harmony-unit-8)',
              paddingBlock: 'var(--harmony-unit-6)'
            }}
          >
            <Paper
              direction='column'
              borderRadius='l'
              border='default'
              shadow='flat'
              backgroundColor='white'
              css={{ overflow: 'hidden' }}
            >
              <Skeleton h={HERO_MIN_HEIGHT} w='100%' />
              <Flex direction='column' gap='l' p='2xl'>
                <Flex
                  justifyContent='space-between'
                  alignItems='center'
                  gap='m'
                >
                  <Skeleton h={20} w={140} />
                  <Flex gap='s'>
                    <Skeleton h={32} w={48} />
                    <Skeleton h={32} w={120} />
                    <Skeleton h={32} w={120} />
                  </Flex>
                </Flex>
                <Skeleton h={36} w='60%' />
                <Divider orientation='horizontal' />
                <Flex gap='m' alignItems='center'>
                  <Skeleton h={40} w={40} css={{ borderRadius: '50%' }} />
                  <Flex direction='column' gap='2xs' flex='1 1 auto'>
                    <Skeleton h={12} w={100} />
                    <Skeleton h={18} w={180} />
                  </Flex>
                </Flex>
                <Flex gap='m'>
                  <Skeleton h={56} w={72} />
                  <Skeleton h={56} w={72} />
                  <Skeleton h={56} w={72} />
                  <Skeleton h={56} w={72} />
                </Flex>
              </Flex>
            </Paper>
          </Box>
        </Box>
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
          page background. Per Figma node 2857-99152 the entire header
          (hero banner + submissions due + actions + title + divider +
          hosted by + countdown) lives inside a single rounded Paper
          tile — the hero is the top "photo" of the Paper, body content
          sits below it with matching padding. */}
      <Box
        css={{
          maxWidth: MAX_CONTENT_WIDTH,
          margin: '0 auto',
          width: '100%',
          containerType: 'inline-size',
          containerName: 'contest'
        }}
      >
        <Box
          css={{
            paddingInline: 'var(--harmony-unit-8)',
            paddingBlock: 'var(--harmony-unit-6)',
            // Tighten the gutter on phone-sized containers so the header
            // Paper can breathe at the edges instead of the gutter
            // eating most of the row.
            [`@container contest (max-width: ${HEADER_STACK_BREAKPOINT_PX}px)`]:
              {
                paddingInline: 'var(--harmony-unit-4)'
              }
          }}
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
              radius. The height fluidly tracks the content width
              (via `cqi` relative to the `contest` container) so
              narrow desktop shells get a shorter hero without a
              hard mobile/desktop breakpoint. */}
            <Box
              w='100%'
              css={{
                height: `clamp(${HERO_MIN_HEIGHT}px, 30cqi, ${HERO_MAX_HEIGHT}px)`,
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
                due date below it. Row stacks on narrow containers so
                the action cluster can wrap without squeezing the due
                date. */}
              <Flex
                justifyContent='space-between'
                alignItems='flex-start'
                gap='l'
                css={{
                  [`@container contest (max-width: ${HEADER_STACK_BREAKPOINT_PX}px)`]:
                    {
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }
                }}
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
              <Flex
                justifyContent='space-between'
                alignItems='center'
                gap='xl'
                css={{
                  [`@container contest (max-width: ${HEADER_STACK_BREAKPOINT_PX}px)`]:
                    {
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 'var(--harmony-unit-4)'
                    }
                }}
              >
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
                onClick={() => {
                  if (activeTab !== 'submissions' && trackId && eventId) {
                    trackEvent(
                      make({
                        eventName: Name.REMIX_CONTEST_VIEW_SUBMISSIONS,
                        remixContestId: eventId,
                        trackId
                      })
                    )
                  }
                  setActiveTab('submissions')
                }}
              />
            </Flex>
          ) : null}

          {/* Tab body — 2-column layout matching Figma. Left column is
            wider (flex 1) and holds About + Prizes as stacked cards.
            Right column is fixed width and holds Stems/Followers/
            Comments as stacked cards. Each section is its OWN Paper
            with its own border; there's no single outer tile. The
            right column collapses under the left below
            `DETAILS_STACK_BREAKPOINT_PX` so a narrow desktop shell
            doesn't squeeze the sidebar cards into a too-thin rail. */}
          {activeTab === 'details' ? (
            <Flex
              gap='xl'
              alignItems='flex-start'
              css={{
                [`@container contest (max-width: ${DETAILS_STACK_BREAKPOINT_PX}px)`]:
                  {
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 'var(--harmony-unit-4)'
                  }
              }}
            >
              {/* Left column: POST UPDATE composer (host-only) + About +
                Prizes + Updates feed. Composer + feed are split per
                Figma 2806-63008 — the composer sits above About, the
                historical feed sits below Prizes. */}
              <Flex
                direction='column'
                gap='l'
                css={{ flex: '1 1 auto', minWidth: 0 }}
              >
                <PostUpdateComposer
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                />

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
                  {/* Optional embedded video (YouTube / Vimeo) configured on the
                    Edit Contest "Video Link" field. Renders nothing when no
                    URL is set or the URL isn't a YouTube / Vimeo link. */}
                  <VideoEmbed url={(contest.eventData as any)?.videoUrl} />
                </Paper>

                {(contest.eventData as any)?.prizeInfo?.trim() ? (
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
                      {(contest.eventData as any).prizeInfo}
                    </UserGeneratedText>
                  </Paper>
                ) : null}

                {/* Updates feed — host-authored top-level posts. Compose
                  affordance lives above the About card via
                  `PostUpdateComposer`; this tile is feed-only. The
                  empty card hides for non-hosts so a brand-new contest
                  doesn't render an empty section under Prizes. */}
                <ContestCommentsTile
                  eventId={eventId}
                  eventOwnerUserId={contest?.userId}
                  mode='updates'
                  hideComposer
                  hideWhenEmpty
                />
              </Flex>

              {/* Right column: Stems & Downloads + Followers + Comments. */}
              <Flex
                direction='column'
                gap='l'
                css={{
                  flex: `0 0 ${RIGHT_COLUMN_WIDTH_PX}px`,
                  width: RIGHT_COLUMN_WIDTH_PX,
                  [`@container contest (max-width: ${DETAILS_STACK_BREAKPOINT_PX}px)`]:
                    {
                      flex: '1 1 auto',
                      width: '100%'
                    }
                }}
              >
                {hasDownloads ? <ContestStemsCard trackId={trackId!} /> : null}

                {(followState?.followerCount ?? 0) > 0 ? (
                  <EventFollowersCard
                    eventId={eventId}
                    followerCount={followState?.followerCount ?? 0}
                    onOpenLeaderboard={() => setIsFollowersModalOpen(true)}
                  />
                ) : null}

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
            <Flex direction='column' gap='l'>
              {(() => {
                // Lineup shape is [original, ...winners, ...remixes].
                // Mirror the legacy `RemixesPage` delineator pattern:
                // a WINNERS label after the original, and a
                // `SUBMISSIONS (N) + filter bar` delineator after
                // the last winner (or after the original when there
                // are no winners). Keeps the filter controls docked
                // to the boundary between winners and submissions
                // where they're most contextual, and matches the
                // native mobile + track-page reference.
                const winnersDelineator = (
                  <Box pt='l' pb='s'>
                    <Divider />
                    <Box pt='l'>
                      <Text variant='label' size='m' color='subdued'>
                        WINNERS
                      </Text>
                    </Box>
                  </Box>
                )
                const submissionsDelineator = (
                  <Box pt='l' pb='s'>
                    <Divider />
                    <Flex
                      justifyContent='space-between'
                      alignItems='center'
                      gap='s'
                      pt='l'
                      css={{
                        [`@container contest (max-width: ${HEADER_STACK_BREAKPOINT_PX}px)`]:
                          {
                            flexDirection: 'column',
                            alignItems: 'stretch'
                          }
                      }}
                    >
                      <Text variant='label' size='m' color='subdued'>
                        {messages.submissionsTab(submissionsCount)}
                      </Text>
                      <Flex gap='s' wrap='wrap'>
                        <FilterButton
                          label={messages.coSigned}
                          value={isCosign ? 'true' : null}
                          onClick={() =>
                            updateIsCosignParam(isCosign ? '' : 'true')
                          }
                        />
                        <FilterButton
                          value={sortMethod ?? 'recent'}
                          variant='replaceLabel'
                          onChange={updateSortParam}
                          options={[
                            { label: messages.sortRecent, value: 'recent' },
                            { label: messages.sortPlays, value: 'plays' },
                            { label: messages.sortFavorites, value: 'likes' }
                          ]}
                        />
                      </Flex>
                    </Flex>
                  </Box>
                )
                const delineatorMap: Record<number, JSX.Element> =
                  winnerCount > 0
                    ? {
                        0: winnersDelineator,
                        [winnerCount]: submissionsDelineator
                      }
                    : {
                        0: submissionsDelineator
                      }
                return (
                  <TrackLineup
                    trackIds={lineupTrackIds}
                    source='CONTEST_SUBMISSIONS'
                    querySource={submissionsQuerySource}
                    isPending={lineup.isPending}
                    isFetching={lineup.isFetching}
                    isError={lineup.isError}
                    hasNextPage={lineup.hasNextPage}
                    loadNextPage={lineup.loadNextPage}
                    pageSize={CONTEST_PAGE_SIZE}
                    delineatorMap={delineatorMap}
                  />
                )
              })()}
            </Flex>
          ) : null}
        </Box>
      </Box>
    </Page>
  )
}

export default ContestPage
