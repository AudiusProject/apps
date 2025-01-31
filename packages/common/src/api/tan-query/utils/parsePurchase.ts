import { full, HashId } from '@audius/sdk'

import { PurchaseAccess } from '~/models'
import {
  USDCContentPurchaseType,
  USDCPurchaseDetails
} from '~/models/USDCTransactions'
import { StringUSDC } from '~/models/Wallet'

export const parsePurchase = (purchase: full.Purchase): USDCPurchaseDetails => {
  const {
    contentId,
    contentType,
    extraAmount,
    amount,
    buyerUserId,
    sellerUserId,
    access,
    ...rest
  } = purchase
  return {
    ...rest,
    contentType: contentType as USDCContentPurchaseType,
    contentId: HashId.parse(contentId),
    amount: amount as StringUSDC,
    extraAmount: extraAmount as StringUSDC,
    buyerUserId: HashId.parse(buyerUserId),
    sellerUserId: HashId.parse(sellerUserId),
    access: access as PurchaseAccess
  }
}
