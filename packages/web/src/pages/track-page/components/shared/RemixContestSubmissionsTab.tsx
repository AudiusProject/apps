import { LineupData, useTrack } from '@audius/common/api'
import { ID } from '@audius/common/models'

import { trackRemixesPage } from 'utils/route'

import { RemixSubmissionCardSize } from './RemixGrid'
import { RemixTab } from './RemixTab'

const messages = {
  noSubmissions: 'No submissions yet',
  beFirst: 'Be the first to upload a remix!',
  viewAll: 'View All'
}

type RemixContestSubmissionsTabProps = {
  trackId: ID
  submissions: LineupData[]
  size?: RemixSubmissionCardSize
  count?: number
}

/**
 * Tab content displaying submissions for a remix contest
 */
export const RemixContestSubmissionsTab = ({
  trackId,
  submissions,
  count,
  size = 'desktop'
}: RemixContestSubmissionsTabProps) => {
  const { data: permalink } = useTrack(trackId, {
    select: (track) => track.permalink
  })

  const pathname = trackRemixesPage(permalink ?? '')
  const search = new URLSearchParams({ isContestEntry: 'true' }).toString()

  return (
    <RemixTab
      trackIds={submissions.map((s) => s.id)}
      size={size}
      count={count}
      emptyState={{
        title: messages.noSubmissions,
        subtitle: messages.beFirst
      }}
      viewAllLink={{ pathname, search }}
      viewAllText={messages.viewAll}
    />
  )
}
