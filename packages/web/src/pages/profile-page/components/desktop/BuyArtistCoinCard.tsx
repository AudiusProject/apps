import { useArtistCoin, useExternalWalletBalance } from '@audius/common/api'
import { useBuySellInitialTab } from '@audius/common/hooks'
import { useBuySellModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Button, Flex, Paper, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { useExternalWalletAddress } from 'hooks/useExternalWalletAddress'
import { env } from 'services/env'

const messages = {
  buyCoins: 'Buy Coins'
}

export const BuyArtistCoinCard = ({ mint }: { mint: string }) => {
  const { data: artistCoin, isLoading } = useArtistCoin(mint)
  const { onOpen: openBuySellModal } = useBuySellModal()
  const navigate = useNavigate()
  const externalWalletAddress = useExternalWalletAddress()
  const { data: externalUsdcBalance } = useExternalWalletBalance({
    mint: env.USDC_MINT_ADDRESS,
    walletAddress: externalWalletAddress
  })
  const { data: externalAudioBalance } = useExternalWalletBalance({
    mint: env.WAUDIO_MINT_ADDRESS,
    walletAddress: externalWalletAddress
  })
  const initialTab = useBuySellInitialTab({
    externalUsdcBalance,
    externalAudioBalance
  })

  const handleBuyCoins = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering Paper's onClick
    openBuySellModal({
      ticker: artistCoin?.ticker ?? undefined,
      initialTab,
      isOpen: true
    })
  }

  const handleCardClick = () => {
    if (artistCoin?.ticker) {
      navigate(route.coinPage(artistCoin.ticker))
    }
  }

  if (isLoading || !artistCoin) {
    return null
  }
  return (
    <Paper
      column
      gap='s'
      ph='m'
      pv='s'
      onClick={handleCardClick}
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
        onClick={handleBuyCoins}
        color='coinGradient'
        fullWidth
      >
        {messages.buyCoins}
      </Button>
    </Paper>
  )
}
