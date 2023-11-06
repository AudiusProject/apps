import { useMemo } from 'react'

import {
  isPremiumContentFollowGated,
  type FieldVisibility,
  type Nullable,
  type PremiumConditions,
  isPremiumContentTipGated,
  isPremiumContentCollectibleGated,
  isPremiumContentUSDCPurchaseGated
} from '@audius/common'
import { useField } from 'formik'
import moment from 'moment'

import type { ContextualMenuProps } from 'app/components/core'
import { ContextualMenu } from 'app/components/core'

export const accessAndSaleScreenName = 'AccessAndSale'

const messages = {
  accessAndSale: 'Access & Sale',
  public: 'Public',
  premium: 'Premium',
  collectibleGated: 'Collectible Gated',
  specialAccess: 'Special Access',
  followersOnly: 'Followers Only',
  supportersOnly: 'Supporters Only',
  hidden: 'Hidden',
  showGenre: 'Show Genre',
  showMood: 'Show Mood',
  showTags: 'Show Tags',
  showShareButton: 'Show Share Button',
  showPlayCount: 'Show Play Count'
}

const fieldVisibilityLabelMap = {
  genre: messages.showGenre,
  mood: messages.showMood,
  tags: messages.showTags,
  share: messages.showShareButton,
  play_count: messages.showPlayCount
}

const fieldVisibilityKeys = Object.keys(fieldVisibilityLabelMap)

type AccessAndSaleFieldProps = Partial<ContextualMenuProps>

export const AccessAndSaleField = (props: AccessAndSaleFieldProps) => {
  const [{ value: premiumConditions }] =
    useField<Nullable<PremiumConditions>>('premium_conditions')
  const [{ value: isUnlisted }] = useField<boolean>('is_unlisted')
  const [{ value: fieldVisibility }] =
    useField<FieldVisibility>('field_visibility')
  const [{ value: releaseDate }] = useField<Nullable<string>>('release_date')
  const isScheduledRelease =
    releaseDate === null ? false : moment(releaseDate).isAfter(moment())

  const fieldVisibilityLabels = fieldVisibilityKeys
    .filter((visibilityKey) => fieldVisibility[visibilityKey])
    .map((visibilityKey) => fieldVisibilityLabelMap[visibilityKey])

  const trackAvailabilityLabels = useMemo(() => {
    if (isPremiumContentUSDCPurchaseGated(premiumConditions)) {
      const amountLabel = `$${premiumConditions.usdc_purchase.price}`
      return [messages.premium, amountLabel]
    }
    if (isPremiumContentCollectibleGated(premiumConditions)) {
      return [messages.collectibleGated]
    }
    if (isPremiumContentFollowGated(premiumConditions)) {
      return [messages.specialAccess, messages.followersOnly]
    }
    if (isPremiumContentTipGated(premiumConditions)) {
      return [messages.specialAccess, messages.supportersOnly]
    }
    if (isUnlisted || isScheduledRelease) {
      return [messages.hidden, ...fieldVisibilityLabels]
    }
    return [messages.public]
  }, [premiumConditions, isUnlisted, fieldVisibilityLabels])

  return (
    <ContextualMenu
      label={messages.accessAndSale}
      menuScreenName={accessAndSaleScreenName}
      value={trackAvailabilityLabels}
      {...props}
    />
  )
}
