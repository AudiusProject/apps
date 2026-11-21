import { useEventIdsByEntityId } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'

import { Flex, Text } from '@audius/harmony-native'
import { ContestCard } from 'app/components/contest-card/ContestCard'

const messages = {
  contests: 'Contests'
}

type TrackContestsSectionProps = {
  trackId: ID
}

export const TrackContestsSection = ({
  trackId
}: TrackContestsSectionProps) => {
  const { data: contestEventIds } = useEventIdsByEntityId({
    entityId: trackId,
    entityType: EventEntityTypeEnum.Track,
    eventType: EventEventTypeEnum.RemixContest
  })

  if (!contestEventIds || contestEventIds.length === 0) return null

  return (
    <Flex direction='column' gap='l'>
      <Text variant='title' size='l'>
        {messages.contests}
      </Text>
      <Flex direction='column' gap='l'>
        {/* One card per contest event. ContestCard's internal lookup
            keys off `trackId` and surfaces the first contest for that
            track — matches today's "one active contest per track"
            data model. */}
        {contestEventIds.map((eventId) => (
          <ContestCard key={eventId} trackId={trackId} variant='grid' />
        ))}
      </Flex>
    </Flex>
  )
}
