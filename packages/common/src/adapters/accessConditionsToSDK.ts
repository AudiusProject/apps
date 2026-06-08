import type { CreateAlbumMetadata, TrackMetadata } from '@audius/sdk'

import {
  AccessConditions,
  isContentFollowGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  type PaymentSplit,
  type USDCPurchaseConditions
} from '~/models'

/** Maps common USDC conditions to SDK format. Use for albums (stream conditions are USDC-only). */
export const usdcPurchaseConditionsToSDK = (
  input: USDCPurchaseConditions
): NonNullable<CreateAlbumMetadata['streamConditions']> => {
  const splits = input.usdc_purchase.splits ?? []
  return {
    usdcPurchase: {
      price: input.usdc_purchase.price,
      ...(input.usdc_purchase.albumTrackPrice != null && {
        albumTrackPrice: input.usdc_purchase.albumTrackPrice
      }),
      splits: splits.map(
        (
          s: PaymentSplit & {
            userId?: number
            payoutWallet?: string
            ethWallet?: string
          }
        ) => ({
          userId: s.user_id,
          percentage: s.percentage,
          payoutWallet: s.payout_wallet ?? s.payoutWallet ?? '',
          amount: s.amount,
          ...((s.eth_wallet ?? s.ethWallet) != null && {
            ethWallet: s.eth_wallet ?? s.ethWallet
          })
        })
      )
    }
  }
}

export const accessConditionsToSDK = (
  input: AccessConditions
): TrackMetadata['downloadConditions'] => {
  if (isContentFollowGated(input)) {
    return {
      followUserId: input.follow_user_id
    }
  } else if (isContentUSDCPurchaseGated(input)) {
    return usdcPurchaseConditionsToSDK(input)
  } else if (isContentTokenGated(input)) {
    return {
      tokenGate: {
        tokenMint: input.token_gate.token_mint,
        tokenAmount: input.token_gate.token_amount
      }
    }
  } else {
    throw new Error(
      `Unsupported access conditions type: ${JSON.stringify(input)}`
    )
  }
}
