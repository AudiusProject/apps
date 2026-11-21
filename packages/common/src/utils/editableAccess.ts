import {
  AccessConditions,
  isContentFollowGated,
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType
} from '~/models'

import { Nullable } from './typeUtils'

export const getUsersMayLoseAccess = ({
  availability,
  initialStreamConditions
}: {
  availability: StreamTrackAvailabilityType
  initialStreamConditions?: Nullable<AccessConditions>
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
    availability === StreamTrackAvailabilityType.FOLLOW_GATED
  const stillSameGate = stillUsdcGated || stillFollowGated

  return (
    !stillSameGate &&
    !isInitiallyUsdcGated &&
    ![
      StreamTrackAvailabilityType.FREE,
      StreamTrackAvailabilityType.PUBLIC
    ].includes(availability)
  )
}
