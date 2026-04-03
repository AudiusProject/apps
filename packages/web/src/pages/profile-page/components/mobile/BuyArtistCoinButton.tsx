import { useArtistCreatedCoin } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { useNavigate } from 'react-router'

const messages = {
  viewFanClub: 'View Fan Club'
}

type BuyArtistCoinButtonProps = {
  userId: number
}

export const BuyArtistCoinButton = ({ userId }: BuyArtistCoinButtonProps) => {
  const { data: artistCoin, isPending: isArtistCoinLoading } =
    useArtistCreatedCoin(userId)
  const navigate = useNavigate()

  const handleViewFanClub = () => {
    if (artistCoin?.ticker) {
      navigate(route.coinPage(artistCoin.ticker))
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
      onClick={handleViewFanClub}
    >
      {messages.viewFanClub}
    </Button>
  )
}
