import { useCallback, useMemo } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useUSDCPurchaseConfig } from '@audius/common/hooks'
import { stemsAndDownloadsMessages as messages } from '@audius/common/messages'
import {
  AccessConditions,
  DownloadTrackAvailabilityType,
  FollowGatedConditions,
  isContentFollowGated,
  isContentUSDCPurchaseGated,
  StemCategory,
  stemCategoryFriendlyNames,
  StemUpload,
  USDCPurchaseConditions
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { IconCart, IconReceive } from '@audius/harmony'
import { FormikErrors } from 'formik'
import { get, set, groupBy } from 'lodash'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue,
  SelectedValues
} from 'components/data-entry/ContextualMenu'
import { useTrackField } from 'components/edit-track/hooks'

import {
  StemsAndDownloadsMenuFields,
  stemsAndDownloadsSchema
} from './StemsAndDownloadsMenuFields'
import { getCombinedDefaultGatedConditionValues } from './helpers'
import {
  DOWNLOAD_AVAILABILITY_TYPE,
  DOWNLOAD_CONDITIONS,
  DOWNLOAD_PRICE_HUMANIZED,
  GateKeeper,
  IS_DOWNLOAD_GATED,
  IS_DOWNLOADABLE,
  IS_ORIGINAL_AVAILABLE,
  IS_OWNED_BY_USER,
  LAST_GATE_KEEPER,
  STEMS,
  StemsAndDownloadsFormValues,
  STREAM_CONDITIONS
} from './types'

type StemsAndDownloadsFieldProps = {
  isUpload: boolean
  closeMenuCallback?: (data?: any) => void
}

