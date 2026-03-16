import { useCallback, useMemo } from 'react'

import { useUSDCPurchaseConfig } from '@audius/common/hooks'
import { isContentUSDCPurchaseGated } from '@audius/common/models'
import type { TrackForUpload } from '@audius/common/store'
import {
  creativeCommons,
  isBpmValid,
  parseMusicalKey
} from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { MAX_DESCRIPTION_LENGTH } from '@audius/sdk/services'
import { Formik } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { TRACK_PREVIEW } from 'app/components/edit/PriceAndAudienceField/PremiumRadioField/TrackPreviewField'
import { TRACK_PRICE } from 'app/components/edit/PriceAndAudienceField/PremiumRadioField/TrackPriceField'

import { EditTrackNavigator } from './EditTrackNavigator'
import { BPM } from './screens/KeyBpmScreen'
import type { FormValues, EditTrackScreenProps } from './types'
import { getUploadMetadataFromFormValues } from './util'

const { computeLicenseVariables, ALL_RIGHTS_RESERVED_TYPE } = creativeCommons

const MIN_BPM = 1
const MAX_BPM = 999

const errorMessages = {
  title: 'Your track must have a name',
  genre: 'Genre is required',
  artwork: 'Artwork is required',
  description: 'Description cannot exceed 1000 characters',
  previewStartThirtyBeforeEnd:
    'Preview must start at least 30 seconds before the end of the track.',
  previewStartZero:
    'Preview must start at 0 since the track is less than 30 seconds.',
  bpmTooLow: `BPM less than ${MIN_BPM}`,
  bpmTooHigh: `BPM greater than ${MAX_BPM}`,
  isrc: "Invalid ISRC. Must be in the format 'CC-XXX-YY-NNNNN'",
  iswc: "Invalid ISWC. Must be in the format 'T-34524688-1'"
}

