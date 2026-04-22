import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useRemixContest,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByPermalink,
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
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  FilterButton,
  Flex,
  IconArrowLeft,
  IconButton,
  IconKebabHorizontal,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router'

import { Avatar } from 'components/avatar/Avatar'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { useRemixPageParams } from 'pages/remixes-page/hooks'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { RemixContestDetailsTab } from 'pages/track-page/components/desktop/RemixContestDetailsTab'
import { RemixContestPrizesTab } from 'pages/track-page/components/desktop/RemixContestPrizesTab'
import { fullContestPage, pickWinnersPage } from 'utils/route'

import { ContestCommentsTile } from '../ContestCommentsTile'
import { ContestStemsCard } from '../ContestStemsCard'
import { EventFollowersCard } from '../EventFollowersCard'

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
  noRemixes: 'No submissions yet.'
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
// Tab bar
// -----------------------------------------------------------------------------
const TabBar = ({
  active,
  onChange
}: {
  active: MobileContestTab
  onChange: (t: MobileContestTab) => void
}) => {
  const tabs: { key: MobileContestTab; label: string }[] = [
    { key: 'details', label: messages.detailsTab },
    { key: 'updates', label: messages.updatesTab },
    { key: 'submissions', label: messages.submissionsTab },
    { key: 'comments', label: messages.commentsTab }
  ]
  return (
    <Flex alignItems='center' justifyContent='space-around' w='100%'>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <Box
            key={t.key}
            onClick={() => onChange(t.key)}
            css={{
              flex: 1,
              textAlign: 'center',
              paddingBottom: 8,
              borderBottom: isActive
                ? '2px solid var(--harmony-primary)'
                : '2px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Text
              variant='label'
              size='s'
              color={isActive ? 'accent' : 'subdued'}
              strength='strong'
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

  const { isEnabled: isContestsEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.CONTESTS)

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

  const isOwner = !!currentUserId && currentUserId === track?.owner_id

  const { imageUrl: coverArtUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })

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
  const lineup = useRemixesLineup({
    trackId: trackId ?? undefined,
    includeOriginal: false,
    includeWinners: true,
    isContestEntry: true,
    sortMethod,
    isCosign
  })
  const submissionsCount = lineup.data?.length

  useEffect(() => {
    if (trackId) {
      dispatch(remixesPageActions.fetchTrackSucceeded({ trackId }))
    }
  }, [dispatch, trackId])

  useEffect(() => {
    return function cleanup() {
      dispatch(remixesPageActions.reset())
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

  const handlePickWinners = useCallback(() => {
    if (track?.permalink) navigate(pickWinnersPage(track.permalink))
  }, [track?.permalink, navigate])

  // "Enter Contest" — defer to the existing upload flow with the contest
  // track pre-linked as the remix parent. If the app ever gets a dedicated
  // /enter-contest route we'll swap to that.
  const handleEnterContest = useRequiresAccountCallback(() => {
    if (!trackId) return
    navigate(`/upload?remix_of=${trackId}`)
  }, [trackId, navigate])

  // Flag gate
  if (isFlagLoaded && !isContestsEnabled) {
    return <Navigate to='/' replace />
  }

  if (!track || !user) {
    return null
  }

  if (!contest || !eventId) {
    return (
      <Page title={messages.title} variant='flush'>
        <Box p='xl'>
          <Text variant='body'>
            No contest is currently running for this track.
          </Text>
        </Box>
      </Page>
    )
  }

  const contestTitle = (contest.eventData as any)?.title || track.title
  const primaryAction = isOwner ? (
    <Button variant='primary' size='small' onClick={handlePickWinners}>
      {messages.pickWinners}
    </Button>
  ) : (
    <Button variant='primary' size='small' onClick={handleEnterContest}>
      {messages.enterContest}
    </Button>
  )

  return (
    <Page
      title={messages.title}
      canonicalUrl={fullContestPage(track.permalink)}
      variant='flush'
    >
      <Box w='100%' pb='xl'>
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
          <Box
            css={{
              position: 'absolute',
              top: 12,
              left: 12,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <IconButton
              icon={IconArrowLeft}
              color='staticWhite'
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
            <IconButton
              icon={IconKebabHorizontal}
              color='default'
              aria-label='Contest actions'
              onClick={() => {
                /* TODO: hook overflow drawer. For now this is a visual
                   placeholder — artist gets Edit/Share, public gets Share. */
              }}
            />
          </Flex>

          {/* Submissions Due */}
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

          {/* Tabs */}
          <TabBar active={activeTab} onChange={setActiveTab} />
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
            />
          ) : activeTab === 'updates' ? (
            <Box pt='l'>
              <ContestCommentsTile
                eventId={eventId}
                eventOwnerUserId={contest.userId}
                mode='updates'
              />
            </Box>
          ) : activeTab === 'submissions' ? (
            <Flex direction='column' gap='l' pt='l'>
              {/* Filter bar — same controls track-page RemixesPage exposes
                  above its remixes lineup: a Co-Signed toggle + a sort
                  dropdown (Recent / Plays / Favorites). */}
              <Flex justifyContent='space-between' alignItems='center'>
                <SectionLabel>
                  {submissionsCount != null
                    ? `${submissionsCount} ${messages.submissions}`
                    : messages.submissions}
                </SectionLabel>
                <Flex gap='xs'>
                  <FilterButton
                    label={messages.coSigned}
                    value={isCosign ? 'true' : null}
                    onClick={() => updateIsCosignParam(isCosign ? '' : 'true')}
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
// -----------------------------------------------------------------------------
type DetailsTabProps = {
  trackId: number
  eventId: number
  contestOwnerId: number | undefined
  hasDownloads: boolean
  followerCount: number
}

const DetailsTab = ({
  trackId,
  eventId,
  hasDownloads,
  followerCount
}: DetailsTabProps) => {
  return (
    <Flex direction='column' gap='l' pt='l'>
      {/* About this contest */}
      <Flex direction='column' gap='s'>
        <SectionLabel>{messages.aboutThisContest}</SectionLabel>
        <RemixContestDetailsTab trackId={trackId} />
      </Flex>

      {/* Prizes */}
      <Flex direction='column' gap='s'>
        <SectionLabel>{messages.prizes}</SectionLabel>
        <RemixContestPrizesTab trackId={trackId} />
      </Flex>

      {/* Followers — card renders its own FOLLOWERS (N) label inside the
          Paper, so no wrapper label here. */}
      <EventFollowersCard eventId={eventId} followerCount={followerCount} />

      {/* Stems & Downloads — enriched card (artwork + Public Free + artist
          + N Stems chip + Download All). Renders its own title inside the
          Paper, so no wrapper label. */}
      {hasDownloads ? <ContestStemsCard trackId={trackId} /> : null}
    </Flex>
  )
}

export default ContestPage
