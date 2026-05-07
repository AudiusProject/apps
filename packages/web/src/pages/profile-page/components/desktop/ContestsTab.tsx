import { useEffect, useMemo } from 'react'

import { useUserContests } from '@audius/common/api'
import { User } from '@audius/common/models'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'

import { ContestCard } from 'components/contest-card/ContestCard'

import { EmptyTab } from './EmptyTab'
import styles from './ProfilePage.module.css'

const messages = {
  emptyContests: 'hosted any contests'
}

type ContestsTabProps = {
  profile: User
  isOwner: boolean
}

/**
 * Profile "Contests" tab. Lists the contests hosted by this profile as a
 * grid of `ContestCard`s that link out to the dedicated contest page.
 * Matches Figma 2864-13286.
 *
 * Uses the dedicated `GET /v1/users/{id}/contests` endpoint (SDK:
 * `users.getContestsByUser`) which returns this artist's contests directly,
 * with active contests first (by soonest-ending end_date) then ended contests.
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
  } = useUserContests({ userId: hostUserId, pageSize: 25 })

  const contestTrackIds = useMemo(() => trackIds ?? [], [trackIds])

  // Auto-paginate so artists with many contests don't appear truncated.
  // Each page is already pre-filtered to this host on the backend, so we can
  // pull subsequent pages eagerly without the previous client-side fan-out.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isPending && contestTrackIds.length === 0) {
    return (
      <Flex justifyContent='center' mt='2xl'>
        <Box w={24}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

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
        <ContestCard key={trackId} trackId={trackId} variant='grid' />
      ))}
    </Flex>
  )
}
