import { useCallback, useEffect, useState } from 'react'

import {
  DownloadTrackAvailabilityType,
  StemCategory,
  StemUploadWithFile,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { removeNullable, Nullable } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { Text, Divider } from '@audius/harmony'
import { useField } from 'formik'
import { usePrevious } from 'react-use'
import { z } from 'zod'

import { processFiles } from 'pages/upload-page/store/utils/processFiles'
import { stemDropdownRows } from 'utils/stems'

import { StemFilesView } from './StemFilesView'
import styles from './StemsAndDownloadsField.module.css'
import { SwitchRowField } from './SwitchRowField'
import { DownloadAvailability } from './download-availability/DownloadAvailability'
import { USDCPurchaseRemoteConfig } from './price-and-audience/priceAndAudienceSchema'
import {
  IS_DOWNLOAD_GATED,
  DOWNLOAD_CONDITIONS,
  STREAM_CONDITIONS,
  DOWNLOAD_AVAILABILITY_TYPE,
  IS_DOWNLOADABLE,
  IS_ORIGINAL_AVAILABLE,
  STEMS,
  DOWNLOAD_PRICE,
  StemsAndDownloadsFormValues,
  IS_OWNED_BY_USER
} from './types'

const messages = {
  description:
    'Upload your stems and source files to allow fans to remix your track. This does not affect users ability to listen offline.',
  [IS_DOWNLOADABLE]: {
    header: 'Full Track Download',
    description: 'Provide a full lossless copy of your track for download.'
  },
  priceTooLow: (minPrice: number) =>
    `Price must be at least $${USDC(minPrice / 100).toLocaleString()}.`,
  priceTooHigh: (maxPrice: number) =>
    `Price must be less than $${USDC(maxPrice / 100).toLocaleString()}.`,
  gatedNoDownloadableAssets:
    'You must enable full track download or upload a stem file before setting download availability.'
}

type StemsAndDownloadsSchemaProps = USDCPurchaseRemoteConfig
export const stemsAndDownloadsSchema = ({
  minContentPriceCents,
  maxContentPriceCents
}: StemsAndDownloadsSchemaProps) =>
  z
    .object({
      [IS_DOWNLOADABLE]: z.boolean(),
      [STEMS]: z.any(),
      [IS_ORIGINAL_AVAILABLE]: z.boolean(),
      [DOWNLOAD_CONDITIONS]: z.any(),
      [STREAM_CONDITIONS]: z.any(),
      [DOWNLOAD_AVAILABILITY_TYPE]: z.nativeEnum(DownloadTrackAvailabilityType),
      [IS_OWNED_BY_USER]: z.boolean()
    })
    .refine(
      (values) => {
        const formValues = values as StemsAndDownloadsFormValues
        const downloadConditions = formValues[DOWNLOAD_CONDITIONS]
        if (
          formValues[DOWNLOAD_AVAILABILITY_TYPE] ===
            DownloadTrackAvailabilityType.USDC_PURCHASE &&
          isContentUSDCPurchaseGated(downloadConditions)
        ) {
          const { price } = downloadConditions.usdc_purchase
          return price > 0 && price >= minContentPriceCents
        }
        return true
      },
      {
        message: messages.priceTooLow(minContentPriceCents),
        path: [DOWNLOAD_PRICE]
      }
    )
    .refine(
      (values) => {
        const formValues = values as StemsAndDownloadsFormValues
        const downloadConditions = formValues[DOWNLOAD_CONDITIONS]
        if (
          formValues[DOWNLOAD_AVAILABILITY_TYPE] ===
            DownloadTrackAvailabilityType.USDC_PURCHASE &&
          isContentUSDCPurchaseGated(downloadConditions)
        ) {
          return downloadConditions.usdc_purchase.price <= maxContentPriceCents
        }
        return true
      },
      {
        message: messages.priceTooHigh(maxContentPriceCents),
        path: [DOWNLOAD_PRICE]
      }
    )
    .refine(
      // cannot be download gated if no downloadable assets
      (values) => {
        const formValues = values as StemsAndDownloadsFormValues
        const streamConditions = formValues[STREAM_CONDITIONS]
        const availabilityType = formValues[DOWNLOAD_AVAILABILITY_TYPE]
        const isDownloadGated = [
          DownloadTrackAvailabilityType.FOLLOWERS,
          DownloadTrackAvailabilityType.USDC_PURCHASE
        ].includes(availabilityType)
        const isDownloadable = formValues[IS_DOWNLOADABLE]
        const stems = formValues[STEMS]
        const hasStems = stems.length > 0
        const hasDownloadableAssets = isDownloadable || hasStems
        return streamConditions || !isDownloadGated || hasDownloadableAssets
      },
      {
        message: messages.gatedNoDownloadableAssets,
        path: [IS_DOWNLOAD_GATED]
      }
    )

// Because the upload and edit forms share the same menu fields,
// we pass in the stems handlers in the edit flow to properly handle
// the selection, addition, and deletion of stems.
// May do another pass later to refactor.
type StemsAndDownloadsMenuFieldsProps = {
  isUpload: boolean
  stems?: StemUploadWithFile[]
  onAddStems?: (stems: any) => void
  onSelectCategory?: (category: StemCategory, index: number) => void
  onDeleteStem?: (index: number) => void
}

export const StemsAndDownloadsMenuFields = (
  props: StemsAndDownloadsMenuFieldsProps
) => {
  const [{ value: isDownloadable }, , { setValue: setIsDownloadable }] =
    useField(IS_DOWNLOADABLE)
  const [, , { setValue: setIsOriginalAvailable }] = useField(
    IS_ORIGINAL_AVAILABLE
  )
  const [{ value: stemsValue }, , { setValue: setStemsValue }] =
    useField<StemUploadWithFile[]>(STEMS)
  const previousStemsValue = usePrevious(stemsValue)
  const [{ value: availabilityType }, , { setValue: setAvailabilityType }] =
    useField<DownloadTrackAvailabilityType>(DOWNLOAD_AVAILABILITY_TYPE)
  const [isAvailabilityTouched, setIsAvailabilityTouched] = useState(
    availabilityType !== DownloadTrackAvailabilityType.PUBLIC
  )
  const [firstTimeStemsUploaded, setFirstTimeStemsUploaded] = useState(true)

  // If the track is download gated for the first time,
  // set the track to be downloadable and allow lossless files
  useEffect(() => {
    const firstTimeDownloadGated =
      [
        DownloadTrackAvailabilityType.FOLLOWERS,
        DownloadTrackAvailabilityType.USDC_PURCHASE
      ].includes(availabilityType) && !isAvailabilityTouched
    if (firstTimeDownloadGated) {
      setIsDownloadable(true)
      setIsAvailabilityTouched(true)
      setIsOriginalAvailable(true)
    }
  }, [
    availabilityType,
    isAvailabilityTouched,
    setIsDownloadable,
    setIsOriginalAvailable
  ])

  // Allow lossless files by default if the track is downloadable.
  // Note that the useEffect has been preferred to the corresponding onChange handlers
  // as those seemed to cause unwanted race conditions resulting in errors showing up incorrectly.
  useEffect(() => {
    if (isDownloadable) {
      setIsOriginalAvailable(true)
    }
  }, [isDownloadable, setIsOriginalAvailable, stemsValue.length])

  // Allow full track download and provide lossless files if additional files are uploaded for the first time.
  useEffect(() => {
    if (
      firstTimeStemsUploaded &&
      stemsValue.length > 0 &&
      previousStemsValue &&
      previousStemsValue.length < stemsValue.length
    ) {
      setFirstTimeStemsUploaded(false)
      setIsDownloadable(true)
      setIsOriginalAvailable(true)
    }
  }, [
    firstTimeStemsUploaded,
    stemsValue,
    previousStemsValue,
    setIsDownloadable,
    setIsOriginalAvailable
  ])

  const invalidAudioFile = (
    name: string,
    reason: 'corrupted' | 'size' | 'type'
  ) => {
    console.error('Invalid Audio File', { name, reason })
    // TODO: show file error
  }

  const detectCategory = useCallback(
    (filename: string): Nullable<StemCategory> => {
      const lowerCaseFilename = filename.toLowerCase()
      return (
        stemDropdownRows.find((category) =>
          lowerCaseFilename.includes(category.toString().toLowerCase())
        ) ?? null
      )
    },
    []
  )

  const handleAddStems = useCallback(
    async (selectedStems: File[]) => {
      const processedFiles = processFiles(selectedStems, invalidAudioFile)
      const newStems = (await Promise.all(processedFiles))
        .filter(removeNullable)
        .map((processedFile) => {
          const category = detectCategory(processedFile.file.name)
          return {
            ...processedFile,
            category,
            allowDelete: true,
            allowCategorySwitch: true
          }
        })
      setStemsValue([...stemsValue, ...newStems])
      props.onAddStems?.(selectedStems)
    },
    [detectCategory, props, setStemsValue, stemsValue]
  )

  const handleSelectCategory = useCallback(
    (category: StemCategory, index: number) => {
      stemsValue[index].category = category
      setStemsValue(stemsValue)
      props.onSelectCategory?.(category, index)
    },
    [props, setStemsValue, stemsValue]
  )

  const handleDeleteStem = useCallback(
    (index: number) => {
      // Make a copy to be sure children reading this value will re-render.
      const newStems = [
        ...stemsValue.slice(0, index),
        ...stemsValue.slice(index + 1)
      ]
      setStemsValue(newStems)
      props.onDeleteStem?.(index)
    },
    [props, setStemsValue, stemsValue]
  )

  return (
    <div className={styles.fields}>
      <Text variant='body'>{messages.description}</Text>
      <Divider />
      <DownloadAvailability
        isUpload={props.isUpload}
        value={availabilityType}
        setValue={setAvailabilityType}
      />
      <SwitchRowField
        name={IS_DOWNLOADABLE}
        header={messages[IS_DOWNLOADABLE].header}
        description={messages[IS_DOWNLOADABLE].description}
      />
      <Divider />
      <StemFilesView
        stems={stemsValue}
        onAddStems={handleAddStems}
        onSelectCategory={handleSelectCategory}
        onDeleteStem={handleDeleteStem}
      />
    </div>
  )
}