export const StemsAndDownloadsField = (props: StemsAndDownloadsFieldProps) => {
  const { isUpload, closeMenuCallback } = props
  const usdcPurchaseConfig = useUSDCPurchaseConfig()

  const [{ value: isDownloadable }, , { setValue: setIsDownloadable }] =
    useTrackField<boolean>(IS_DOWNLOADABLE)
  const [
    { value: isOriginalAvailable },
    ,
    { setValue: setisOriginalAvailable }
  ] = useTrackField<boolean>(IS_ORIGINAL_AVAILABLE)
  const [{ value: stemsValue }, , { setValue: setStemsValue }] =
    useTrackField<StemUpload[]>(STEMS)
  const [{ value: isDownloadGated }, , { setValue: setIsDownloadGated }] =
    useTrackField<boolean>(IS_DOWNLOAD_GATED)
  const [
    { value: savedDownloadConditions },
    ,
    { setValue: setDownloadConditions }
  ] = useTrackField<Nullable<AccessConditions>>(DOWNLOAD_CONDITIONS)
  const [{ value: streamConditions }] =
    useTrackField<Nullable<AccessConditions>>(STREAM_CONDITIONS)
  const [{ value: lastGateKeeper }, , { setValue: setLastGateKeeper }] =
    useTrackField<GateKeeper>(LAST_GATE_KEEPER)
  const [{ value: isOwnedByUser }, , { setValue: setIsOwnedByUser }] =
    useTrackField<boolean>(IS_OWNED_BY_USER)

  /**
   * Download conditions from inside the modal.
   * Upon submit, these values along with the selected access option will
   * determine the final download conditions that get saved to the track.
   */
  const { data: accountUserId } = useCurrentUserId()
  const tempDownloadConditions = useMemo(
    () => ({
      ...getCombinedDefaultGatedConditionValues(accountUserId),
      ...savedDownloadConditions
    }),
    [accountUserId, savedDownloadConditions]
  )

  const initialValues = useMemo(() => {
    const initialValues = {}
    set(initialValues, IS_DOWNLOADABLE, isDownloadable)
    set(initialValues, IS_ORIGINAL_AVAILABLE, isOriginalAvailable)
    set(initialValues, STEMS, stemsValue ?? [])
    set(initialValues, IS_DOWNLOAD_GATED, isDownloadGated)
    set(initialValues, DOWNLOAD_CONDITIONS, tempDownloadConditions)
    set(initialValues, STREAM_CONDITIONS, streamConditions)
    set(initialValues, LAST_GATE_KEEPER, lastGateKeeper ?? {})
    set(initialValues, IS_OWNED_BY_USER, isOwnedByUser)

    let availabilityType = DownloadTrackAvailabilityType.PUBLIC
    const isUsdcGated = isContentUSDCPurchaseGated(savedDownloadConditions)
    const isFollowGated = isContentFollowGated(savedDownloadConditions)
    if (isUsdcGated) {
      availabilityType = DownloadTrackAvailabilityType.USDC_PURCHASE
      set(
        initialValues,
        DOWNLOAD_PRICE_HUMANIZED,
        tempDownloadConditions.usdc_purchase.price
          ? (Number(tempDownloadConditions.usdc_purchase.price) / 100).toFixed(
              2
            )
          : undefined
      )
    }
    if (isFollowGated) {
      availabilityType = DownloadTrackAvailabilityType.FOLLOWERS
    }
    set(initialValues, DOWNLOAD_AVAILABILITY_TYPE, availabilityType)
    return initialValues as StemsAndDownloadsFormValues
  }, [
    isDownloadable,
    isOriginalAvailable,
    stemsValue,
    isDownloadGated,
    tempDownloadConditions,
    streamConditions,
    lastGateKeeper,
    isOwnedByUser,
    savedDownloadConditions
  ])

  const handleSubmit = useCallback(
    (values: StemsAndDownloadsFormValues) => {
      const availabilityType = get(values, DOWNLOAD_AVAILABILITY_TYPE)
      const downloadConditions = get(values, DOWNLOAD_CONDITIONS)
      const isDownloadable = get(values, IS_DOWNLOADABLE)
      const stems = get(values, STEMS)
      const lastGateKeeper = get(values, LAST_GATE_KEEPER)
      const isOwnedByUser = get(values, IS_OWNED_BY_USER)

      setIsDownloadable(isDownloadable)
      setisOriginalAvailable(get(values, IS_ORIGINAL_AVAILABLE))
      setStemsValue(
        stems.map((stem) => ({
          ...stem,
          category: stem.category ?? StemCategory.OTHER
        }))
      )

      if (isDownloadable) {
        setLastGateKeeper({
          ...lastGateKeeper,
          downloadable: 'stemsAndDownloads'
        })
      }

      // If download does not inherit from stream conditions,
      // extract the correct download conditions based on the selected availability type.
      if (!streamConditions) {
        setIsDownloadGated(false)
        setDownloadConditions(null)
        switch (availabilityType) {
          case DownloadTrackAvailabilityType.USDC_PURCHASE: {
            setIsDownloadGated(true)
            const {
              usdc_purchase: { price }
            } = downloadConditions as USDCPurchaseConditions
            setDownloadConditions({
              // @ts-ignore fully formed in saga (validated + added splits)
              usdc_purchase: { price: Math.round(price) }
            })
            setLastGateKeeper({
              ...lastGateKeeper,
              access: 'stemsAndDownloads'
            })
            setIsOwnedByUser(!!isOwnedByUser)
            break
          }
          case DownloadTrackAvailabilityType.FOLLOWERS: {
            setIsDownloadGated(true)
            const { follow_user_id } =
              downloadConditions as FollowGatedConditions
            setDownloadConditions({ follow_user_id })
            setLastGateKeeper({
              ...lastGateKeeper,
              access: 'stemsAndDownloads'
            })
            break
          }
          case DownloadTrackAvailabilityType.PUBLIC: {
            break
          }
        }
      }
    },
    [
      setIsOwnedByUser,
      setIsDownloadable,
      setisOriginalAvailable,
      setStemsValue,
      streamConditions,
      setLastGateKeeper,
      setIsDownloadGated,
      setDownloadConditions
    ]
  )

  const renderValue = useCallback(() => {
    let values = []
    if (!streamConditions) {
      if (isContentUSDCPurchaseGated(savedDownloadConditions)) {
        values.push({
          label: messages.price(
            savedDownloadConditions.usdc_purchase.price / 100
          ),
          icon: IconCart
        })
      }
      if (isContentFollowGated(savedDownloadConditions)) {
        values.push(messages.values.followerGated)
      }
    }
    if (isDownloadable) {
      values.push(messages.values.allowDownload)
    }
    const stemsCategories =
      stemsValue?.map((stem) =>
        stem.category
          ? stemCategoryFriendlyNames[stem.category]
          : StemCategory.OTHER
      ) ?? []
    values = [...values, ...stemsCategories]

    if (values.length === 0) return null

    const getLabel = (value: any) =>
      typeof value === 'string' ? value : value.label
    const groupedValues = groupBy(values, getLabel)

    // Convert grouped values into array with counts
    const displayValues = Object.entries(groupedValues).map(
      ([label, items]) => {
        const originalValue = items[0]
        const count = items.length

        if (typeof originalValue === 'object') {
          return {
            ...originalValue,
            label: `${originalValue.label} (${count})`
          }
        }

        // Check if this value is a stem category by checking if it exists in the stems array
        const isStemCategory = stemsCategories.includes(label)
        return isStemCategory ? `${label} (${count})` : label
      }
    )

    return (
      <SelectedValues>
        {displayValues.map((value, i) => {
          const valueProps =
            typeof value === 'string' ? { label: value } : value
          return (
            <SelectedValue key={`${valueProps.label}-${i}`} {...valueProps} />
          )
        })}
      </SelectedValues>
    )
  }, [isDownloadable, savedDownloadConditions, stemsValue, streamConditions])

  return (
    <ContextualMenu
      label={messages.title}
      description={messages.description}
      icon={<IconReceive />}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      renderValue={renderValue}
      validationSchema={toFormikValidationSchema(
        stemsAndDownloadsSchema({
          ...usdcPurchaseConfig
        })
      )}
      menuFields={<StemsAndDownloadsMenuFields isUpload={isUpload} />}
      closeMenuCallback={closeMenuCallback}
      displayMenuErrorMessage={(
        errors: FormikErrors<StemsAndDownloadsFormValues>
      ) => {
        return errors[IS_DOWNLOAD_GATED] ?? null
      }}
    />
  )
}
