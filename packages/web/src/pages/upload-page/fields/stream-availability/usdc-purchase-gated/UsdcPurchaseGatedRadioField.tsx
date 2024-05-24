import { useCallback } from 'react'

import { useFeatureFlag, useAccessAndRemixSettings } from '@audius/common/hooks'
import {
  Name,
  StreamTrackAvailabilityType,
  AccessConditions
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { pluralize } from '@audius/common/utils'
import { IconCart, IconStars } from '@audius/harmony'

import { ExternalTextLink } from 'components/link'
import { ModalRadioItem } from 'components/modal-radio/ModalRadioItem'
import { make, track } from 'services/analytics'

import { UsdcPurchaseFields } from './UsdcPurchaseFields'
import styles from './UsdcPurchaseGatedRadioField.module.css'

const WAITLIST_TYPEFORM = 'https://link.audius.co/waitlist'

const messages = {
  usdcPurchase: 'Premium',
  usdcPurchaseSubtitle: (contentType: 'album' | 'track') =>
    `Unlockable by purchase, these ${pluralize(
      contentType,
      2
    )} are visible to everyone but only playable by users who have paid for access.`,
  waitlist:
    'Start selling your music on Audius today! Limited access beta now available.',
  join: 'Join the Waitlist',
  comingSoon: 'Coming Soon'
}

type UsdcPurchaseGatedRadioFieldProps = {
  isRemix: boolean
  isUpload?: boolean
  isAlbum?: boolean
  initialStreamConditions?: AccessConditions
  isInitiallyUnlisted?: boolean
  isPublishDisabled?: boolean
}

export const UsdcPurchaseGatedRadioField = (
  props: UsdcPurchaseGatedRadioFieldProps
) => {
  const {
    isRemix,
    isUpload,
    isAlbum,
    initialStreamConditions,
    isInitiallyUnlisted,
    isPublishDisabled
  } = props

  const handleClickWaitListLink = useCallback(() => {
    track(make({ eventName: Name.TRACK_UPLOAD_CLICK_USDC_WAITLIST_LINK }))
  }, [])

  const { isEnabled: isUsdcUploadEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES_UPLOAD
  )

  const { disableUsdcGate } = useAccessAndRemixSettings({
    isUpload: !!isUpload,
    isRemix,
    isAlbum,
    initialStreamConditions: initialStreamConditions ?? null,
    isInitiallyUnlisted: !!isInitiallyUnlisted,
    isPublishDisabled
  })
  const disabled = disableUsdcGate || !isUsdcUploadEnabled

  const helpContent = (
    <div className={styles.helpContent}>
      <div>{messages.waitlist}</div>
      <ExternalTextLink
        onClick={handleClickWaitListLink}
        className={styles.link}
        to={WAITLIST_TYPEFORM}
        target='_blank'
        ignoreWarning
      >
        {messages.join}
      </ExternalTextLink>
    </div>
  )

  return (
    <ModalRadioItem
      icon={<IconCart />}
      label={messages.usdcPurchase}
      description={messages.usdcPurchaseSubtitle(isAlbum ? 'album' : 'track')}
      value={StreamTrackAvailabilityType.USDC_PURCHASE}
      disabled={disabled}
      hintIcon={IconStars}
      hintContent={!isUsdcUploadEnabled ? helpContent : undefined}
      tag={!isUsdcUploadEnabled ? messages.comingSoon : undefined}
      checkedContent={
        <UsdcPurchaseFields
          disabled={disabled}
          isAlbum={isAlbum}
          isUpload={isUpload}
        />
      }
    />
  )
}
