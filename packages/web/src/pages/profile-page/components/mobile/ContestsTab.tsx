import { useMemo } from 'react'

import { useUserRemixContests } from '@audius/common/api'
import { User } from '@audius/common/models'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'

import { ContestCard } from 'components/contest-card/ContestCard'

import { EmptyTab } from './EmptyTab'

type ContestsTabProps = {
  profile: User
  isOwner: boolean
}

export const ContestsTab = ({ profile, isOwner }: ContestsTabProps) => {
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
        <ContestCard key={trackId} trackId={trackId} variant='grid' />
      ))}
    </Flex>
  )
}
