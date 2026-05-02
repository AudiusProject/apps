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

/**
 * "Contests" tile section on the track screen. Replaces the legacy in-line
 * `RemixContestSection` (Details / Prizes / Submissions / Winners tabs)
 * — the full experience now lives on the dedicated contest screen at
 * `/{handle}/{slug}/contest`. This section just lists the contests
 * attached to this track as cards that link out (Figma 2888-16639).
 *
 * Renders nothing when the track has no remix-contest events, so it's
 * safe to drop into every track screen unconditionally.
 *
 * Note: the contest card itself currently resolves a contest via
 * `useRemixContest(trackId)` which returns only the first event for that
 * track. If/when the data model surfaces more than one active contest
 * per track, this section is the natural seam to render N cards instead
 * of one.
 */
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
