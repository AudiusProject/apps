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

/**
 * "Contests" tile rail on the track page. Replaces the legacy in-line
 * `RemixContestSection` (Details / Prizes / Submissions / Winners tabs)
 * — the full experience now lives on the dedicated contest page at
 * `/@handle/@slug/contest`. This section just lists the contests
 * attached to this track as cards that link out.
 *
 * Renders nothing when the track has no remix-contest events, so it's
 * safe to drop into every track-page view unconditionally.
 *
 * Note: the contest card itself currently resolves a contest via
 * `useRemixContest(trackId)` which returns only the first event for that
 * track. If/when the data model surfaces more than one active contest
 * per track, this section is the natural seam to render N cards instead
 * of one — switch to passing the eventId directly here. Today the
 * section is structured as a list to make that swap trivial.
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
          // Tile grid: each card claims at least 280px and grows. On a
          // wide track-page main column we'll get 2-3 across; narrow
          // shells stack to one column without a JS breakpoint. With a
          // single contest the tile should expand edge-to-edge instead
          // of being capped at the multi-tile maxWidth.
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
