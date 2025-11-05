import { useFeatureFlag, useAccessAndRemixSettings } from '@audius/common/hooks'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import { StreamTrackAvailabilityType } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  RadioGroup,
  IconSparkles,
  IconQuestionCircle,
  Hint
} from '@audius/harmony'
import cn from 'classnames'
import { useField } from 'formik'

import { SingleTrackEditValues } from 'components/edit-track/types'
import layoutStyles from 'components/layout/layout.module.css'
import { ModalRadioItem } from 'components/modal-radio/ModalRadioItem'

import { SpecialAccessFields } from '../stream-availability/SpecialAccessFields'
import { TokenGatedRadioField } from '../stream-availability/token-gated/TokenGatedRadioField'
import { UsdcPurchaseGatedRadioField } from '../stream-availability/usdc-purchase-gated/UsdcPurchaseGatedRadioField'
import { STREAM_AVAILABILITY_TYPE, STREAM_CONDITIONS } from '../types'

type PriceAndAudienceMenuFieldsProps = {
  streamConditions: SingleTrackEditValues[typeof STREAM_CONDITIONS]
  isRemix: boolean
  isUpload?: boolean
  isAlbum?: boolean
  isInitiallyUnlisted?: boolean
  isScheduledRelease?: boolean
  isPublishDisabled?: boolean
}

export const PriceAndAudienceMenuFields = (
  props: PriceAndAudienceMenuFieldsProps
) => {
  const {
    isRemix,
    isUpload,
    isAlbum,
    isInitiallyUnlisted,
    isScheduledRelease,
    isPublishDisabled = false
  } = props

  const { isEnabled: isUdscPurchaseEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )

  const [availabilityField] = useField({ name: STREAM_AVAILABILITY_TYPE })

  const { disableSpecialAccessGate, disableSpecialAccessGateFields } =
    useAccessAndRemixSettings({
      isUpload: !!isUpload,
      isRemix,
      isAlbum,
      isInitiallyUnlisted: !!isInitiallyUnlisted,
      isScheduledRelease: !!isScheduledRelease,
      isPublishDisabled
    })

  return (
    <div className={cn(layoutStyles.col, layoutStyles.gap4)}>
      {isRemix ? (
        <Hint icon={IconQuestionCircle}>{messages.markedAsRemix}</Hint>
      ) : null}
      {isPublishDisabled ? <Hint>{messages.publishDisabled}</Hint> : null}
      <RadioGroup {...availabilityField} aria-label={messages.title}>
        <ModalRadioItem
          label={messages.freeRadio.title}
          description={messages.freeRadio.description(
            isAlbum ? 'album' : 'track'
          )}
          value={StreamTrackAvailabilityType.FREE}
          disabled={isPublishDisabled}
        />
        {isUdscPurchaseEnabled ? (
          <UsdcPurchaseGatedRadioField
            isRemix={isRemix}
            isUpload={isUpload}
            isAlbum={isAlbum}
            isInitiallyUnlisted={isInitiallyUnlisted}
            isPublishDisabled={isPublishDisabled}
          />
        ) : null}

        {!isAlbum ? (
          <ModalRadioItem
            icon={<IconSparkles />}
            label={messages.specialAccessRadio.title}
            description={messages.specialAccessRadio.description}
            value={StreamTrackAvailabilityType.SPECIAL_ACCESS}
            disabled={disableSpecialAccessGate}
            checkedContent={
              <SpecialAccessFields disabled={disableSpecialAccessGateFields} />
            }
            tooltipText={messages.fromFreeHint(
              isAlbum ? 'album' : 'track',
              'gated'
            )}
          />
        ) : null}
        {!isAlbum ? (
          <TokenGatedRadioField
            isRemix={isRemix}
            isUpload={isUpload}
            isInitiallyUnlisted={isInitiallyUnlisted}
          />
        ) : null}
      </RadioGroup>
    </div>
  )
}
