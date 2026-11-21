import { z } from 'zod'

import { walletMessages } from '../../../messages'
import { SolanaWalletAddress } from '../../../models'
import { filterDecimalString } from '../../../utils'
import { isValidSolAddress } from '../../wallet/utils'

import { WithdrawMethod } from './types'

export const AMOUNT = 'amount' as const
export const ADDRESS = 'address' as const
export const CONFIRM = 'confirm' as const
export const METHOD = 'method' as const

const MINIMUM_MANUAL_TRANSFER_AMOUNT_CENTS = 1

export type WithdrawUSDCFormValues = {
  [AMOUNT]: number | string
  [ADDRESS]: string
  [METHOD]: WithdrawMethod
  [CONFIRM]?: boolean
}

export const createWithdrawUSDCFormSchema = (
  userBalanceCents: number,
  minWithdrawBalanceCents: number
) => {
  const amountSchema = z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'string') {
      return filterDecimalString(val).value
    }
    return val
  })

  const baseAmount = amountSchema.refine((val) => val <= userBalanceCents, {
    message: walletMessages.errors.insufficientBalanceDetails
  })

  const coinflowAmount =
    userBalanceCents !== 0
      ? baseAmount.refine((val) => val >= minWithdrawBalanceCents, {
          message: walletMessages.errors.minCashTransfer
        })
      : amountSchema

  const manualAmount =
    userBalanceCents !== 0
      ? baseAmount.refine(
          (val) => val >= MINIMUM_MANUAL_TRANSFER_AMOUNT_CENTS,
          { message: walletMessages.errors.amountTooLow }
        )
      : amountSchema

  const coinflowSchema: any = {
    [METHOD]: z.literal(WithdrawMethod.COINFLOW),
    [AMOUNT]: coinflowAmount
  }

  const manualTransferSchema: any = {
    [METHOD]: z.literal(WithdrawMethod.MANUAL_TRANSFER),
    [AMOUNT]: manualAmount,
    [ADDRESS]: z
      .string()
      .min(1, walletMessages.destinationRequired)
      .refine(
        (value) => isValidSolAddress(value as SolanaWalletAddress),
        walletMessages.errors.invalidAddress
      )
  }

  manualTransferSchema[CONFIRM] = z.literal(true, {
    errorMap: () => ({ message: walletMessages.errors.pleaseConfirm })
  })

  return z.discriminatedUnion(METHOD, [
    z.object(coinflowSchema),
    z.object(manualTransferSchema)
  ])
}
