import { useArtistOwnedCoin } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { useBuySellModal } from '@audius/common/store'
import { Button } from '@audius/harmony'

const messages = {
  buyArtistCoin: 'Buy Artist Coin'
}

type BuyArtistCoinButtonProps = {
  userId: number
}

export const BuyArtistCoinButton = ({ userId }: BuyArtistCoinButtonProps) => {
  const { isEnabled: isArtistCoinsEnabled } = useFeatureFlag(
    FeatureFlags.ARTIST_COINS
  )
  const { data: artistCoin, isPending: isArtistCoinLoading } =
    useArtistOwnedCoin(userId)
  const { onOpen: openBuySellModal } = useBuySellModal()

  const handleBuyCoins = () => {
    if (artistCoin?.ticker) {
      openBuySellModal({ ticker: artistCoin.ticker, isOpen: true })
    }
  }

  // Don't render if artist coins feature is disabled or user doesn't own a coin
  if (!isArtistCoinsEnabled || !artistCoin?.mint || isArtistCoinLoading) {
    return null
  }

  return (
    <Button
      fullWidth
      size='small'
      color='coinGradient'
      onClick={handleBuyCoins}
    >
      {messages.buyArtistCoin}
    </Button>
  )
}
