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
