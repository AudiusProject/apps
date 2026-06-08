import { HashId, type Purchase } from '@audius/sdk'

import { PurchaseAccess } from '~/models/PurchaseContent'
import {
  USDCContentPurchaseType,
  USDCPurchaseDetails
} from '~/models/USDCTransactions'
import { StringUSDC } from '~/models/Wallet'

export const purchaseFromSDK = (input: Purchase): USDCPurchaseDetails => {
  const {
    contentId,
    contentType,
    extraAmount,
    amount,
    buyerUserId,
    sellerUserId,
    access,
    ...rest
  } = input
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