const useEditTrackSchema = () => {
  const { minContentPriceCents, maxContentPriceCents } = useUSDCPurchaseConfig()
  return useMemo(
    /**
     * The refine functions only get executed if the original object definition (before refine) validation passes.
     * This means that if one of the fields is invalid in the original object definition, while there are other fields
     * that are invalid but would only trigger the error in the refine functions, we would only see the first error.
     * We want all errors to surface at once, so I'm using the refine functions to do the validations.
     * I understand this is somewhat antithetical to the purpose of the zod types in the first place, but unless
     * we are okay with occasionally showing one error at a time, we will have to do it this way.
     */
    () =>
      z
        .object({
          artwork: z
            .object({
              url: z.string()
            })
            .nullable(),
          trackArtwork: z.string().nullish(),
          title: z.string(),
          genre: z.any(),
          description: z.string().nullish(),
          stream_conditions: z.any(),
          duration: z.number().nullable(),
          preview_start_seconds: z.any(),
          bpm: z.optional(z.string().nullable()),
          isrc: z.optional(
            z
              .string()
              .regex(
                /^[A-Z]{2}-?[A-Z\d]{3}-?\d{2}-?\d{5}$/i,
                errorMessages.isrc
              )
              .nullable()
          ),
          iswc: z.optional(
            z
              .string()
              .regex(/^T-?\d{3}.?\d{3}.?\d{3}.?-?\d$/i, errorMessages.iswc)
              .nullable()
          ),
          cover_original_song_title: z.optional(z.string().nullable()),
          cover_original_artist: z.optional(z.string().nullable())
        })
        .refine(
          (values) => {
            const { artwork, trackArtwork } = values
            return (
              trackArtwork !== undefined ||
              (artwork !== null && typeof artwork === 'object')
            )
          },
          { message: errorMessages.artwork, path: ['artwork'] }
        )
        .refine(
          (values) => {
            return !!values.title
          },
          { message: errorMessages.title, path: ['title'] }
        )
        .refine(
          (values) => {
            return typeof values.genre === 'string' && !!values.genre
          },
          { message: errorMessages.genre, path: ['genre'] }
        )
        .refine(
          (values) => {
            return (
              !values.description ||
              values.description.length <= MAX_DESCRIPTION_LENGTH
            )
          },
          { message: errorMessages.description, path: ['description'] }
        )
        .refine(
          (values) => {
            const { stream_conditions: streamConditions } = values
            if (isContentUSDCPurchaseGated(streamConditions)) {
              const { price } = streamConditions.usdc_purchase
              return price > 0 && price >= minContentPriceCents / 100
            }
            return true
          },
          {
            message: `Price must be at least $${USDC(
              minContentPriceCents / 100
            ).toLocaleString()}.`,
            path: [TRACK_PRICE]
          }
        )
        .refine(
          (values) => {
            const { stream_conditions: streamConditions } = values
            if (isContentUSDCPurchaseGated(streamConditions)) {
              return (
                streamConditions.usdc_purchase.price <=
                maxContentPriceCents / 100
              )
            }
            return true
          },
          {
            message: `Price must be less than $${USDC(
              maxContentPriceCents / 100
            ).toLocaleString()}.`,
            path: [TRACK_PRICE]
          }
        )
        .refine(
          (values) => {
            const {
              duration,
              stream_conditions: streamConditions,
              preview_start_seconds: previewStartSeconds
            } = values

            // We only care about preview if track is usdc gated
            if (!isContentUSDCPurchaseGated(streamConditions)) return true

            // If preview is falsy and track is usdc gated (because we got to this line),
            // validation passes because we will simply set it to 0
            if (!previewStartSeconds) return true

            // If duration is NaN, validation passes because we were unable to get duration from a track
            if (duration === null || isNaN(duration)) return true

            return (
              duration <= 30 || Number(previewStartSeconds) <= duration - 30
            )
          },
          {
            message: errorMessages.previewStartThirtyBeforeEnd,
            path: [TRACK_PREVIEW]
          }
        )
        .refine(
          (values) => {
            const { duration, preview_start_seconds: previewStartSeconds } =
              values
            return (
              duration === null ||
              previewStartSeconds === null ||
              duration! > 30 ||
              Number(previewStartSeconds) === 0
            )
          },
          {
            message: errorMessages.previewStartZero,
            path: [TRACK_PREVIEW]
          }
        )
        .refine(
          (values) => {
            const { bpm } = values
            return bpm === undefined || Number(bpm) >= MIN_BPM
          },
          {
            message: errorMessages.bpmTooLow,
            path: [BPM]
          }
        )
        .refine(
          (values) => {
            const { bpm } = values
            return bpm === undefined || Number(bpm) <= MAX_BPM
          },
          {
            message: errorMessages.bpmTooHigh,
            path: [BPM]
          }
        ),
    [minContentPriceCents, maxContentPriceCents]
  )
}

export type EditTrackParams = TrackForUpload

const getInitialBpm = (bpm: number | null | undefined) => {
  if (bpm) {
    const bpmString = bpm.toString()
    return isBpmValid(bpmString) ? bpmString : undefined
  }
  return undefined
}

export const EditTrackScreen = (props: EditTrackScreenProps) => {
  const editTrackSchema = toFormikValidationSchema(useEditTrackSchema())

  const { initialValues: initialValuesProp, onSubmit, ...screenProps } = props

  const initialValues: FormValues = {
    ...initialValuesProp,
    entityType: 'track',
    licenseType: computeLicenseVariables(
      initialValuesProp.license || ALL_RIGHTS_RESERVED_TYPE
    ),
    musical_key: initialValuesProp.musical_key
      ? parseMusicalKey(initialValuesProp.musical_key)
      : undefined,
    bpm: getInitialBpm(initialValuesProp.bpm)
  }

  const handleSubmit = useCallback(
    (values: FormValues, { setSubmitting }) => {
      const metadata = getUploadMetadataFromFormValues(
        values,
        initialValuesProp
      )

      // submit the metadata
      onSubmit(metadata)
      setSubmitting(false)
    },
    [initialValuesProp, onSubmit]
  )

  return (
    <Formik<FormValues>
      initialValues={initialValues}
      enableReinitialize={!initialValuesProp.isUpload}
      onSubmit={handleSubmit}
      validationSchema={editTrackSchema}
    >
      {(formikProps) => (
        <EditTrackNavigator
          {...formikProps}
          {...screenProps}
          isUpload={initialValuesProp.isUpload}
        />
      )}
    </Formik>
  )
}
