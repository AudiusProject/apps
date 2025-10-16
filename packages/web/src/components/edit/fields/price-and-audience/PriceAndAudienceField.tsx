import { useCallback, useMemo, useState } from 'react'

import { useArtistCoin, useCurrentUserId } from '@audius/common/api'
import { useUSDCPurchaseConfig } from '@audius/common/hooks'
import { priceAndAudienceMessages } from '@audius/common/messages'
import {
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType,
  FollowGatedConditions,
  TipGatedConditions,
  USDCPurchaseConditions,
  AccessConditions,
  isContentTokenGated,
  TokenGatedConditions
} from '@audius/common/models'
import { CollectionValues } from '@audius/common/schemas'
import {
  EditCollectionValues,
  useEditAccessConfirmationModal
} from '@audius/common/store'
import { getUsersMayLoseAccess } from '@audius/common/utils'
import {
  IconCart,
  IconVisibilityHidden as IconHidden,
  IconNote,
  IconSparkles,
  Artwork
} from '@audius/harmony'
import { useField, useFormikContext } from 'formik'
import { get, isEmpty, set } from 'lodash'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue,
  SelectedValueProps
} from 'components/data-entry/ContextualMenu'
import { useIndexedField, useTrackField } from 'components/edit-track/hooks'
import {
  SingleTrackEditValues,
  TrackEditFormValues
} from 'components/edit-track/types'
import { defaultFieldVisibility } from 'pages/track-page/utils'

import { REMIX_OF } from '../RemixSettingsField'
import { getCombinedDefaultGatedConditionValues } from '../helpers'
import {
  AccessAndSaleFormValues,
  DOWNLOAD_CONDITIONS,
  FIELD_VISIBILITY,
  GateKeeper,
  IS_DOWNLOADABLE,
  IS_DOWNLOAD_GATED,
  IS_OWNED_BY_USER,
  IS_PRIVATE,
  IS_SCHEDULED_RELEASE,
  IS_STREAM_GATED,
  IS_UNLISTED,
  LAST_GATE_KEEPER,
  PREVIEW,
  PRICE_HUMANIZED,
  SPECIAL_ACCESS_TYPE,
  STREAM_AVAILABILITY_TYPE,
  STREAM_CONDITIONS,
  SpecialAccessType
} from '../types'

import styles from './PriceAndAudienceField.module.css'
import { PriceAndAudienceMenuFields } from './PriceAndAudienceMenuFields'
import { priceAndAudienceSchema } from './priceAndAudienceSchema'

const messages = {
  ...priceAndAudienceMessages,
  fieldVisibility: {
    genre: 'Show Genre',
    mood: 'Show Mood',
    tags: 'Show Tags',
    share: 'Show Share Button',
    play_count: 'Show Play Count',
    remixes: 'Show Remixes'
  },
  ownersOf: 'Owners Of',
  price: (price: number) =>
    price.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
  preview: (seconds: number) => {
    return `${seconds.toString()} seconds`
  }
}

type PriceAndAudienceFieldProps = {
  isUpload?: boolean
  isAlbum?: boolean
  trackLength?: number
  forceOpen?: boolean
  setForceOpen?: (value: boolean) => void
  isPublishDisabled?: boolean
}

