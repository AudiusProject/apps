import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  getCommentQueryKey,
  getRemixesQueryKey,
  useCurrentUserId,
  useEventComments,
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
import type { ID } from '@audius/common/models'
import { ShareSource, SquareSizes } from '@audius/common/models'
import {
  remixesPageActions,
  remixesPageSelectors,
  shareModalUIActions
} from '@audius/common/store'
import { dayjs, getLocalTimezone } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  FilterButton,
  Flex,
  IconArrowLeft,
  IconButton,
  IconKebabHorizontal,
  IconShare,
  IconUserFollow,
  IconUserFollowing,
  Paper,
  PopupMenu,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { TrackLineup } from 'components/lineup/TrackLineup'
import Page from 'components/page/Page'
import { UserGeneratedText } from 'components/user-generated-text'
import { VideoEmbed } from 'components/video-embed/VideoEmbed'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { fullContestPage, pickWinnersPage } from 'utils/route'

import { useEnterContest } from '../../hooks/useEnterContest'
import { ContestCommentsTile } from '../ContestCommentsTile'
import { ContestStemsCard } from '../ContestStemsCard'
import { EventFollowersCard } from '../EventFollowersCard'
import { PostUpdateComposer } from '../PostUpdateComposer'

const messages = {
  title: 'Remix Contest',
  submissionsDue: 'SUBMISSIONS DUE:',
  contestEnded: 'CONTEST ENDED',
  hostedBy: 'HOSTED BY',
  pickWinners: 'Pick Winners',
  enterContest: 'Enter Contest',
  detailsTab: 'Details',
  updatesTab: 'Updates',
  submissionsTab: 'Submissions',
  commentsTab: 'Comments',
  days: 'DAYS',
  hours: 'HOURS',
  mins: 'MINS',
  secs: 'SECS',
  prizes: 'PRIZES',
  aboutThisContest: 'ABOUT THIS CONTEST',
  submissions: 'SUBMISSIONS',
  coSigned: 'Co-Signs',
  sortRecent: 'Most Recent',
  sortPlays: 'Most Plays',
  sortFavorites: 'Most Favorites',
  loading: 'Loading…',
  noRemixes: 'No submissions yet.',
  follow: 'Follow Contest',
  unfollow: 'Unfollow Contest',
  share: 'Share Contest'
}

const HERO_HEIGHT = 220
export const CONTEST_PAGE_SIZE = 10

type MobileContestTab = 'details' | 'updates' | 'submissions' | 'comments'

// -----------------------------------------------------------------------------
// Countdown — horizontal tile row, one tile per unit, divider between tiles.
// Matches Figma node 2888-131647 / 2857-99182: number and label share the
// same text color (both default, both subdued on a leading zero unit).
// -----------------------------------------------------------------------------
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

const MobileCountdown = ({ endDate }: { endDate: string }) => {
  const [now, setNow] = useState(() => dayjs())
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(t)
  }, [])
  const diffMs = Math.max(0, dayjs(endDate).diff(now))
  const dayMs = 24 * 60 * 60 * 1000
  const days = Math.floor(diffMs / dayMs)
  const hours = Math.floor((diffMs % dayMs) / (60 * 60 * 1000))
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000))
  const secs = Math.floor((diffMs % (60 * 1000)) / 1000)
  const daysSub = days === 0
  const hoursSub = daysSub && hours === 0
  const minsSub = hoursSub && mins === 0
  return (
    <Flex alignItems='center' w='100%' gap='s'>
      <CountdownTile value={days} label={messages.days} isSubdued={daysSub} />
      <Divider orientation='vertical' css={{ height: 40 }} />
      <CountdownTile
        value={hours}
        label={messages.hours}
        isSubdued={hoursSub}
      />
      <Divider orientation='vertical' css={{ height: 40 }} />
      <CountdownTile value={mins} label={messages.mins} isSubdued={minsSub} />
      <Divider orientation='vertical' css={{ height: 40 }} />
      <CountdownTile value={secs} label={messages.secs} isSubdued={false} />
    </Flex>
  )
}

