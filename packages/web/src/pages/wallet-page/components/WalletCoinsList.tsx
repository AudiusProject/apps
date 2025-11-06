import { useCallback, useContext, useState } from 'react'

import {
  UserCoin,
  useArtistCoin,
  useArtistCreatedCoin,
  useCoinBalance,
  useCurrentUserId,
  useQueryContext,
  useUserCoins
} from '@audius/common/api'
import {
  useFormattedCoinBalance,
  useIsManagedAccount
} from '@audius/common/hooks'
import { buySellMessages, walletMessages } from '@audius/common/messages'
import {
  TOKEN_LISTING_MAP,
  useAddCashModal,
  useWithdrawUSDCModal,
  useBuySellModal
} from '@audius/common/store'
import { removeNullable, route } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  Paper,
  Text,
  useMedia,
  useTheme,
  IconCaretRight,
  IconLogoCircleUSDCPng
} from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'
import { roundedHexClipPath } from '~harmony/icons/SVGDefs'

import { useBuySellRegionSupport } from 'components/buy-sell-modal'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { useIsMobile } from 'hooks/useIsMobile'
import { OpenAppDrawer } from 'pages/coin-detail-page/components/OpenAppDrawer'
import { env } from 'services/env'

import { AudioCoinCard } from './AudioCoinCard'
import { CoinRow } from './CoinCard'

const { COINS_EXPLORE_PAGE, CASH_PAGE } = route

const USDCCoinCard = () => {
  const { data: currentUserId } = useCurrentUserId()
  const navigate = useNavigate()

  const { data: usdcBalance } = useCoinBalance({
    mint: env.USDC_MINT_ADDRESS,
    userId: currentUserId ?? undefined
  })
  const usdcBalanceFormatted = usdcBalance?.balance
    ? `$${usdcBalance?.balance?.toLocaleString('en-US', {
        maximumFractionDigits: 2
      })}`
    : '$0.00'
  return (
    <CoinRow
      onClick={() => navigate(CASH_PAGE)}
      name={messages.cash}
      icon={<IconLogoCircleUSDCPng width={64} height={64} hex />}
      symbol={TOKEN_LISTING_MAP.USDC.symbol}
      heldValue={usdcBalanceFormatted}
      dollarValue={usdcBalanceFormatted}
    />
  )
}

const DiscoverArtistCoinsCard = ({ onClick }: { onClick: () => void }) => {
  const { color } = useTheme()

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      p='l'
      h={96}
      flex={1}
      onClick={onClick}
      css={{
        cursor: 'pointer',
        '&:hover': { backgroundColor: color.background.surface2 }
      }}
    >
      <Text variant='heading' size='s'>
        {walletMessages.artistCoins.title}
      </Text>
      <Flex alignItems='center' gap='m'>
        <IconCaretRight size='l' color='subdued' />
      </Flex>
    </Flex>
  )
}

const CoinsListSkeleton = () => {
  const { spacing } = useTheme()
  const { isMobile } = useMedia()

  return (
    <Paper column shadow='far' borderRadius='l' css={{ overflow: 'hidden' }}>
      <Flex
        alignItems='center'
        justifyContent='space-between'
        p={isMobile ? spacing.l : undefined}
        alignSelf='stretch'
      >
        <Flex alignItems='center' gap='m' p='xl' flex={1}>
          <Skeleton
            width='64px'
            height='64px'
            css={{
              clipPath: `url(#${roundedHexClipPath})`
            }}
          />
          <Flex direction='column' gap='xs'>
            <Skeleton width='200px' height='36px' />
            <Skeleton width='100px' height='24px' />
          </Flex>
        </Flex>
      </Flex>
    </Paper>
  )
}

const messages = {
  ...buySellMessages,
  withdrawCash: 'Withdraw Cash',
  addCash: 'Add Cash',
  managedAccount: "You can't do that as a managed user",
  buySellNotSupported: 'This is not supported in your region'
}

