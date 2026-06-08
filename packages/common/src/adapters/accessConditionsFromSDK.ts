import type { AccessGate } from '@audius/sdk'
import {
  instanceOfFollowGate,
  instanceOfPurchaseGate,
  instanceOfTokenGate
} from '@audius/sdk'

import { AccessConditions } from '~/models'

/** Accepts default API AccessGate (e.g. from playlists). */
export const accessConditionsFromSDK = (
  input: AccessGate
): AccessConditions | null => {
  if (instanceOfFollowGate(input)) {
    return { follow_user_id: input.followUserId }
  } else if (instanceOfTokenGate(input)) {
    return {
      token_gate: {
        token_mint: input.tokenGate.tokenMint,
        token_amount: input.tokenGate.tokenAmount
      }
    }
  } else if (instanceOfPurchaseGate(input)) {
    return {
      usdc_purchase: {
        price: input.usdcPurchase.price,
        splits: input.usdcPurchase.splits.map((s) => ({
          user_id: s.userId,
          percentage: s.percentage
        }))
      }
    }
  } else {
    throw new Error(`Unsupported access gate type: ${JSON.stringify(input)}`)
  }
}