export const PriceAndAudienceField = (props: PriceAndAudienceFieldProps) => {
  const {
    isUpload,
    isAlbum,
    forceOpen,
    setForceOpen,
    isPublishDisabled = false
  } = props

  const [isConfirmationCancelled, setIsConfirmationCancelled] = useState(false)

  const isHiddenFieldName = isAlbum ? IS_PRIVATE : IS_UNLISTED

  const [{ value: index }] = useField('trackMetadatasIndex')
  const [{ value: previewTrackLength }] = useIndexedField<number>(
    'tracks',
    index,
    'preview.duration'
  )
  const [{ value: trackDuration }] = useTrackField<number>('duration')
  const trackLength = isUpload ? previewTrackLength : trackDuration

  const usdcPurchaseConfig = useUSDCPurchaseConfig()

  // For edit flows we need to track initial stream conditions from the parent form (not from inside contextual menu)
  // So we take this from the parent form and pass it down to the menu fields
  const { initialValues: parentFormInitialValues } = useFormikContext<
    EditCollectionValues | CollectionValues | TrackEditFormValues
  >()
  const parentFormInitialStreamConditions =
    'stream_conditions' in parentFormInitialValues
      ? (parentFormInitialValues.stream_conditions as AccessConditions)
      : 'trackMetadatas' in parentFormInitialValues
        ? parentFormInitialValues.trackMetadatas[index].stream_conditions
        : undefined

  // Fields from the outer form
  const [{ value: isUnlisted }, , { setValue: setIsUnlistedValue }] =
    useTrackField<boolean>(isHiddenFieldName)
  const [{ value: isScheduledRelease }, ,] =
    useTrackField<SingleTrackEditValues[typeof IS_SCHEDULED_RELEASE]>(
      IS_SCHEDULED_RELEASE
    )
  const [{ value: isStreamGated }, , { setValue: setIsStreamGated }] =
    useTrackField<SingleTrackEditValues[typeof IS_STREAM_GATED]>(
      IS_STREAM_GATED
    )
  const [
    { value: savedStreamConditions },
    ,
    { setValue: setStreamConditionsValue }
  ] =
    useTrackField<SingleTrackEditValues[typeof STREAM_CONDITIONS]>(
      STREAM_CONDITIONS
    )

  const [{ value: fieldVisibility }, , { setValue: setFieldVisibilityValue }] =
    useTrackField<SingleTrackEditValues[typeof FIELD_VISIBILITY]>(
      FIELD_VISIBILITY
    )
  const [{ value: remixOfValue }] =
    useTrackField<SingleTrackEditValues[typeof REMIX_OF]>(REMIX_OF)

  const [{ value: preview }, , { setValue: setPreviewValue }] =
    useTrackField<SingleTrackEditValues[typeof PREVIEW]>(PREVIEW)

  const [{ value: isDownloadGated }, , { setValue: setIsDownloadGated }] =
    useTrackField<SingleTrackEditValues[typeof IS_DOWNLOAD_GATED]>(
      IS_DOWNLOAD_GATED
    )
  const [
    { value: downloadConditions },
    ,
    { setValue: setDownloadConditionsValue }
  ] =
    useTrackField<SingleTrackEditValues[typeof DOWNLOAD_CONDITIONS]>(
      DOWNLOAD_CONDITIONS
    )
  const [{ value: isDownloadable }, , { setValue: setIsDownloadable }] =
    useTrackField<boolean>(IS_DOWNLOADABLE)
  const [{ value: lastGateKeeper }, , { setValue: setLastGateKeeper }] =
    useTrackField<GateKeeper>(LAST_GATE_KEEPER)

  const [{ value: isOwnedByUser }, , { setValue: setIsOwnedByUser }] =
    useTrackField<boolean>(IS_OWNED_BY_USER)

  const isRemix = !isEmpty(remixOfValue?.tracks)

  /**
   * Stream conditions from inside the modal.
   * Upon submit, these values along with the selected access option will
   * determine the final stream conditions that get saved to the track.
   */
  const { data: accountUserId } = useCurrentUserId()
  const tempStreamConditions = useMemo(
    () => ({
      ...getCombinedDefaultGatedConditionValues(accountUserId),
      ...savedStreamConditions
    }),
    [accountUserId, savedStreamConditions]
  )

  const { onOpen: onOpenEditAccessConfirmationModal } =
    useEditAccessConfirmationModal()

  const isUsdcGated = isContentUSDCPurchaseGated(savedStreamConditions)
  const isTipGated = isContentTipGated(savedStreamConditions)
  const isFollowGated = isContentFollowGated(savedStreamConditions)
  const isTokenGated = isContentTokenGated(savedStreamConditions)

  const initialValues = useMemo(() => {
    const initialValues = {}
    set(initialValues, isHiddenFieldName, isUnlisted)
    set(initialValues, IS_STREAM_GATED, isStreamGated)
    set(initialValues, STREAM_CONDITIONS, tempStreamConditions)
    set(initialValues, IS_DOWNLOAD_GATED, isDownloadGated)
    set(initialValues, DOWNLOAD_CONDITIONS, downloadConditions)
    set(initialValues, IS_DOWNLOADABLE, isDownloadable)
    set(initialValues, LAST_GATE_KEEPER, lastGateKeeper ?? {})
    set(initialValues, IS_OWNED_BY_USER, isOwnedByUser)

    let availabilityType = StreamTrackAvailabilityType.FREE

    if (isUsdcGated) {
      availabilityType = StreamTrackAvailabilityType.USDC_PURCHASE
      set(
        initialValues,
        PRICE_HUMANIZED,
        tempStreamConditions.usdc_purchase.price
          ? (Number(tempStreamConditions.usdc_purchase.price) / 100).toFixed(2)
          : undefined
      )
    }
    if (isFollowGated || isTipGated) {
      availabilityType = StreamTrackAvailabilityType.SPECIAL_ACCESS
    }
    if (isTokenGated) {
      availabilityType = StreamTrackAvailabilityType.TOKEN_GATED
    }
    set(initialValues, STREAM_AVAILABILITY_TYPE, availabilityType)
    set(initialValues, FIELD_VISIBILITY, fieldVisibility)
    set(initialValues, PREVIEW, preview ?? 0)
    set(
      initialValues,
      SPECIAL_ACCESS_TYPE,
      isTipGated ? SpecialAccessType.TIP : SpecialAccessType.FOLLOW
    )
    return initialValues as AccessAndSaleFormValues
  }, [
    isHiddenFieldName,
    isUnlisted,
    isStreamGated,
    tempStreamConditions,
    isDownloadGated,
    downloadConditions,
    isDownloadable,
    lastGateKeeper,
    isOwnedByUser,
    isUsdcGated,
    isFollowGated,
    isTipGated,
    isTokenGated,
    fieldVisibility,
    preview
  ])

  const handleSubmit = useCallback(
    (values: AccessAndSaleFormValues) => {
      const availabilityType = get(values, STREAM_AVAILABILITY_TYPE)
      const preview = get(values, PREVIEW)
      const specialAccessType = get(values, SPECIAL_ACCESS_TYPE)
      const fieldVisibility = get(values, FIELD_VISIBILITY)
      const streamConditions = get(values, STREAM_CONDITIONS)
      const lastGateKeeper = get(values, LAST_GATE_KEEPER)
      const isOwnedByUser = get(values, IS_OWNED_BY_USER)

      setFieldVisibilityValue({
        ...defaultFieldVisibility,
        remixes: fieldVisibility?.remixes ?? defaultFieldVisibility.remixes
      })
      setIsStreamGated(false)
      setStreamConditionsValue(null)
      setPreviewValue(undefined)

      // For gated options, extract the correct stream conditions based on the selected availability type
      switch (availabilityType) {
        case StreamTrackAvailabilityType.USDC_PURCHASE: {
          // type cast because the object is fully formed in saga (validated + added splits)
          const albumTrackPriceValue = (
            streamConditions as USDCPurchaseConditions
          ).usdc_purchase.albumTrackPrice
          const conditions = {
            usdc_purchase: {
              price: Math.round(
                (streamConditions as USDCPurchaseConditions).usdc_purchase.price
              ),
              albumTrackPrice: albumTrackPriceValue
                ? Math.round(albumTrackPriceValue)
                : null
            }
          } as USDCPurchaseConditions
          setIsStreamGated(true)
          setStreamConditionsValue(conditions)
          setPreviewValue(preview ?? 0)
          setIsDownloadGated(true)
          setDownloadConditionsValue(conditions)
          setIsDownloadable(true)
          setIsOwnedByUser(!!isOwnedByUser)
          const downloadableGateKeeper =
            isDownloadable &&
            lastGateKeeper.downloadable === 'stemsAndDownloads'
              ? 'stemsAndDownloads'
              : 'accessAndSale'
          setLastGateKeeper({
            ...lastGateKeeper,
            access: 'accessAndSale',
            downloadable: downloadableGateKeeper
          })
          break
        }
        case StreamTrackAvailabilityType.SPECIAL_ACCESS: {
          if (specialAccessType === SpecialAccessType.FOLLOW) {
            const { follow_user_id } = streamConditions as FollowGatedConditions
            setStreamConditionsValue({ follow_user_id })
            setDownloadConditionsValue({ follow_user_id })
          } else {
            const { tip_user_id } = streamConditions as TipGatedConditions
            setStreamConditionsValue({ tip_user_id })
            setDownloadConditionsValue({ tip_user_id })
          }
          setIsStreamGated(true)
          setIsDownloadGated(true)
          setLastGateKeeper({
            ...lastGateKeeper,
            access: 'accessAndSale'
          })
          break
        }
        case StreamTrackAvailabilityType.TOKEN_GATED: {
          const { token_gate } = streamConditions as TokenGatedConditions
          setIsStreamGated(true)
          setStreamConditionsValue({ token_gate })
          setIsDownloadGated(true)
          setDownloadConditionsValue({ token_gate })
          setLastGateKeeper({
            ...lastGateKeeper,
            access: 'accessAndSale'
          })
          break
        }
        case StreamTrackAvailabilityType.HIDDEN: {
          setFieldVisibilityValue({
            ...(fieldVisibility ?? undefined),
            remixes: fieldVisibility?.remixes ?? defaultFieldVisibility.remixes
          })
          setIsUnlistedValue(true)
          if (lastGateKeeper.access === 'accessAndSale') {
            setIsDownloadGated(false)
            setDownloadConditionsValue(null)
          }
          if (lastGateKeeper.downloadable === 'accessAndSale') {
            setIsDownloadable(false)
          }
          break
        }
        case StreamTrackAvailabilityType.PUBLIC: {
          // TODO - KJ: See if we need to clear the download conditions when going back to public from token gated
          setIsUnlistedValue(false)
          if (lastGateKeeper.access === 'accessAndSale') {
            setIsDownloadGated(false)
            setDownloadConditionsValue(null)
          }
          if (lastGateKeeper.downloadable === 'accessAndSale') {
            setIsDownloadable(false)
          }
          break
        }
      }
    },
    [
      setFieldVisibilityValue,
      setIsUnlistedValue,
      setIsStreamGated,
      setStreamConditionsValue,
      setPreviewValue,
      setIsDownloadGated,
      setDownloadConditionsValue,
      setIsDownloadable,
      isDownloadable,
      setLastGateKeeper,
      setIsOwnedByUser
    ]
  )

  const { data: token } = useArtistCoin(
    tempStreamConditions.token_gate?.token_mint ?? ''
  )

  const renderValue = useCallback(() => {
    let selectedValues: (SelectedValueProps | string)[] = []

    const specialAccessValue = {
      label: messages.specialAccess,
      icon: IconSparkles
    }

    if (isContentUSDCPurchaseGated(savedStreamConditions)) {
      selectedValues = [
        { label: messages.premium },
        {
          label: messages.price(
            savedStreamConditions.usdc_purchase.price / 100
          ),
          icon: IconCart,
          'data-testid': `price-display`
        }
      ]
      if (preview) {
        selectedValues.push({
          label: messages.preview(preview),
          icon: IconNote
        })
      }
      const albumTrackPrice =
        savedStreamConditions.usdc_purchase.albumTrackPrice
      if (albumTrackPrice && isUpload) {
        selectedValues.push({
          label: messages.price(albumTrackPrice / 100),
          icon: IconNote,
          'data-testid': `track-price-display`
        })
      }
    } else if (isContentFollowGated(savedStreamConditions)) {
      selectedValues = [specialAccessValue, messages.followersOnly]
    } else if (isContentTipGated(savedStreamConditions)) {
      selectedValues = [specialAccessValue, messages.supportersOnly]
    } else if (isContentTokenGated(savedStreamConditions)) {
      selectedValues = [
        {
          label: messages.coinGated,
          startAdornment: (
            <Artwork src={token?.logoUri} hex h={20} w={20} borderWidth={0} />
          )
        }
      ]
    } else {
      selectedValues = [{ label: messages.free }]
    }

    return (
      <div className={styles.value}>
        {selectedValues.map((value) => {
          const valueProps =
            typeof value === 'string' ? { label: value } : value
          return (
            <SelectedValue
              key={
                'data-testid' in valueProps
                  ? valueProps['data-testid']
                  : valueProps.label
              }
              {...valueProps}
            />
          )
        })}
      </div>
    )
  }, [savedStreamConditions, preview, isUpload, token])

  return (
    <ContextualMenu
      label={messages.title}
      description={
        isFollowGated
          ? messages.specialAccessDescription
          : messages.freePremiumDescription
      }
      icon={<IconHidden />}
      initialValues={initialValues}
      onSubmit={(values) => {
        const availabilityType = get(values, STREAM_AVAILABILITY_TYPE)
        const specialAccessType = get(values, SPECIAL_ACCESS_TYPE)
        const usersMayLoseAccess = getUsersMayLoseAccess({
          availability: availabilityType,
          initialStreamConditions: parentFormInitialStreamConditions,
          specialAccessType:
            specialAccessType === SpecialAccessType.FOLLOW ? 'follow' : 'tip'
        })

        if (!isUpload && usersMayLoseAccess) {
          onOpenEditAccessConfirmationModal({
            confirmCallback: () => handleSubmit(values),
            cancelCallback: () => {
              setIsConfirmationCancelled(true)
            }
          })
        } else {
          handleSubmit(values)
        }
      }}
      renderValue={renderValue}
      validationSchema={toFormikValidationSchema(
        priceAndAudienceSchema(
          trackLength,
          usdcPurchaseConfig,
          isAlbum,
          isUpload
        )
      )}
      menuFields={
        <PriceAndAudienceMenuFields
          isRemix={isRemix}
          isUpload={isUpload}
          isAlbum={isAlbum}
          streamConditions={tempStreamConditions}
          isScheduledRelease={isScheduledRelease}
          isInitiallyUnlisted={isUnlisted}
          isPublishDisabled={isPublishDisabled}
        />
      }
      forceOpen={isConfirmationCancelled || forceOpen}
      setForceOpen={
        isConfirmationCancelled ? setIsConfirmationCancelled : setForceOpen
      }
    />
  )
}
