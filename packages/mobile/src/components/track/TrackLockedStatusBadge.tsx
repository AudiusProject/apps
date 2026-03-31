import {
  useGatedTrackAccess,
  useTrackLockedStatusVariant
} from '@audius/common/hooks'
import type { ID } from '@audius/common/models'

import { Flex, IconLock, Text } from '@audius/harmony-native'

import { LockedStatusBadge } from '../core/LockedStatusBadge'

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
      <Flex
        direction='row'
        gap='xs'
        alignItems='center'
        justifyContent='center'
      >
        <IconLock size='s' color='default' />
        <Flex>
          <Text variant='body' size='xs' color='default'>
            {messages.membersOnly}
          </Text>
        </Flex>
      </Flex>
    )
  }

  return <LockedStatusBadge variant={variant} locked={!hasStreamAccess} />
}
