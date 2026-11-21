import { useEventIdsByEntityId } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Flex, IconTrophy, Text } from '@audius/harmony'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'

import { ContestCard } from 'components/contest-card/ContestCard'

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

  const isSingle = contestEventIds.length === 1

  return (
    <Flex direction='column' gap='l' w='100%'>
      {/* Header sized + iconified to match the track-page Comments
          header (`<IconMessage /> Comments` at `title/l`). The previous
          version used a smaller, unadorned label which read as a
          minor section. */}
      <Flex gap='s' alignItems='center'>
        <IconTrophy color='default' />
        <Text variant='title' size='l'>
          {messages.contests}
        </Text>
      </Flex>
      <Flex
        gap='l'
        wrap='wrap'
        css={{
          '> *': {
            flex: '1 1 280px',
            minWidth: 0,
            maxWidth: isSingle ? '100%' : 480
          }
        }}
      >
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
