import { useEffect, useMemo } from 'react'

import { useAllRemixContests, useRemixContest } from '@audius/common/api'
import { ID, User } from '@audius/common/models'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'

import { ContestCard } from 'components/contest-card/ContestCard'

import { EmptyTab } from './EmptyTab'
import styles from './ProfilePage.module.css'

const MAX_PAGES_TO_LOAD = 5

const messages = {
  emptyContests: 'hosted any contests'
}

type ContestsTabProps = {
  profile: User
  isOwner: boolean
}

/**
 * Per-row guard: render a `<ContestCard>` only when the resolved remix
 * contest event for `trackId` is hosted by `hostUserId`. Lets the parent
 * tab iterate over the global remix-contest list (which doesn't yet
 * support a host-userId filter at the API layer) and keep only the rows
 * for this profile. The event has already been primed into the React
 * Query cache by `useAllRemixContests`, so this is a synchronous cache
 * read in practice.
 */
const HostedContestCard = ({
  trackId,
  hostUserId
}: {
  trackId: ID
  hostUserId: ID
}) => {
  const { data: contest } = useRemixContest(trackId)
  if (!contest || contest.userId !== hostUserId) return null
  return <ContestCard trackId={trackId} variant='grid' />
}

/**
 * Profile "Contests" tab. Lists the contests hosted by this profile as a
 * grid of `ContestCard`s that link out to the dedicated contest page.
 * Matches Figma 2864-13286.
 *
 * The discovery endpoint behind `useAllRemixContests` doesn't yet
 * support filtering by host userId, so we paginate the global list and
 * filter client-side by `event.userId === profile.user_id`. Active
 * contests come first (by soonest-ending end_date), then ended.
 */
export const ContestsTab = ({ profile }: ContestsTabProps) => {
  const { user_id: hostUserId, name } = profile

  const {
    data: trackIds,
    isPending,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
  } = useAllRemixContests({ pageSize: 50 })

  const contestTrackIds = useMemo(() => trackIds ?? [], [trackIds])

  // The discovery endpoint can't filter by host userId yet, so the
  // client filters globally fetched pages. Without auto-pagination an
  // artist whose contests aren't on the first 50 rows of the global
  // list (active first, then ended) reads as "no contests" — including
  // ended-contest-only artists. Pull additional pages opportunistically
  // up to a safety cap so a typical profile resolves correctly.
  const loadedPages = trackIds ? Math.ceil(trackIds.length / 50) : 0
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && loadedPages < MAX_PAGES_TO_LOAD) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, loadedPages, fetchNextPage])

  if (isPending && contestTrackIds.length === 0) {
    return (
      <Flex justifyContent='center' mt='2xl'>
        <Box w={24}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  // The list itself can be non-empty while every row gets filtered out
  // (none belong to this host), so the empty-state check happens both
  // before and after filtering. We can't filter ahead of render without
  // breaking React Query hook ordering — see HostedContestCard.
  if (!isFetching && contestTrackIds.length === 0) {
    return (
      <EmptyTab isOwner={false} name={name} text={messages.emptyContests} />
    )
  }

  return (
    <Flex
      direction='row'
      gap='l'
      wrap='wrap'
      className={styles.cardLineup}
      css={{
        // Tile grid sized like the Contests page hero/grid: each card
        // claims at least 280px and grows up to 480px. Stacks naturally
        // on narrower profile main columns without a JS breakpoint.
        // When the artist hosts a single contest the tile expands edge
        // to edge — capping it at 480px left an awkward gap.
        '> *': {
          flex: '1 1 280px',
          minWidth: 0,
          maxWidth: contestTrackIds.length === 1 ? '100%' : 480
        }
      }}
    >
      {contestTrackIds.map((trackId) => (
        <HostedContestCard
          key={trackId}
          trackId={trackId}
          hostUserId={hostUserId}
        />
      ))}
    </Flex>
  )
}
