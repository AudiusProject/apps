import { useMemo } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import type { AccessConditions } from '@audius/common/models'
import {
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  decimalIntegerToHumanReadable,
  type Nullable
} from '@audius/common/utils'
import { useField } from 'formik'

import { spacing } from '@audius/harmony-native'
import type { ContextualMenuProps } from 'app/components/core'
import { ContextualMenu, TokenIcon } from 'app/components/core'

export const priceAndAudienceScreenName = 'PriceAndAudience'

type PriceAndAudienceFieldProps = Partial<ContextualMenuProps>

export const PriceAndAudienceField = (props: PriceAndAudienceFieldProps) => {
  const [{ value: streamConditions }] =
    useField<Nullable<AccessConditions>>('stream_conditions')

  const { data: token } = useArtistCoin(
    isContentTokenGated(streamConditions)
      ? streamConditions.token_gate.token_mint
      : ''
  )

  const trackAvailabilityLabels = useMemo(() => {
    if (isContentUSDCPurchaseGated(streamConditions)) {
      const amountLabel = `$${decimalIntegerToHumanReadable(
        streamConditions.usdc_purchase.price
      )}`
      return [messages.premium, amountLabel]
    }
    if (isContentFollowGated(streamConditions)) {
      return [messages.specialAccess, messages.followersOnly]
    }
    if (isContentTipGated(streamConditions)) {
      return [messages.specialAccess, messages.supportersOnly]
    }
    if (isContentTokenGated(streamConditions)) {
      return [messages.coinGated]
    }
    return [messages.free]
  }, [streamConditions])

  return (
    <ContextualMenu
      label={messages.title}
      startAdornment={
        isContentTokenGated(streamConditions) ? (
          <TokenIcon logoURI={token?.logoUri} size={spacing.l} />
        ) : null
      }
      menuScreenName={priceAndAudienceScreenName}
      value={trackAvailabilityLabels}
      {...props}
    />
  )
}
