import { useArtistCreatedCoin } from '@audius/common/api'
import { useBuySellModal } from '@audius/common/store'
import { Button } from '@audius/harmony'

const messages = {
  buyArtistCoin: 'Buy Artist Coin'
}

type BuyArtistCoinButtonProps = {
  userId: number
}

export const BuyArtistCoinButton = ({ userId }: BuyArtistCoinButtonProps) => {
  const { data: artistCoin, isPending: isArtistCoinLoading } =
    useArtistCreatedCoin(userId)
  const { onOpen: openBuySellModal } = useBuySellModal()

  const handleBuyCoins = () => {
    if (artistCoin?.ticker) {
      openBuySellModal({ ticker: artistCoin.ticker, isOpen: true })
    }
  }

  // Don't render if user doesn't own a coin
  if (!artistCoin?.mint || isArtistCoinLoading) {
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
