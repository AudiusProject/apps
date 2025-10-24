import type { full } from '@audius/sdk'
import {
  instanceOfTipGate,
  instanceOfFollowGate,
  instanceOfPurchaseGate,
  instanceOfTokenGate
} from '@audius/sdk/src/sdk/api/generated/full'

import { AccessConditions } from '~/models'

export const accessConditionsFromSDK = (
  input: full.AccessGate
): AccessConditions => {
  if (instanceOfFollowGate(input)) {
    return { follow_user_id: input.followUserId }
  } else if (instanceOfPurchaseGate(input)) {
    return { usdc_purchase: input.usdcPurchase }
  } else if (instanceOfTipGate(input)) {
    return { tip_user_id: input.tipUserId }
  } else if (instanceOfTokenGate(input)) {
    return {
      token_gate: {
        token_mint: input.tokenGate.tokenMint,
        token_amount: input.tokenGate.tokenAmount
      }
    }
  } else {
    throw new Error(`Unsupported access gate type: ${input}`)
  }
}