const YourCoinsHeader = ({
  isLoading,
  openOpenAppDrawer
}: {
  isLoading: boolean
  openOpenAppDrawer: () => void
}) => {
  const { onOpen: openBuySellModal } = useBuySellModal()
  const isMobile = useIsMobile()
  const isManagedAccount = useIsManagedAccount()
  const { toast } = useContext(ToastContext)

  const { isBuySellSupported } = useBuySellRegionSupport()

  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { onOpen: openAddCashModal } = useAddCashModal()
  const handleWithdrawClick = useCallback(() => {
    openWithdrawUSDCModal()
  }, [openWithdrawUSDCModal])
  const handleAddCashClick = useCallback(() => {
    openAddCashModal()
  }, [openAddCashModal])

  const showCashButtons = !isMobile
  const handleBuySellClick = useCallback(() => {
    if (isManagedAccount) {
      toast(messages.managedAccount)
    } else {
      openBuySellModal()
    }
  }, [isManagedAccount, openBuySellModal, toast])

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      p='l'
      borderBottom='default'
    >
      <Text variant='heading' size='m' color='heading'>
        {messages.assets}
      </Text>
      <Flex gap='s'>
        {showCashButtons ? (
          <>
            <Button
              variant='secondary'
              size='small'
              onClick={handleAddCashClick}
            >
              {messages.addCash}
            </Button>
            <Button
              variant='secondary'
              size='small'
              onClick={handleWithdrawClick}
            >
              {messages.withdrawCash}
            </Button>
          </>
        ) : null}

        {!isLoading ? (
          <Tooltip
            disabled={isBuySellSupported}
            text={messages.buySellNotSupported}
            color='secondary'
            placement='left'
            shouldWrapContent={false}
          >
            <Box>
              <Button
                variant='primary'
                size='small'
                onClick={isMobile ? openOpenAppDrawer : handleBuySellClick}
                disabled={!isBuySellSupported}
              >
                {messages.buySell}
              </Button>
            </Box>
          </Tooltip>
        ) : null}
      </Flex>
    </Flex>
  )
}

const CoinCardWithBalance = ({ coin }: { coin: UserCoin }) => {
  const navigate = useNavigate()

  const tokenSymbol = coin.ticker

  const handleCoinClick = useCallback(
    (ticker: string) => {
      navigate(route.coinPage(ticker))
    },
    [navigate]
  )

  const {
    coinBalanceFormatted,
    coinDollarValue,
    isCoinBalanceLoading,
    isCoinPriceLoading,
    formattedHeldValue
  } = useFormattedCoinBalance(coin.mint)

  const { data: coinData, isPending: coinsDataLoading } = useArtistCoin(
    coin.mint
  )

  const isLoading =
    isCoinBalanceLoading || isCoinPriceLoading || coinsDataLoading

  return (
    <CoinRow
      icon={coinData?.logoUri}
      symbol={tokenSymbol ?? ''}
      balance={coinBalanceFormatted || ''}
      heldValue={formattedHeldValue}
      dollarValue={coinDollarValue || ''}
      loading={isLoading}
      name={coinData?.name ?? ''}
      onClick={() => handleCoinClick(coin.ticker)}
    />
  )
}

export const WalletCoinsList = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { env } = useQueryContext()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [isOpenAppDrawerOpen, setIsOpenAppDrawerOpen] = useState(false)

  const onOpenOpenAppDrawer = useCallback(() => {
    setIsOpenAppDrawerOpen(true)
  }, [])

  const onCloseOpenAppDrawer = useCallback(() => {
    setIsOpenAppDrawerOpen(false)
  }, [])

  const { data: artistCoins, isPending: isLoadingCoins } = useUserCoins({
    userId: currentUserId
  })
  const { data: artistOwnedCoin } = useArtistCreatedCoin(currentUserId)
  const audioCoin = artistCoins?.find(
    (coin) => coin?.mint === env.WAUDIO_MINT_ADDRESS
  )
  const otherCoins = artistCoins?.filter(
    (coin) =>
      coin?.mint !== env.WAUDIO_MINT_ADDRESS &&
      coin?.mint !== artistOwnedCoin?.mint &&
      coin?.balance > 0
  )
  // Ensure that the artist owned coin appears first in the list
  const orderedCoins = [
    audioCoin,
    artistOwnedCoin,
    ...(otherCoins ?? [])
  ].filter(removeNullable)

  // Show audio coin card when no coins are available
  const coins =
    orderedCoins.length === 0 ? ['audio-coin' as const] : orderedCoins
  // Add discover artist coins card at the end
  const allCoins = [...coins, 'discover-artist-coins' as const]

  const handleDiscoverArtistCoins = useCallback(() => {
    navigate(COINS_EXPLORE_PAGE)
  }, [navigate])

  return (
    <Paper column shadow='far' borderRadius='l' css={{ overflow: 'hidden' }}>
      <YourCoinsHeader
        isLoading={isLoadingCoins}
        openOpenAppDrawer={onOpenOpenAppDrawer}
      />
      <Flex column>
        {isLoadingCoins || !currentUserId ? (
          <CoinsListSkeleton />
        ) : (
          <>
            <USDCCoinCard />
            <Divider />
            {allCoins.map((item, idx) => (
              <Box key={typeof item === 'string' ? item : item.mint}>
                {item === 'discover-artist-coins' ? (
                  <DiscoverArtistCoinsCard
                    onClick={handleDiscoverArtistCoins}
                  />
                ) : item === 'audio-coin' ? (
                  <AudioCoinCard />
                ) : (
                  <CoinCardWithBalance coin={item as UserCoin} />
                )}
                {idx !== allCoins.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </>
        )}
        {isMobile ? (
          <OpenAppDrawer
            isOpen={isOpenAppDrawerOpen}
            onClose={onCloseOpenAppDrawer}
          />
        ) : null}
      </Flex>
    </Paper>
  )
}
