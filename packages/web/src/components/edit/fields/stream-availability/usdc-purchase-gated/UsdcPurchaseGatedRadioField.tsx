import { useAccessAndRemixSettings } from '@audius/common/hooks'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import { StreamTrackAvailabilityType } from '@audius/common/models'
import { IconCart } from '@audius/harmony'

import { ModalRadioItem } from 'components/modal-radio/ModalRadioItem'

import { UsdcPurchaseFields } from './UsdcPurchaseFields'

type UsdcPurchaseGatedRadioFieldProps = {
  isRemix: boolean
  isUpload?: boolean
  isAlbum?: boolean
  isInitiallyUnlisted?: boolean
  isPublishDisabled?: boolean
}

export const UsdcPurchaseGatedRadioField = (
  props: UsdcPurchaseGatedRadioFieldProps
) => {
  const { isRemix, isUpload, isAlbum, isInitiallyUnlisted, isPublishDisabled } =
    props

  const { disableUsdcGate } = useAccessAndRemixSettings({
    isUpload: !!isUpload,
    isRemix,
    isAlbum,
    isInitiallyUnlisted: !!isInitiallyUnlisted,
    isPublishDisabled
  })

  return (
    <ModalRadioItem
      icon={<IconCart />}
      label={messages.premiumRadio.title}
      description={messages.premiumRadio.description(
        isAlbum ? 'album' : 'track'
      )}
      value={StreamTrackAvailabilityType.USDC_PURCHASE}
      disabled={disableUsdcGate}
      checkedContent={
        <UsdcPurchaseFields
          disabled={disableUsdcGate}
          isAlbum={isAlbum}
          isUpload={isUpload}
        />
      }
      tooltipText={
        disableUsdcGate
          ? messages.fromFreeHint(isAlbum ? 'album' : 'track', 'premium')
          : undefined
      }
    />
  )
}
