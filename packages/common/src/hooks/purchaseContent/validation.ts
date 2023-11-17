import { z } from 'zod'

import {
  AMOUNT_PRESET,
  CUSTOM_AMOUNT,
  PURCHASE_METHOD,
  maximumPayExtraAmountCents,
  minimumPayExtraAmountCents
} from './constants'
import { PayExtraPreset, PurchaseMethod } from './types'

const messages = {
  amountInvalid: 'Please specify an amount between $1 and $100'
}

const createPurchaseContentSchema = () => {
  return z
    .object({
      [CUSTOM_AMOUNT]: z
        .number({
          required_error: messages.amountInvalid,
          invalid_type_error: messages.amountInvalid
        })
        .optional(),
      [AMOUNT_PRESET]: z.nativeEnum(PayExtraPreset),
      [PURCHASE_METHOD]: z.nativeEnum(PurchaseMethod)
    })
    .refine(
      ({ amountPreset, customAmount }) => {
        if (amountPreset !== PayExtraPreset.CUSTOM) return true
        return (
          customAmount &&
          customAmount >= minimumPayExtraAmountCents &&
          customAmount <= maximumPayExtraAmountCents
        )
      },
      { message: messages.amountInvalid, path: [CUSTOM_AMOUNT] }
    )
}

export const PurchaseContentSchema = createPurchaseContentSchema()
export type PurchaseContentValues = z.input<typeof PurchaseContentSchema>
