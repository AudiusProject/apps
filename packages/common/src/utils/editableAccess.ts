import {
  AccessConditions,
  isContentFollowGated,
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType
} from '~/models'

import { Nullable } from './typeUtils'

// Returns whether some users may lose access based on the new audience.
export const getUsersMayLoseAccess = ({
  availability,
  initialStreamConditions,
  specialAccessType
}: {
  availability: StreamTrackAvailabilityType
  initialStreamConditions?: Nullable<AccessConditions>
  specialAccessType?: 'follow' | 'tip'
}) => {
  const isInitiallyUsdcGated = isContentUSDCPurchaseGated(
    initialStreamConditions
  )
  const isInitiallyFollowGated = isContentFollowGated(initialStreamConditions)

  const stillUsdcGated =
    isInitiallyUsdcGated &&
    availability === StreamTrackAvailabilityType.USDC_PURCHASE
  const stillFollowGated =
    isInitiallyFollowGated &&
    availability === StreamTrackAvailabilityType.SPECIAL_ACCESS &&
    specialAccessType === 'follow'
  const stillSameGate = stillUsdcGated || stillFollowGated

  return (
    !stillSameGate &&
    !isInitiallyUsdcGated &&
    // why do we have both FREE and PUBLIC types
    // and when is one used over the other?
    ![
      StreamTrackAvailabilityType.FREE,
      StreamTrackAvailabilityType.PUBLIC
    ].includes(availability)
  )
}