// -----------------------------------------------------------------------------
// Tab bar. Matches Figma mobile node 2888-131647: title-case labels
// (Details / Updates / Submissions / Comments), accent color + purple
// underline on the active tab, subdued on inactive. Uses `title` variant
// so the text renders mixed case (the `label` variant would force
// uppercase).
//
// Wrapped in a Paper so the tab strip reads as a distinct surface from
// the hero content above it (the hero sits on the page background).
// A continuous thin bottom border acts as the inactive underline for
// every tab, with a thicker accent underline overlaying the active
// one — this keeps tab widths uniform (equal flex columns) and the
// row visually anchored.
// -----------------------------------------------------------------------------
const TabBar = ({
  active,
  onChange,
  showUpdates
}: {
  active: MobileContestTab
  onChange: (t: MobileContestTab) => void
  showUpdates: boolean
}) => {
  const { color } = useTheme()
  const tabs: { key: MobileContestTab; label: string }[] = [
    { key: 'details', label: messages.detailsTab },
    ...(showUpdates
      ? [{ key: 'updates' as MobileContestTab, label: messages.updatesTab }]
      : []),
    { key: 'submissions', label: messages.submissionsTab },
    { key: 'comments', label: messages.commentsTab }
  ]
  return (
    <Flex
      alignItems='stretch'
      w='100%'
      css={{
        borderBottom: `1px solid ${color.border.default}`
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <Box
            key={t.key}
            onClick={() => onChange(t.key)}
            css={{
              flex: 1,
              textAlign: 'center',
              paddingTop: 10,
              paddingBottom: 10,
              position: 'relative',
              cursor: 'pointer',
              // Overlay a 2px accent rule on the active tab — sits on
              // top of the container's 1px default border so active
              // state reads clearly without disturbing tab widths.
              '&::after': isActive
                ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -1,
                    height: 2,
                    backgroundColor: color.primary.primary
                  }
                : undefined
            }}
          >
            <Text
              variant='title'
              size='s'
              color={isActive ? 'accent' : 'subdued'}
              strength={isActive ? 'strong' : 'default'}
            >
              {t.label}
            </Text>
          </Box>
        )
      })}
    </Flex>
  )
}

