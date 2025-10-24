import { useCallback, type MouseEvent } from 'react'

import { useArtistCoin } from '@audius/common/api'
import {
  isContentUSDCPurchaseGated,
  AccessConditions,
  Name,
  isContentTokenGated,
  TokenGatedConditions
} from '@audius/common/models'
import { useBuySellModal } from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import { Button, ButtonSize, IconLock } from '@audius/harmony'

import { make, track } from 'services/analytics'

const messages = {
  unlocking: 'Unlocking',
  locked: 'Locked',
  buyArtistCoin: 'Buy Artist Coin'
}

export const GatedConditionsPill = ({
  className,
  streamConditions,
  unlocking,
  onClick,
  showIcon = true,
  buttonSize = 'small',
  contentId,
  contentType
}: {
  streamConditions: AccessConditions
  unlocking: boolean
  onClick?: (e: MouseEvent) => void
  showIcon?: boolean
  className?: string
  buttonSize?: ButtonSize
  contentId: number
  contentType: string
}) => {
  const isPurchase = isContentUSDCPurchaseGated(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)

  let message = null
  if (unlocking) {
    // Show only spinner when unlocking a purchase
    message = isPurchase ? undefined : messages.unlocking
  } else {
    message = isPurchase
      ? USDC(streamConditions.usdc_purchase.price / 100).toLocaleString()
      : isTokenGated
        ? messages.buyArtistCoin
        : messages.locked
  }

  const { data: token } = useArtistCoin(
    (streamConditions as TokenGatedConditions)?.token_gate?.token_mint,
    { enabled: isTokenGated }
  )

  const { onOpen: openBuySellModal } = useBuySellModal()

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (isTokenGated) {
        openBuySellModal({ isOpen: true, ticker: token?.ticker })
      } else {
        track(
          make({
            eventName: Name.PURCHASE_CONTENT_BUY_CLICKED,
            contentId,
            contentType
          })
        )
        onClick?.(e)
      }
    },
    [
      contentId,
      contentType,
      isTokenGated,
      onClick,
      openBuySellModal,
      token?.ticker
    ]
  )

  return (
    <Button
      className={className}
      size={buttonSize}
      onClick={handleClick}
      color={isPurchase ? 'lightGreen' : isTokenGated ? 'coinGradient' : 'blue'}
      isLoading={unlocking}
      iconLeft={showIcon ? IconLock : undefined}
      // TODO: Add 'xs' button size in harmony
      css={{ height: '24px' }}
    >
      {message}
    </Button>
  )
}
