import { useArtistCreatedFanClub } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { useNavigate } from 'react-router'

const messages = {
  viewFanClub: 'View Fan Club'
}

type BuyFanClubButtonProps = {
  userId: number
}

export const BuyFanClubButton = ({ userId }: BuyFanClubButtonProps) => {
  const { data: fanClub, isPending: isFanClubLoading } =
    useArtistCreatedFanClub(userId)
  const navigate = useNavigate()

  const handleViewFanClub = () => {
    if (fanClub?.ticker) {
      navigate(route.coinPage(fanClub.ticker))
    }
  }

  // Don't render if user doesn't own a coin
  if (!fanClub?.mint || isFanClubLoading) {
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