// -----------------------------------------------------------------------------
// Section label. Matches the desktop treatment: label size='m' subdued, no
// extra-bold strength — Figma 2888-131647 uses a regular-weight uppercase
// label for ABOUT THIS CONTEST, PRIZES, SUBMISSIONS, etc.
// -----------------------------------------------------------------------------
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text variant='label' size='m' color='subdued'>
    {children}
  </Text>
)

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
type MobileContestPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const ContestPage = ({
  containerRef: _containerRef
}: MobileContestPageProps) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const originalTrackId = useSelector(remixesPageSelectors.getTrackId)
  const track = originalTrackByPermalink
  const trackId = track?.track_id ?? originalTrackId ?? undefined
  const { data: user } = useUser(track?.owner_id)

  const { data: contest } = useRemixContest(trackId)
  const eventId = contest?.eventId

  const { data: currentUserId } = useCurrentUserId()
  const { data: followState } = useEventFollowState(eventId)
  const { mutate: followEvent } = useFollowEvent()
  const { mutate: unfollowEvent } = useUnfollowEvent()

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

  const handleShareContest = useCallback(() => {
    if (!trackId) return
    dispatch(
      shareModalUIActions.requestOpen({
        type: 'contest',
        trackId,
        source: ShareSource.PAGE
      })
    )
  }, [dispatch, trackId])

  const { imageUrl: trackCoverArtUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const coverArtUrl = contest?.eventData?.coverPhotoUrl || trackCoverArtUrl

  // Updates tab visibility — for non-hosts, hide the tab until there's
  // at least one host-authored top-level post (a "post update"). The
  // host always sees the tab so they have somewhere to compose from.
  // We mirror the filter ContestCommentsTile uses internally.
  const queryClient = useQueryClient()
  const { data: commentFeedItems } = useEventComments({
    eventId: eventId ?? 0,
    sortMethod: 'newest',
    enabled: !!eventId
  })
  const hasPostUpdates = (commentFeedItems ?? []).some(({ commentId }) => {
    const comment = queryClient.getQueryData(getCommentQueryKey(commentId))
    if (!comment) return false
    const parentCommentId = (comment as any).parentCommentId
    return (
      contest?.userId !== undefined &&
      (comment as any).userId === contest.userId &&
      !parentCommentId
    )
  })
  const showUpdatesTab = isOwner || hasPostUpdates

  // Stems & Downloads panel: only mount when the track has downloadable
  // content. Matches the desktop behaviour — DownloadSection assumes a
  // downloadable track and errors otherwise.
  const { data: downloadableFlag } = useTrack(trackId, {
    select: (t) => t?.is_downloadable
  })
  const { data: trackStems } = useStems(trackId)
  const hasDownloads =
    !!downloadableFlag || (!!trackStems && trackStems.length > 0)

  const [activeTab, setActiveTab] = useState<MobileContestTab>('details')

  // Submissions tab filter state — URL-backed so deep links + back/forward
  // work the same way as the track-page RemixesPage (the reference).
  const { sortMethod, isCosign } = useRemixPageParams()
  const updateSortParam = useUpdateSearchParams('sortMethod')
  const updateIsCosignParam = useUpdateSearchParams('isCosign')

  // Submissions lineup — driven on demand by the Submissions tab.
  // Includes the original (parent) track at the top of the lineup so
  // listeners can compare against the source remixes are built on
  // without jumping back out, matching the track-page `RemixesPage`
  // and the desktop contest page.
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
  // Total lineup length includes the original + winners + remixes.
  // The "N Submissions" label should show the number of *actual*
  // submissions (remixes), not the whole lineup.
  const lineupLength = lineupTrackIds.length
  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const submissionsCount = lineup.isPending
    ? undefined
    : Math.max(0, lineupLength - 1 - winnerCount)

  useEffect(() => {
    if (trackId) {
      dispatch(remixesPageActions.fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(remixesPageActions.reset())
    }
  }, [dispatch])

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

  const handlePickWinners = useCallback(() => {
    if (track?.permalink) navigate(pickWinnersPage(track.permalink))
  }, [track?.permalink, navigate])

  // "Enter Contest" — deep-link into the upload flow with the source
  // track's artwork + genre + remix_of pre-filled. See
  // `useEnterContest` for the full shape; reused across the desktop +
  // mobile contest pages and the mobile track-page contest details
  // tab so submitters get the same pre-filled form regardless of
  // entry point.
  const handleEnterContest = useEnterContest(trackId)

  if (!track || !user) {
    return null
  }

  // Contest hasn't resolved yet (or no contest exists for this track).
  // Render a skeleton matching the mobile page layout instead of the old
  // "No contest is currently running" copy.
  if (!contest || !eventId) {
    return (
      <Page title={messages.title} variant='flush'>
        <Box p='l'>
          <Paper
            direction='column'
            borderRadius='l'
            border='default'
            shadow='flat'
            backgroundColor='white'
            css={{ overflow: 'hidden' }}
          >
            <Skeleton h={180} w='100%' />
            <Flex direction='column' gap='m' p='l'>
              <Skeleton h={20} w={140} />
              <Skeleton h={28} w='80%' />
              <Divider orientation='horizontal' />
              <Flex gap='m' alignItems='center'>
                <Skeleton h={32} w={32} css={{ borderRadius: '50%' }} />
                <Flex direction='column' gap='2xs' flex='1 1 auto'>
                  <Skeleton h={10} w={80} />
                  <Skeleton h={16} w={140} />
                </Flex>
              </Flex>
              <Flex gap='s'>
                <Skeleton h={48} w={56} />
                <Skeleton h={48} w={56} />
                <Skeleton h={48} w={56} />
                <Skeleton h={48} w={56} />
              </Flex>
            </Flex>
          </Paper>
        </Box>
      </Page>
    )
  }

  const contestTitle = (contest.eventData as any)?.title || track.title
  const primaryAction = isOwner ? (
    <Button variant='primary' size='small' onClick={handlePickWinners}>
      {messages.pickWinners}
    </Button>
  ) : !isEnded ? (
    <Button variant='primary' size='small' onClick={handleEnterContest}>
      {messages.enterContest}
    </Button>
  ) : null

  // Overflow menu items. Host gets Share only (follow doesn't apply to
  // your own contest); public gets Follow/Unfollow + Share. Wired
  // through Harmony `PopupMenu` — the kebab IconButton is the anchor.
  const isFollowed = !!followState?.isFollowed
  const followMenuItem = {
    icon: isFollowed ? <IconUserFollowing /> : <IconUserFollow />,
    text: isFollowed ? messages.unfollow : messages.follow,
    onClick: () => handleToggleFollow()
  }
  const shareMenuItem = {
    icon: <IconShare />,
    text: messages.share,
    onClick: () => handleShareContest()
  }
  const overflowMenuItems = isOwner
    ? [shareMenuItem]
    : [followMenuItem, shareMenuItem]

  return (
    <Page
      title={messages.title}
      canonicalUrl={fullContestPage(track.permalink)}
      variant='flush'
    >
      {/* Top section: hero banner + meta (title, CTA, deadline,
          countdown, hosted-by) sits on a white surface. */}
      <Box
        w='100%'
        css={(theme) => ({ backgroundColor: theme.color.background.white })}
      >
        {/* Hero banner */}
        <Box
          w='100%'
          h={HERO_HEIGHT}
          css={{
            backgroundImage: coverArtUrl ? `url(${coverArtUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          }}
        >
          {/* Back button — white disc with an elevation shadow for
              emphasis instead of the previous translucent dark circle.
              Reads cleanly against both light and dark cover art. */}
          <Box
            css={(theme) => ({
              position: 'absolute',
              top: 12,
              left: 12,
              borderRadius: '50%',
              backgroundColor: theme.color.background.white,
              boxShadow: theme.shadows.mid
            })}
          >
            <IconButton
              icon={IconArrowLeft}
              color='default'
              aria-label='Back'
              onClick={() => navigate(-1)}
            />
          </Box>
        </Box>

        {/* Title + primary action + kebab */}
        <Box p='xl' css={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Text variant='display' size='s'>
            {contestTitle}
          </Text>
          <Flex gap='s' alignItems='center'>
            <Box css={{ flex: 1 }}>{primaryAction}</Box>
            <PopupMenu
              items={overflowMenuItems}
              renderTrigger={(anchorRef, triggerPopup, triggerProps) => (
                <IconButton
                  ref={anchorRef}
                  icon={IconKebabHorizontal}
                  color='default'
                  aria-label='Contest actions'
                  onClick={() => triggerPopup()}
                  {...triggerProps}
                />
              )}
            />
          </Flex>

          {/* Submissions Due */}
          <Flex direction='column' gap='xs'>
            <Text variant='label' size='m' color='subdued'>
              {isEnded ? messages.contestEnded : messages.submissionsDue}
            </Text>
            {deadlineParts ? (
              <Flex alignItems='baseline' gap='s' wrap='wrap'>
                {/* label / l / regular — matches native. */}
                <Text variant='label' size='l'>
                  {deadlineParts.date}
                </Text>
                <Text variant='label' size='l' color='subdued'>
                  {deadlineParts.time}
                </Text>
              </Flex>
            ) : null}
          </Flex>

          {/* Countdown */}
          {!isEnded && contest.endDate ? (
            <MobileCountdown endDate={contest.endDate} />
          ) : null}

          <Divider />

          {/* Hosted By */}
          <Flex direction='column' gap='s'>
            <SectionLabel>{messages.hostedBy}</SectionLabel>
            <Flex gap='m' alignItems='center'>
              <Avatar userId={user.user_id} h={40} w={40} />
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

          {/* Separator between the hosted-by row and the tab strip
              below so the tab bar reads as a distinct section
              instead of running directly into the host's name. */}
          <Divider />
        </Box>
      </Box>

      {/* Tab row + tab content sit on the page (surface1) background
          so the separation from the hero's white surface reads as a
          distinct section. The tab row itself is sticky to the top of
          this section and uses a white strip to keep it legible when
          cards scroll under it. */}
      <Box
        w='100%'
        css={(theme) => ({ backgroundColor: theme.color.background.surface1 })}
      >
        <Box
          css={(theme) => ({ backgroundColor: theme.color.background.white })}
        >
          <TabBar
            active={activeTab}
            onChange={setActiveTab}
            showUpdates={showUpdatesTab}
          />
        </Box>

        {/* Tab content */}
        <Box ph='xl' pb='2xl'>
          {activeTab === 'details' ? (
            <DetailsTab
              trackId={trackId!}
              eventId={eventId}
              contestOwnerId={contest.userId}
              hasDownloads={hasDownloads}
              followerCount={followState?.followerCount ?? 0}
              description={
                (contest.eventData as any)?.description as string | undefined
              }
              prizeInfo={
                (contest.eventData as any)?.prizeInfo as string | undefined
              }
              videoUrl={
                (contest.eventData as any)?.videoUrl as string | undefined
              }
            />
          ) : activeTab === 'updates' ? (
            <Flex direction='column' gap='l' pt='l'>
              {/* POST UPDATE composer — matches Figma 2888-130746. Mirrors
                  the Details tab so the host can compose from either tab. */}
              <PostUpdateComposer
                eventId={eventId}
                eventOwnerUserId={contest.userId}
              />
              {/* Updates feed — historical host posts only, no composer
                  (the dedicated card above owns that). */}
              <ContestCommentsTile
                eventId={eventId}
                eventOwnerUserId={contest.userId}
                mode='updates'
                hideHeading
                hideComposer
                hideWhenEmpty
              />
            </Flex>
          ) : activeTab === 'submissions' ? (
            <Flex direction='column' gap='l' pt='l'>
              {(() => {
                // Mirror the legacy `RemixesPage` delineator pattern:
                // WINNERS label after the original, and a
                // `N SUBMISSIONS + filter bar` delineator after the
                // last winner (or after the original when there are
                // no winners).
                const winnersDelineator = (
                  <Box pt='l' pb='s'>
                    <Divider />
                    <Box pt='l'>
                      <SectionLabel>WINNERS</SectionLabel>
                    </Box>
                  </Box>
                )
                const submissionsDelineator = (
                  <Box pt='l' pb='s'>
                    <Divider />
                    <Flex
                      justifyContent='space-between'
                      alignItems='center'
                      pt='l'
                    >
                      <SectionLabel>
                        {submissionsCount != null
                          ? `${submissionsCount} ${messages.submissions}`
                          : messages.submissions}
                      </SectionLabel>
                      <Flex gap='xs'>
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
          ) : (
            <Box pt='l'>
              <ContestCommentsTile
                eventId={eventId}
                eventOwnerUserId={contest.userId}
                mode='comments'
              />
            </Box>
          )}
        </Box>
      </Box>
    </Page>
  )
}

// -----------------------------------------------------------------------------
// Details tab — About / Prizes / Followers / Stems stacked vertically.
// Matches Figma node 2888-131647: the Updates tab owns the post-update feed
// and composer, so Details is purely informational for both owner and
// public viewers.
//
// About section renders the description only. The deadline already appears
// in the page header above the tabs, so we deliberately do not reuse
// `RemixContestDetailsTab` here (that desktop tab prepends a "Submission
// Due:" row that would duplicate the header on mobile).
// -----------------------------------------------------------------------------
const fallbackDescription =
  'Enter my remix contest before the deadline for your chance to win!'

type DetailsTabProps = {
  trackId: number
  eventId: number
  contestOwnerId: number | undefined
  hasDownloads: boolean
  followerCount: number
  description: string | undefined
  prizeInfo: string | undefined
  videoUrl: string | undefined
}

const DetailsTab = ({
  trackId,
  eventId,
  contestOwnerId,
  hasDownloads,
  followerCount,
  description,
  prizeInfo,
  videoUrl
}: DetailsTabProps) => {
  return (
    <Flex direction='column' gap='l' pt='l'>
      {/* POST UPDATE composer — host-only. Renders nothing for non-owners.
          The Updates tab owns the historical feed; this card lets the
          host post from the Details tab too (matches Figma 2888-23430). */}
      <PostUpdateComposer eventId={eventId} eventOwnerUserId={contestOwnerId} />

      {/* About — wrapped in a Paper card so the section reads as a
          unit matching Figma 2925-18101 (every other Details block
          is a card; bare text sitting on the page background broke
          the hierarchy). */}
      <Paper
        direction='column'
        p='l'
        gap='m'
        borderRadius='m'
        border='default'
        backgroundColor='white'
        shadow='flat'
      >
        <SectionLabel>{messages.aboutThisContest}</SectionLabel>
        <UserGeneratedText variant='body'>
          {description ?? fallbackDescription}
        </UserGeneratedText>
        {/* Optional embedded video (YouTube / Vimeo) configured on the
            Edit Contest "Video Link" field. Renders nothing when no URL
            is set or the URL isn't a YouTube / Vimeo link. */}
        <VideoEmbed url={videoUrl} />
      </Paper>

      {/* Prizes — inline prize info inside its own Paper card.
          Previously `RemixContestPrizesTab` was dropped in here but
          that component adds its own `p='xl'` which double-padded
          the wrapper. */}
      <Paper
        direction='column'
        p='l'
        gap='m'
        borderRadius='m'
        border='default'
        backgroundColor='white'
        shadow='flat'
      >
        <SectionLabel>{messages.prizes}</SectionLabel>
        {prizeInfo ? (
          <UserGeneratedText variant='body'>{prizeInfo}</UserGeneratedText>
        ) : null}
      </Paper>

      {/* Followers — only show once the contest has at least one
          follower; an empty face-pile was adding a visual dead zone
          between Prizes and Stems. */}
      {followerCount > 0 ? (
        <EventFollowersCard eventId={eventId} followerCount={followerCount} />
      ) : null}

      {/* Stems & Downloads — enriched card (artwork + Public Free +
          artist + N Stems chip + Download All + expandable file
          list). Renders its own title inside the Paper. Trailing
          spacer gives the last section breathing room from the
          bottom tab bar that sits over page content. */}
      {hasDownloads ? (
        <>
          <ContestStemsCard trackId={trackId} />
          <Box pb='2xl' />
        </>
      ) : null}
    </Flex>
  )
}

export default ContestPage
