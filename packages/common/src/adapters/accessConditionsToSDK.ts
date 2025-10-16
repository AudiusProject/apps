import type { TrackMetadata } from '@audius/sdk'

import {
  AccessConditions,
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '~/models'

export const accessConditionsToSDK = (
  input: AccessConditions
): TrackMetadata['downloadConditions'] => {
  if (isContentFollowGated(input)) {
    return {
      followUserId: input.follow_user_id
    }
  } else if (isContentUSDCPurchaseGated(input)) {
    return {
      usdcPurchase: input.usdc_purchase
    }
  } else if (isContentTokenGated(input)) {
    return {
      tokenGate: {
        tokenMint: input.token_gate.token_mint,
        tokenAmount: input.token_gate.token_amount
      }
    }
  } else if (isContentTipGated(input)) {
    return {
      tipUserId: input.tip_user_id
    }
  } else {
    throw new Error(
      `Unsupported access conditions type: ${JSON.stringify(input)}`
    )
  }
}
