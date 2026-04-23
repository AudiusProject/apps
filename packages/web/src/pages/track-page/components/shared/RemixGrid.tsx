import { ID } from '@audius/common/models'
import { Flex } from '@audius/harmony'

import {
  RemixSubmissionCard,
  RemixSubmissionCardSize
} from './RemixSubmissionCard'

export type { RemixSubmissionCardSize }

type RemixGridProps = {
  trackIds: ID[]
  size?: RemixSubmissionCardSize
  className?: string
}

export const RemixGrid = ({
  trackIds,
  size = 'desktop',
  className
}: RemixGridProps) => {
  const minCardWidth = size === 'mobile' ? 140 : 160

  return (
    <Flex
      gap='2xl'
      justifyContent='start'
      css={{
        display: 'grid',
        'grid-template-columns': `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
        ...(className ? { className } : {})
      }}
    >
      {trackIds.map((trackId) => (
        <RemixSubmissionCard key={trackId} trackId={trackId} size={size} />
      ))}
    </Flex>
  )
}
