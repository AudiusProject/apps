import { useCallback, useContext, useMemo, useState } from 'react'

import {
  UserCoin,
  useFanClub,
  useArtistCreatedFanClub,
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
  IconButton,
  IconKebabHorizontal,
  Paper,
  PopupMenu,
  PopupMenuItem,
  Text,
  useMedia,
  useTheme,
  IconCaretRight,
  IconLogoCircleUSDCPng,
  Tooltip
} from '@audius/harmony'
import { useNavigate } from 'react-router'
import { roundedHexClipPath } from '~harmony/icons/SVGDefs'

import { useBuySellRegionSupport } from 'components/buy-sell-modal'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { OpenAppDrawer } from 'pages/fan-club-detail-page/components/OpenAppDrawer'
import { env } from 'services/env'

import { AudioCoinCard } from './AudioCoinCard'
import { CoinRow } from './CoinCard'

const { CLUBS_EXPLORE_PAGE, CASH_PAGE } = route

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
      actionLabel='View Cash asset details'
    />
  )
}

const DiscoverFanClubsCard = ({ onClick }: { onClick: () => void }) => {
  const { color, spacing } = useTheme()

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
        '&:hover,&:focus-within': { backgroundColor: color.background.surface2 }
      }}
    >
      <Text variant='heading' size='s'>
        {walletMessages.fanClubs.title}
      </Text>
      <Flex alignItems='center' gap='m'>
        <button
          type='button'
          aria-label='Discover fan clubs'
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          css={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: spacing.unit8,
            height: spacing.unit8,
            padding: 0,
            border: 0,
            borderRadius: '50%',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            '&:focus': {
              outline: 'none'
            },
            '&:focus-visible': {
              outline:
                '2px solid var(--harmony-focus, var(--harmony-secondary))',
              outlineOffset: 2
            }
          }}
        >
          <IconCaretRight size='l' color='subdued' />
        </button>
      </Flex>
    </Flex>
  )
}

const CoinsListSkeleton = () => {
  const { spacing } = useTheme()
  const { isMobile } = useMedia()

  return (
    <Paper
      column
      shadow='far'
      borderRadius='l'
      border='default'
      css={{ overflow: 'hidden' }}
    >
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
  cashActions: 'Cash actions',
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

  const cashMenuItems: PopupMenuItem[] = useMemo(
    () => [
      { text: messages.addCash, onClick: handleAddCashClick },
      { text: messages.withdrawCash, onClick: handleWithdrawClick }
    ],
    [handleAddCashClick, handleWithdrawClick]
  )

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      gap='s'
      p='l'
      borderBottom='default'
    >
      <Text variant='heading' size='m' color='default'>
        {messages.assets}
      </Text>
      <Flex gap='s' alignItems='center'>
        {showCashButtons ? (
          <>
            <Flex
              gap='s'
              css={{
                '@container wallet (max-width: 640px)': { display: 'none' }
              }}
            >
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
            </Flex>
            <Box
              css={{
                display: 'none',
                '@container wallet (max-width: 640px)': {
                  display: 'inline-flex'
                }
              }}
            >
              <PopupMenu
                items={cashMenuItems}
                renderTrigger={(ref, trigger) => (
                  <IconButton
                    ref={ref}
                    icon={IconKebabHorizontal}
                    size='s'
                    color='subdued'
                    onClick={() => trigger()}
                    aria-label={messages.cashActions}
                  />
                )}
              />
            </Box>
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

  const { data: coinData, isPending: coinsDataLoading } = useFanClub(coin.mint)

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
      actionLabel={`View ${coinData?.name || tokenSymbol} asset details`}
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

  const { data: fanClubs, isPending: isLoadingCoins } = useUserCoins({
    userId: currentUserId
  })
  const { data: artistOwnedCoin } = useArtistCreatedFanClub(currentUserId)
  const audioCoin = fanClubs?.find(
    (coin) => coin?.mint === env.WAUDIO_MINT_ADDRESS
  )
  const otherCoins = fanClubs?.filter(
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
  // Add discover fan clubs card at the end
  const allCoins = [...coins, 'discover-fan-clubs' as const]

  const handleDiscoverFanClubs = useCallback(() => {
    navigate(CLUBS_EXPLORE_PAGE)
  }, [navigate])

  return (
    <Paper
      column
      shadow='far'
      borderRadius='l'
      border='default'
      css={{ overflow: 'hidden' }}
    >
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
                {item === 'discover-fan-clubs' ? (
                  <DiscoverFanClubsCard onClick={handleDiscoverFanClubs} />
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
