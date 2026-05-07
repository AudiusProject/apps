import { useMemo } from 'react'

import { useUserRemixContests } from '@audius/common/api'
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
 * Calls `GET /v1/users/{id}/contests` (via `useUserRemixContests`), which
 * returns only this artist's contests with active first (by soonest-ending
 * end_date) followed by ended.
 */
export const ContestsTab = ({ profile }: ContestsTabProps) => {
  const { user_id: hostUserId, name } = profile

  const {
    data: trackIds,
    isPending,
    isFetching
  } = useUserRemixContests({
    userId: hostUserId,
    pageSize: 50
  })

  const contestTrackIds = useMemo(() => trackIds ?? [], [trackIds])

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
