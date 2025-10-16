import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFeatureFlag, useAccessAndRemixSettings } from '@audius/common/hooks'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import {
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  StreamTrackAvailabilityType
} from '@audius/common/models'
import type { AccessConditions } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { useEditAccessConfirmationModal } from '@audius/common/store'
import { getUsersMayLoseAccess, type Nullable } from '@audius/common/utils'
import { useField, useFormikContext } from 'formik'

import { Hint, IconCart } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { FormScreen } from 'app/screens/form-screen'

import type {
  FormValues,
  RemixOfField
} from '../../../screens/edit-track-screen/types'
import { ExpandableRadio } from '../ExpandableRadio'
import { ExpandableRadioGroup } from '../ExpandableRadioGroup'

import { PremiumRadioField } from './PremiumRadioField/PremiumRadioField'
import { TRACK_PREVIEW } from './PremiumRadioField/TrackPreviewField'
import { TRACK_PRICE } from './PremiumRadioField/TrackPriceField'
import { SpecialAccessRadioField } from './SpecialAccessRadioField'
import { TokenGatedRadioField } from './TokenGatedRadioField'

const publicAvailability = StreamTrackAvailabilityType.PUBLIC

export const PriceAndAudienceScreen = () => {
  const { initialValues, validateForm } = useFormikContext<FormValues>()
  const [, , { setValue: setIsStreamGated }] =
    useField<boolean>('is_stream_gated')
  const [{ value: streamConditions }, , { setValue: setStreamConditions }] =
    useField<Nullable<AccessConditions>>('stream_conditions')
  const [, , { setValue: setPreviewValue }] = useField<Nullable<number>>(
    'preview_start_seconds'
  )
  const [{ value: isScheduledRelease }] = useField<boolean>(
    'is_scheduled_release'
  )
  const [{ value: remixOf }] = useField<RemixOfField>('remix_of')
  const [{ value: entityType }] = useField<string>('entityType')
  const [{ value: isUpload }] = useField<boolean>('isUpload')
  const isRemix = !!remixOf

  const { isEnabled: isUsdcEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )
  const { isEnabled: isTokenGatingEnabled } = useFeatureFlag(
    FeatureFlags.TOKEN_GATING
  )

  const initialStreamConditions = initialValues?.stream_conditions ?? null
  const initialAvailability = useMemo(() => {
    if (isUsdcEnabled && isContentUSDCPurchaseGated(streamConditions)) {
      return StreamTrackAvailabilityType.USDC_PURCHASE
    }
    if (isContentTokenGated(streamConditions)) {
      return StreamTrackAvailabilityType.TOKEN_GATED
    }
    if (
      isContentFollowGated(streamConditions) ||
      isContentTipGated(streamConditions)
    ) {
      return StreamTrackAvailabilityType.SPECIAL_ACCESS
    }
    return StreamTrackAvailabilityType.PUBLIC
    // we only care about what the initial value was here
    // eslint-disable-next-line
  }, [])

  const { onOpen: onOpenEditAccessConfirmationModal } =
    useEditAccessConfirmationModal()

  const {
    disableUsdcGate: disableUsdcGateOption,
    disableSpecialAccessGate,
    disableSpecialAccessGateFields,
    disableTokenGate,
    disableTokenGateFields
  } = useAccessAndRemixSettings({
    isUpload,
    isRemix,
    isInitiallyUnlisted: initialValues.is_unlisted,
    isScheduledRelease
  })

  const disableUsdcGate = disableUsdcGateOption

  const [availability, setAvailability] =
    useState<StreamTrackAvailabilityType>(initialAvailability)

  const previousStreamConditions = useMemo(
    () => streamConditions ?? initialStreamConditions,
    // we only care about what the initial value was here
    // eslint-disable-next-line
    []
  )

  const [{ value: price }, { error: priceError }] = useField(TRACK_PRICE)
  const [{ value: preview }, { error: previewError }] = useField(TRACK_PREVIEW)

  const usdcGateIsInvalid = useMemo(() => {
    // first time user selects usdc purchase option
    const priceNotSet = price === null
    const previewNotSet = preview === null
    return (
      isContentUSDCPurchaseGated(streamConditions) &&
      (!!priceError || priceNotSet || !!previewError || previewNotSet)
    )
  }, [streamConditions, price, priceError, preview, previewError])

  const tokenGateHasNoSelectedToken = useMemo(
    () =>
      isContentTokenGated(streamConditions) &&
      !streamConditions.token_gate?.token_mint,
    [streamConditions]
  )

  /**
   * Do not navigate back if:
   * - track is token gated and user has not selected a token, or
   * - track is usdc purchase gated and user has not selected a valid price or preview
   */
  const isFormInvalid = usdcGateIsInvalid || tokenGateHasNoSelectedToken

  const navigation = useNavigation()
  const [usersMayLoseAccess, setUsersMayLoseAccess] = useState(false)
  const [specialAccessType, setSpecialAccessType] = useState<
    'follow' | 'tip' | undefined
  >(undefined)

  // We do not know whether or not the special access is of type follow or tip.
  // So we do that check here.
  useEffect(() => {
    if (isContentFollowGated(streamConditions)) {
      setSpecialAccessType('follow')
    } else if (isContentTipGated(streamConditions)) {
      setSpecialAccessType('tip')
    }
  }, [streamConditions])

  // Check if users may lose access based on the new audience.
  useEffect(() => {
    setUsersMayLoseAccess(
      getUsersMayLoseAccess({
        availability,
        initialStreamConditions,
        specialAccessType
      })
    )
  }, [availability, initialStreamConditions, specialAccessType])

  const handleSubmit = useCallback(() => {
    validateForm() // Fixes any erroneous errors that haven't been revalidated
    if (!isUpload && usersMayLoseAccess) {
      onOpenEditAccessConfirmationModal({
        confirmCallback: navigation.goBack,
        cancelCallback: navigation.goBack
      })
    }
  }, [
    isUpload,
    usersMayLoseAccess,
    validateForm,
    navigation.goBack,
    onOpenEditAccessConfirmationModal
  ])

  return (
    <FormScreen
      title={messages.title}
      icon={IconCart}
      variant='white'
      disableSubmit={isFormInvalid}
      stopNavigation={!isUpload && usersMayLoseAccess}
      onSubmit={handleSubmit}
      revertOnCancel
    >
      {isRemix ? <Hint m='l'>{messages.markedAsRemix}</Hint> : null}
      <ExpandableRadioGroup
        value={availability}
        onValueChange={setAvailability}
      >
        <ExpandableRadio
          value={publicAvailability}
          label={messages.freeRadio.title}
          description={messages.freeRadio.description('track')}
          onValueChange={() => {
            setIsStreamGated(false)
            setStreamConditions(null)
            setPreviewValue(null)
          }}
        />
        {isUsdcEnabled ? (
          <PremiumRadioField
            disabled={disableUsdcGate}
            previousStreamConditions={previousStreamConditions}
          />
        ) : null}
        {entityType === 'track' ? (
          <SpecialAccessRadioField
            disabled={
              disableSpecialAccessGate || disableSpecialAccessGateFields
            }
            previousStreamConditions={previousStreamConditions}
          />
        ) : null}
        {entityType === 'track' && isTokenGatingEnabled ? (
          <TokenGatedRadioField
            disabled={disableTokenGate || disableTokenGateFields}
            previousStreamConditions={previousStreamConditions}
          />
        ) : null}
      </ExpandableRadioGroup>
    </FormScreen>
  )
}
