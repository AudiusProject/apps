import type { AccessGate } from '@audius/sdk'
import {
  instanceOfExtendedPurchaseGate,
  instanceOfFollowGate,
  instanceOfTokenGate
} from '@audius/sdk'

import { AccessConditions } from '~/models'

/** Accepts default API AccessGate (e.g. from playlists). */
export const accessConditionsFromSDK = (
  input: AccessGate
): AccessConditions | null => {
  if (instanceOfFollowGate(input)) {
    return { follow_user_id: input.followUserId }
  } else if (instanceOfExtendedPurchaseGate(input)) {
    const purchase = input.usdcPurchase
    const splits = Array.isArray(purchase.splits)
      ? purchase.splits.map((s) => ({
          user_id: s.userId,
          percentage: s.percentage,
          payout_wallet: s.payoutWallet,
          amount: s.amount,
          ...(s.ethWallet != null && { eth_wallet: s.ethWallet })
        }))
      : []
    const albumTrackPrice = (purchase as { albumTrackPrice?: number })
      .albumTrackPrice
    return {
      usdc_purchase: {
        price: purchase.price,
        ...(albumTrackPrice != null && { albumTrackPrice }),
        splits
      }
    }
  } else if (instanceOfTokenGate(input)) {
    return {
      token_gate: {
        token_mint: input.tokenGate.tokenMint,
        token_amount: input.tokenGate.tokenAmount
      }
    }
  } else if ('nftCollection' in input && input.nftCollection != null) {
    return null
  } else {
    throw new Error(`Unsupported access gate type: ${JSON.stringify(input)}`)
  }
}
