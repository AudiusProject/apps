import { useCallback, useEffect } from 'react'

import {
  useCurrentUserId,
  useEventFollowState,
  useFollowEvent,
  useRemixContest,
  useRemixesLineup,
  useTrackByPermalink,
  useUnfollowEvent,
  useUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  remixesPageActions,
  remixesPageLineupActions,
  remixesPageSelectors
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconTrophy,
  IconUserFollow,
  IconUserFollowing,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useParams } from 'react-router'

import { MIN_PAGE_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import Page from 'components/page/Page'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { RemixContestDetailsTab } from 'pages/track-page/components/desktop/RemixContestDetailsTab'
import { RemixContestPrizesTab } from 'pages/track-page/components/desktop/RemixContestPrizesTab'
import { fullContestPage } from 'utils/route'

import { ContestCommentsSection } from '../ContestCommentsSection'

const messages = {
  title: 'Remix Contest',
  follow: 'Follow Contest',
  following: 'Following',
  details: 'Details',
  prizes: 'Prizes',
  submissions: 'Submissions',
  winners: 'Winners',
  postUpdates: 'Contest Feed',
  originalTrack: 'Original Track'
}

const { getTrackId } = remixesPageSelectors
const { fetchTrackSucceeded, reset } = remixesPageActions

export const CONTEST_PAGE_SIZE = 10

type ContestPageProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const ContestPage = ({ containerRef: _containerRef }: ContestPageProps) => {
  const dispatch = useDispatch()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  // Match the ContestsPage (discovery) flag-guard pattern: once we know the
  // flag is loaded and disabled, bounce back to /. Keeps the behavior
  // consistent across the two entry points into the new contest UX.
  const { isEnabled: isContestsEnabled, isLoaded: isFlagLoaded } =
    useFeatureFlag(FeatureFlags.CONTESTS)

  // Resolve the track that the contest is attached to. Contest events are
  // keyed by entity_id=track_id in the events table, so the easy path is
  // to go from permalink → track_id → event.
  const originalTrackId = useSelector(getTrackId)
  const { data: originalTrackByPermalink } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const track = originalTrackByPermalink
  const trackId = track?.track_id ?? originalTrackId ?? undefined
  const { data: user } = useUser(track?.owner_id)

  const { data: contest } = useRemixContest(trackId)
  const eventId = contest?.eventId

  // Follow-contest button state.
  const { data: currentUserId } = useCurrentUserId()
  const { data: followState } = useEventFollowState(eventId)
  const { mutate: followEvent, isPending: isFollowing } = useFollowEvent()
  const { mutate: unfollowEvent, isPending: isUnfollowing } = useUnfollowEvent()

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

  // Submissions lineup — the key difference from the old track-page section
  // is that this renders full track tiles (TanQueryLineup), not the
  // pint-sized RemixTab.
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

  const renderHeader = useCallback(
    () => (
      <Header
        icon={IconTrophy}
        primary={
          track?.title ? `${messages.title}: ${track.title}` : messages.title
        }
        rightDecorator={
          eventId ? (
            <Button
              size='small'
              variant={followState?.isFollowed ? 'secondary' : 'primary'}
              iconLeft={
                followState?.isFollowed ? IconUserFollowing : IconUserFollow
              }
              disabled={isFollowing || isUnfollowing}
              onClick={handleToggleFollow}
            >
              {followState?.isFollowed ? messages.following : messages.follow}
            </Button>
          ) : null
        }
      />
    ),
    [
      eventId,
      followState?.isFollowed,
      handleToggleFollow,
      isFollowing,
      isUnfollowing,
      track?.title
    ]
  )

  // Flag gate — redirect home when the contests feature is disabled. We
  // wait for isFlagLoaded so we don't briefly redirect users whose remote
  // config is still hydrating.
  if (isFlagLoaded && !isContestsEnabled) {
    return <Navigate to='/' replace />
  }

  if (!track || !user) {
    return null
  }

  if (!contest || !eventId) {
    // No contest for this track — fall back to the remixes page UX. We render
    // a minimal placeholder for the user rather than a white screen.
    return (
      <Page
        title={messages.title}
        canonicalUrl={fullContestPage(track.permalink)}
        header={renderHeader()}
      >
        <Flex column gap='l' p='xl' css={{ minWidth: MIN_PAGE_WIDTH_PX }}>
          <Text variant='body'>No contest is currently running for this track.</Text>
        </Flex>
      </Page>
    )
  }

  return (
    <Page
      title={messages.title}
      canonicalUrl={fullContestPage(track.permalink)}
      header={renderHeader()}
    >
      <Flex
        direction='column'
        gap='2xl'
        p='xl'
        css={{ minWidth: MIN_PAGE_WIDTH_PX }}
      >
        {/* Details + Prizes: reuse the same tab components the track page uses */}
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

        {/* Submissions rendered as a full TrackTile lineup (the layout the
            design calls for — mirrors /remixes?isContestEntry=true). */}
        <Flex direction='column' gap='l'>
          <Text variant='heading' size='s'>
            {messages.submissions}
          </Text>
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

        <Divider />

        {/* Event comments: post updates + user comments share one feed.
            The section itself knows how to flag "post updates" (comments
            authored by the event owner) and how to let everyone post
            normal top-level comments. */}
        <Box>
          <ContestCommentsSection
            eventId={eventId}
            eventOwnerUserId={contest?.userId}
          />
        </Box>
      </Flex>
    </Page>
  )
}

export default ContestPage
