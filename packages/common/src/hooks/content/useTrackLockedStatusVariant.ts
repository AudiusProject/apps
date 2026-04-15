import { useTrack } from '~/api'
import {
  ID,
  isContentFollowGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '~/models'
import { Nullable } from '~/utils'

import { LockedStatusVariant } from './types'

export const useTrackLockedStatusVariant = (trackId: ID) => {
  const { data: streamConditions } = useTrack(trackId, {
    select: (track) => track?.stream_conditions
  })

  const isPurchaseable = isContentUSDCPurchaseGated(streamConditions)
  const isFollowGated = isContentFollowGated(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)

  let variant: Nullable<LockedStatusVariant> = null
  if (isPurchaseable) {
    variant = 'premium'
  } else if (isFollowGated) {
    variant = 'gated'
  } else if (isTokenGated) {
    variant = 'tokenGated'
  }

  return variant
}
