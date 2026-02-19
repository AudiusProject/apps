import { USDCPurchaseConfig } from '@audius/common/hooks'
import {
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType,
  AccessConditions
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { z } from 'zod'

import {
  ALBUM_TRACK_PRICE,
  AccessAndSaleFormValues,
  PREVIEW,
  PRICE,
  STREAM_AVAILABILITY_TYPE,
  STREAM_CONDITIONS
} from '../types'

const messages = {
  price: {
    tooLow: (minPrice: number) =>
      `Price must be at least $${USDC(minPrice / 100).toLocaleString()}.`,
    tooHigh: (maxPrice: number) =>
      `Price must be less than $${USDC(maxPrice / 100).toLocaleString()}.`
  },
  preview: {
    tooEarly: 'Preview must start during the track.',
    tooLate:
      'Preview must start at least 30 seconds before the end of the track.'
  },
  required: 'Required'
}

// This type is specific to the AccessAndSaleFormSchema during refinement
type ZodSchemaValues = {
  stream_availability_type: StreamTrackAvailabilityType
  stream_conditions?: Nullable<AccessConditions>
  preview_start_seconds?: number | null | undefined
}

const refineMinPrice =
  (key: 'price' | 'albumTrackPrice', minContentPriceCents: number) =>
  (formValues: ZodSchemaValues) => {
    const streamConditions = formValues[STREAM_CONDITIONS]
    if (
      formValues[STREAM_AVAILABILITY_TYPE] === 'USDC_PURCHASE' &&
      isContentUSDCPurchaseGated(streamConditions)
    ) {
      const price = streamConditions.usdc_purchase[key]
      return price !== undefined && price > 0 && price >= minContentPriceCents
    }
    return true
  }

const refineMaxPrice =
  (key: 'price' | 'albumTrackPrice', maxContentPriceCents: number) =>
  (formValues: ZodSchemaValues) => {
    const streamConditions = formValues[STREAM_CONDITIONS]
    if (
      formValues[STREAM_AVAILABILITY_TYPE] === 'USDC_PURCHASE' &&
      isContentUSDCPurchaseGated(streamConditions)
    ) {
      const price = streamConditions.usdc_purchase[key]
      return price !== undefined && price <= maxContentPriceCents
    }
    return true
  }

export type USDCPurchaseRemoteConfig = Pick<
  USDCPurchaseConfig,
  'minContentPriceCents' | 'maxContentPriceCents'
>

export const priceAndAudienceSchema = (
  trackLength: number,
  { minContentPriceCents, maxContentPriceCents }: USDCPurchaseRemoteConfig,
  isAlbum?: boolean,
  isUpload?: boolean
) =>
  z
    .object({
      [STREAM_CONDITIONS]: z.any(),
      [PREVIEW]: z.optional(
        z.nullable(z.number({ invalid_type_error: messages.required }))
      ),
      [STREAM_AVAILABILITY_TYPE]: z.nativeEnum(StreamTrackAvailabilityType)
    })
    // Check for main price >= min price
    .refine(refineMinPrice('price', minContentPriceCents), {
      message: messages.price.tooLow(minContentPriceCents),
      path: [PRICE]
    })
    // Check for albumTrackPrice price >= min price (if applicable)
    .refine(
      (values) =>
        isAlbum && isUpload
          ? refineMinPrice('albumTrackPrice', minContentPriceCents)(values)
          : true,
      {
        message: messages.price.tooLow(minContentPriceCents),
        path: [ALBUM_TRACK_PRICE]
      }
    )
    // Check for price <= max price
    .refine(refineMaxPrice('price', maxContentPriceCents), {
      message: messages.price.tooHigh(maxContentPriceCents),
      path: [PRICE]
    })
    .refine(
      (values) =>
        isAlbum && isUpload
          ? refineMaxPrice('albumTrackPrice', maxContentPriceCents)(values)
          : true,
      {
        message: messages.price.tooHigh(maxContentPriceCents),
        path: [ALBUM_TRACK_PRICE]
      }
    )
    // Check preview start time exists and is >= 0
    .refine(
      (values) => {
        const formValues = values as AccessAndSaleFormValues
        if (
          formValues[STREAM_AVAILABILITY_TYPE] === 'USDC_PURCHASE' &&
          !isAlbum
        ) {
          return formValues[PREVIEW] !== undefined && formValues[PREVIEW] >= 0
        }
        return true
      },
      { message: messages.preview.tooEarly, path: [PREVIEW] }
    )
    // Check for preview being >30s before the end of the track
    .refine(
      (values) => {
        const formValues = values as AccessAndSaleFormValues
        if (
          formValues[STREAM_AVAILABILITY_TYPE] === 'USDC_PURCHASE' &&
          !isAlbum
        ) {
          return (
            formValues[PREVIEW] === undefined ||
            isNaN(trackLength) ||
            (formValues[PREVIEW] >= 0 &&
              (formValues[PREVIEW] < trackLength - 30 ||
                (trackLength <= 30 && formValues[PREVIEW] < trackLength)))
          )
        }
        return true
      },
      { message: messages.preview.tooLate, path: [PREVIEW] }
    )
