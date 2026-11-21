import { USDC } from '@audius/fixed-decimal'

import { ExtendedPaymentSplit } from '../api/generated/default'
import { LoggerService } from '../services'
import type { ClaimableTokensClient } from '../services/Solana/programs/ClaimableTokensClient'

/**
 * 1. Converts amounts to bigints
 * 2. Spreads the extraAmount to each split
 * 3. Creates user banks for recipients as necessary
 * 4. Returns a simplified splits structure, a list of account/amount pairs
 */
export const prepareSplits = async ({
  splits,
  extraAmount,
  claimableTokensClient,
  logger
}: {
  splits: ExtendedPaymentSplit[]
  extraAmount: bigint
  includeNetworkCut?: boolean
  claimableTokensClient: ClaimableTokensClient
  logger: LoggerService
}) => {
  const userSplits = splits.filter((s) => !!s.userId)
  const userSplitCount = userSplits.length
  const networkSplit = splits.filter((s) => !s.userId)

  logger.debug(
    `Splitting the extra ${extraAmount} between ${userSplitCount} user(s)...`
  )
  let amountSplits = userSplits.map((split, index) => {
    const amountToAdd = extraAmount / BigInt(userSplitCount - index)
    extraAmount = USDC(extraAmount - amountToAdd).value
    return {
      ...split,
      amount: BigInt(split.amount) + amountToAdd
    }
  })
  amountSplits = amountSplits.concat(
    networkSplit.map((split) => ({
      ...split,
      amount: BigInt(split.amount)
    }))
  )
  if (extraAmount > 0) {
    logger.debug('Calculated splits after extra amount:', amountSplits)
  }

  amountSplits = await Promise.all(
    amountSplits.map(async (split) => {
      if (!split.payoutWallet && split.ethWallet) {
        logger.debug('Deriving user bank for user...', {
          userId: split.userId
        })
        const { userBank, didExist } =
          await claimableTokensClient.getOrCreateUserBank({
            ethWallet: split.ethWallet,
            mint: 'USDC'
          })
        if (!didExist) {
          logger.debug('Created user bank', {
            userId: split.userId,
            userBank: userBank.toBase58()
          })
        }
        split.payoutWallet = userBank.toBase58()
      }
      return split
    })
  )

  return amountSplits.map((split) => ({
    wallet: split.payoutWallet,
    amount: split.amount
  }))
}
