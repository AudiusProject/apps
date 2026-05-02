import { useMemo } from 'react'

import { useAllRemixContests, useRemixContest } from '@audius/common/api'
import { ID, User } from '@audius/common/models'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'

import { ContestCard } from 'components/contest-card/ContestCard'

import { EmptyTab } from './EmptyTab'

type ContestsTabProps = {
  profile: User
  isOwner: boolean
}

/**
 * Per-row guard: render a `<ContestCard>` only when the resolved remix
 * contest event for `trackId` is hosted by `hostUserId`. See the desktop
 * ContestsTab for the full rationale; the mobile component is a thin
 * wrapper around the same cards with a stacked single-column layout.
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
 * Profile "Contests" tab on mobile. Lists contests hosted by this
 * profile as a stacked grid of `ContestCard`s. Matches Figma 2864-13286
 * (the desktop layout collapses to a single column on narrow shells —
 * mobile reuses the same card so the visual treatment stays consistent).
 */
export const ContestsTab = ({ profile, isOwner }: ContestsTabProps) => {
  const { user_id: hostUserId, name } = profile

  const {
    data: trackIds,
    isPending,
    isFetching
  } = useAllRemixContests({ pageSize: 50 })

  const contestTrackIds = useMemo(() => trackIds ?? [], [trackIds])

  if (isPending && contestTrackIds.length === 0) {
    return (
      <Flex justifyContent='center' mt='l'>
        <Box w={24}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  if (!isFetching && contestTrackIds.length === 0) {
    return (
      <EmptyTab
        message={`${
          isOwner ? "You haven't" : `${name} hasn't`
        } hosted any contests yet`}
      />
    )
  }

  return (
    <Flex direction='column' gap='l' p='l'>
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
