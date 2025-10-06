import { Fragment, useCallback, useContext, useState } from 'react'

import {
  UserCoin,
  useArtistCoin,
  useCurrentUserId,
  useQueryContext,
  useUserCoins
} from '@audius/common/api'
import {
  useFeatureFlag,
  useFormattedTokenBalance,
  useIsManagedAccount
} from '@audius/common/hooks'
import { buySellMessages, walletMessages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import { useBuySellModal } from '@audius/common/store'
import { route, ownedCoinsFilter } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  Paper,
  Text,
  useMedia,
  useTheme,
  IconCaretRight
} from '@audius/harmony'
import type { CSSObject } from '@emotion/react'
import { useNavigate } from 'react-router-dom-v5-compat'
import { roundedHexClipPath } from '~harmony/icons/SVGDefs'

import { useBuySellRegionSupport } from 'components/buy-sell-modal'
import Skeleton from 'components/skeleton/Skeleton'
import { ToastContext } from 'components/toast/ToastContext'
import Tooltip from 'components/tooltip/Tooltip'
import { useIsMobile } from 'hooks/useIsMobile'
import { OpenAppDrawer } from 'pages/asset-detail-page/components/OpenAppDrawer'

import { AudioCoinCard } from './AudioCoinCard'
import { CoinCard } from './CoinCard'

const { COINS_EXPLORE_PAGE } = route

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

// Helper function to determine if an item should have a right border
const shouldShowRightBorder = (
  index: number,
  isSingleColumn: boolean,
  shouldSpanFullWidth: boolean,
  isOddCount: boolean,
  totalItems: number
): boolean => {
  if (isSingleColumn || shouldSpanFullWidth) {
    return false
  }

  const isEvenIndex = index % 2 === 0
  const isItemBeforeFullWidth = isOddCount && index === totalItems - 2

  return isEvenIndex && !isItemBeforeFullWidth
}

// Helper function to build CSS styles for a coin item
const getCoinItemStyles = (
  shouldSpanFullWidth: boolean,
  shouldHaveRightBorder: boolean,
  shouldHaveTopBorder: boolean,
  borderColor: string
): CSSObject => {
  const baseStyles: CSSObject = {
    position: 'relative',
    padding: '0'
  }

  if (shouldSpanFullWidth) {
    baseStyles.gridColumn = '1 / -1'
    if (shouldHaveTopBorder) {
      baseStyles.borderTop = `1px solid ${borderColor}`
    }
  } else if (shouldHaveRightBorder) {
    baseStyles.borderRight = `1px solid ${borderColor}`
    baseStyles.paddingRight = '0'
  }

  return baseStyles
}

const YourCoinsSkeleton = () => {
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
  const { isEnabled: isWalletUIBuySellEnabled } = useFeatureFlag(
    FeatureFlags.WALLET_UI_BUY_SELL
  )

  const { isBuySellSupported } = useBuySellRegionSupport()

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
        {messages.coins}
      </Text>
      {isWalletUIBuySellEnabled && !isLoading ? (
        <Tooltip
          disabled={isBuySellSupported}
          text={messages.buySellNotSupported}
          color='secondary'
          placement='left'
          shouldWrapContent={false}
        >
          <Box>
            <Button
              variant='secondary'
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
    tokenBalanceFormatted,
    tokenDollarValue,
    isTokenBalanceLoading,
    isTokenPriceLoading,
    formattedHeldValue
  } = useFormattedTokenBalance(coin.mint)

  const { data: coinData, isPending: coinsDataLoading } = useArtistCoin(
    coin.mint
  )

  const isLoading =
    isTokenBalanceLoading || isTokenPriceLoading || coinsDataLoading

  return (
    <CoinCard
      icon={coinData?.logoUri}
      symbol={tokenSymbol ?? ''}
      balance={tokenBalanceFormatted || ''}
      heldValue={formattedHeldValue}
      dollarValue={tokenDollarValue || ''}
      loading={isLoading}
      name={coinData?.name ?? ''}
      onClick={() => handleCoinClick(coin.ticker)}
    />
  )
}

export const YourCoins = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { env } = useQueryContext()
  const { isEnabled: isArtistCoinsEnabled } = useFeatureFlag(
    FeatureFlags.ARTIST_COINS
  )
  const { color } = useTheme()
  const navigate = useNavigate()
  const { isMobile } = useMedia()
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

  const { isLarge } = useMedia()

  const filteredCoins =
    artistCoins?.filter(
      ownedCoinsFilter(!!isArtistCoinsEnabled, env.WAUDIO_MINT_ADDRESS)
    ) ?? []

  // Show audio coin card when no coins are available
  const showAudioCoin = filteredCoins.length === 0
  const baseCoins = showAudioCoin ? ['audio-coin' as const] : filteredCoins

  // Add discover artist coins card at the end if feature is enabled
  const allCoins = isArtistCoinsEnabled
    ? [...baseCoins, 'discover-artist-coins' as const]
    : baseCoins

  const isSingleColumn = isLarge

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
          <YourCoinsSkeleton />
        ) : (
          <Box
            css={{
              display: 'grid',
              gridTemplateColumns: isSingleColumn
                ? 'minmax(0, 1fr)'
                : 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '0'
            }}
          >
            {allCoins.map((item, index) => {
              const key = typeof item === 'string' ? item : item.mint
              const isLastItem = index === allCoins.length - 1
              const isOddCount = !isSingleColumn && allCoins.length % 2 === 1
              const shouldSpanFullWidth = isOddCount && isLastItem
              const isLastInRow = isSingleColumn ? true : index % 2 === 1
              const isLastRow =
                index >= allCoins.length - (isSingleColumn ? 1 : 2)

              // Use helper functions for cleaner logic
              const shouldHaveRightBorder = shouldShowRightBorder(
                index,
                isSingleColumn,
                shouldSpanFullWidth,
                isOddCount,
                allCoins.length
              )

              const itemStyles = getCoinItemStyles(
                shouldSpanFullWidth,
                shouldHaveRightBorder,
                shouldSpanFullWidth, // Add top border when spanning full width (odd count last item)
                color.border.default
              )

              return (
                <Fragment key={key}>
                  <Box css={itemStyles}>
                    {item === 'discover-artist-coins' ? (
                      <DiscoverArtistCoinsCard
                        onClick={handleDiscoverArtistCoins}
                      />
                    ) : item === 'audio-coin' ? (
                      <AudioCoinCard />
                    ) : (
                      <CoinCardWithBalance coin={item as UserCoin} />
                    )}
                  </Box>
                  {/* Horizontal divider after each row except the last */}
                  {!isLastRow && isLastInRow && (
                    <Box
                      css={{
                        gridColumn: '1 / -1',
                        borderBottom: `1px solid ${color.border.default}`
                      }}
                    />
                  )}
                </Fragment>
              )
            })}
          </Box>
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
