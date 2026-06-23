import { z } from 'zod'

import { PurchaseMethod, PurchaseVendor } from '~/models/PurchaseContent'
import { PurchaseContentPage } from '~/store'

import {
  AMOUNT_PRESET,
  CUSTOM_AMOUNT,
  PURCHASE_VENDOR,
  PURCHASE_METHOD,
  maximumPayExtraAmountCents,
  minimumPayExtraAmountCents,
  GUEST_EMAIL,
  GUEST_CHECKOUT,
  PURCHASE_METHOD_MINT_ADDRESS
} from './constants'
import { PayExtraPreset } from './types'

export const messages = {
  amountInvalid: 'Please specify an amount between $1 and $100'
}

export const createPurchaseContentSchema = (page: PurchaseContentPage) => {
  return z
    .object({
      [CUSTOM_AMOUNT]: z
        .number({
          required_error: messages.amountInvalid,
          invalid_type_error: messages.amountInvalid
        })
        .optional(),
      [AMOUNT_PRESET]: z.nativeEnum(PayExtraPreset),
      [PURCHASE_METHOD]: z.nativeEnum(PurchaseMethod),
      [PURCHASE_VENDOR]: z.nativeEnum(PurchaseVendor).optional(),
      [GUEST_CHECKOUT]: z.boolean().optional(),
      [GUEST_EMAIL]: z.string().email().optional(),
      [PURCHASE_METHOD_MINT_ADDRESS]: z.string().optional()
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
    .refine(
      (data) => {
        if (
          page === PurchaseContentPage.GUEST_CHECKOUT &&
          data[GUEST_CHECKOUT] &&
          !data[GUEST_EMAIL]
        ) {
          return false
        }
        return true
      },
      {
        message: 'Email Required',
        path: [GUEST_EMAIL] // Specify the path to the error
      }
    )
}
