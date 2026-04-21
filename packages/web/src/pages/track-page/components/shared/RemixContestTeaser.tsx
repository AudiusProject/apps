import { useRemixContest, useTrack } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconArrowRight,
  IconTrophy,
  Paper,
  Text
} from '@audius/harmony'
import { Link } from 'react-router'

import { contestPage } from 'utils/route'

const messages = {
  badge: 'Remix Contest',
  viewContest: 'View Contest',
  endsOn: (deadline?: string) =>
    `Ends ${formatContestDeadline(deadline, 'short')}`,
  ended: 'Contest ended'
}

type RemixContestTeaserProps = {
  trackId: ID
}

/**
 * Compact CTA that replaces the old, in-line `RemixContestSection` on the
 * track page. The full tabbed experience — details, prizes, submissions,
 * winners, feed, follow — now lives on the dedicated contest page at
 * `/@handle/@slug/contest`. This teaser just surfaces that a contest exists
 * and links to it.
 *
 * Renders nothing when the track has no active remix contest, so it's safe
 * to drop into every track-page view unconditionally.
 */
export const RemixContestTeaser = ({ trackId }: RemixContestTeaserProps) => {
  const { isEnabled: isContestsEnabled } = useFeatureFlag(FeatureFlags.CONTESTS)
  const { data: track } = useTrack(trackId)
  const { data: contest } = useRemixContest(trackId)

  // Piggyback on the same flag that gates the `/contests` discovery page
  // (see main's ContestsPage). When the flag is off the dedicated contest
  // detail page is unreachable, so surfacing a CTA that links into it
  // would be a dead-end.
  if (!isContestsEnabled) return null
  if (!contest || !track) return null

  const isEnded = dayjs(contest.endDate).isBefore(dayjs())

  return (
    <Paper
      direction='row'
      p='l'
      gap='l'
      alignItems='center'
      justifyContent='space-between'
      borderRadius='m'
      border='default'
    >
      <Flex gap='m' alignItems='center'>
        <IconTrophy size='l' color='accent' />
        <Flex direction='column' gap='xs'>
          <Text variant='label' size='m' color='accent'>
            {messages.badge}
          </Text>
          <Text variant='body' size='s' color='subdued'>
            {isEnded ? messages.ended : messages.endsOn(contest.endDate)}
          </Text>
        </Flex>
      </Flex>
      <Button size='small' iconRight={IconArrowRight} asChild>
        <Link to={contestPage(track.permalink)}>{messages.viewContest}</Link>
      </Button>
    </Paper>
  )
}
