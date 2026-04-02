import { useArtistCoin } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button, Flex, Paper, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'

const messages = {
  fanClub: 'Fan Club',
  viewFanClub: 'View Fan Club'
}

export const BuyArtistCoinCard = ({ mint }: { mint: string }) => {
  const { data: artistCoin, isLoading } = useArtistCoin(mint)
  const navigate = useNavigate()

  const handleViewFanClub = () => {
    if (artistCoin?.ticker) {
      navigate(route.coinPage(artistCoin.ticker))
    }
  }

  if (isLoading || !artistCoin) {
    return null
  }
  return (
    <Flex column gap='s'>
      <Text variant='title' size='l'>
        {messages.fanClub}
      </Text>
      <Paper
        column
        gap='s'
        ph='m'
        pv='s'
        onClick={handleViewFanClub}
        css={{ cursor: 'pointer' }}
        border='default'
      >
        <Flex gap='s' alignItems='center'>
          <TokenIcon logoURI={artistCoin.logoUri} size='xl' hex />
          <Flex column gap='2xs'>
            <Text variant='title' size='l'>
              {artistCoin.name}
            </Text>
            <Text variant='title' size='s' color='subdued'>
              {`$${artistCoin.ticker}`}
            </Text>
          </Flex>
        </Flex>
        <Button
          size='small'
          onClick={handleViewFanClub}
          color='coinGradient'
          fullWidth
        >
          {messages.viewFanClub}
        </Button>
      </Paper>
    </Flex>
  )
}
