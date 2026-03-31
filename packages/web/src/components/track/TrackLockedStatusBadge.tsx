import {
  useGatedTrackAccess,
  useTrackLockedStatusVariant
} from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Flex, IconLock, Text } from '@audius/harmony'

import { LockedStatusBadge } from 'components/locked-status-badge'

const messages = {
  membersOnly: 'Members Only'
}

type TrackLockedStatusBadgeProps = {
  trackId: ID
}

export const TrackLockedStatusBadge = (props: TrackLockedStatusBadgeProps) => {
  const { trackId } = props

  const { hasStreamAccess } = useGatedTrackAccess(trackId)
  const variant = useTrackLockedStatusVariant(trackId)

  if (!variant) return null

  if (variant === 'tokenGated' && !hasStreamAccess) {
    return (
      <Flex gap='xs' alignItems='center' justifyContent='center'>
        <IconLock size='s' color='default' />
        <Text variant='label' size='s' color='default'>
          {messages.membersOnly}
        </Text>
      </Flex>
    )
  }

  return <LockedStatusBadge variant={variant} locked={!hasStreamAccess} />
}
