import { useTrack } from '@audius/common/api'
import { ID } from '@audius/common/models'

import { trackRemixesPage } from 'utils/route'

import { RemixSubmissionCardSize } from './RemixGrid'
import { RemixTab } from './RemixTab'

const messages = {
  noWinners: 'No winners announced yet',
  stayTuned: 'Stay tuned for the results!',
  viewAll: 'View All'
}

type RemixContestWinnersTabProps = {
  trackId: ID
  winnerIds: ID[]
  size?: RemixSubmissionCardSize
  count?: number
}

/**
 * Tab content displaying winners for a remix contest
 */
export const RemixContestWinnersTab = ({
  trackId,
  winnerIds,
  count,
  size = 'desktop'
}: RemixContestWinnersTabProps) => {
  const { data: permalink } = useTrack(trackId, {
    select: (track) => track.permalink
  })

  const pathname = trackRemixesPage(permalink ?? '')
  const search = new URLSearchParams({ isContestEntry: 'true' }).toString()

  return (
    <RemixTab
      trackIds={winnerIds}
      size={size}
      count={count}
      emptyState={{
        title: messages.noWinners,
        subtitle: messages.stayTuned
      }}
      viewAllLink={{ pathname, search }}
      viewAllText={messages.viewAll}
    />
  )
}
