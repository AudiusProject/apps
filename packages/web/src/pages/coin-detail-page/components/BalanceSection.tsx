import { useCallback, useEffect, useState } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  useCoinBalanceBreakdown,
  useCurrentAccountUser,
  useExternalWalletBalance
} from '@audius/common/api'
import {
  useBuySellInitialTab,
  useFormattedCoinBalance,
  useIsManagedAccount
} from '@audius/common/hooks'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import { COIN_DETAIL_BUY_PAGE } from '@audius/common/src/utils/route'
import {
  useBuySellModal,
  useReceiveTokensModal,
  useSendTokensModal
} from '@audius/common/store'
import { shortenSPLAddress } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'
import {
  Artwork,
  Box,
  Button,
  Divider,
  Flex,
  Paper,
  Text,
  useTheme
} from '@audius/harmony'
import { useLocation } from 'react-router-dom'

import { useModalState } from 'common/hooks/useModalState'
import { useBuySellRegionSupport } from 'components/buy-sell-modal'
import { componentWithErrorBoundary } from 'components/error-wrapper/componentWithErrorBoundary'
import Skeleton from 'components/skeleton/Skeleton'
import Tooltip from 'components/tooltip/Tooltip'
import { useExternalWalletAddress } from 'hooks/useExternalWalletAddress'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { env } from 'services/env'
import { doesMatchRoute } from 'utils/route'

import { OpenAppDrawer } from './OpenAppDrawer'

type BalanceStateProps = {
  ticker: string
  logoURI?: string
  onBuy?: () => void
  onReceive?: () => void
  onSend?: () => void
  coinName?: string
}

const BalanceSectionSkeletonContent = () => {
  return (
    <Flex ph='xl' pv='l' w='100%'>
      <Flex column gap='l' w='100%'>
        <Flex gap='s' alignItems='center'>
          <Skeleton width='64px' height='64px' />
          <Skeleton width='120px' height='24px' />
        </Flex>
        <Flex gap='s'>
          <Skeleton width='100%' height='40px' />
          <Skeleton width='100%' height='40px' />
        </Flex>
        <Skeleton width='100%' height='40px' />
      </Flex>
    </Flex>
  )
}

const BalanceSectionSkeleton = () => {
  return (
    <Paper>
      <BalanceSectionSkeletonContent />
    </Paper>
  )
}

const TokenIcon = ({ logoURI }: { logoURI?: string }) => {
  const { spacing } = useTheme()

  if (!logoURI) return null

  return (
    <Artwork
      src={logoURI}
      hex
      w={spacing.unit16}
      h={spacing.unit16}
      borderWidth={0}
    />
  )
}

const ZeroBalanceState = ({
  ticker,
  logoURI,
  onBuy,
  onReceive,
  coinName,
  isBuySellSupported,
  isCoinCreator,
  isAnonymousUser
}: BalanceStateProps & {
  isBuySellSupported: boolean
  isCoinCreator: boolean
  isAnonymousUser: boolean
}) => {
  const isManagerMode = useIsManagedAccount()
  return (
    <>
      <Flex gap='s' alignItems='center' ph='xl'>
        <TokenIcon logoURI={logoURI} />
        <Flex column gap='xs'>
          {coinName && (
            <Text variant='heading' size='s'>
              {coinName}
            </Text>
          )}
          <Text variant='title' size='l' color='subdued'>
            ${ticker}
          </Text>
        </Flex>
      </Flex>
      {!isCoinCreator ? (
        <Flex ph='xl' w='100%'>
          <Paper
            ph='xl'
            pv='l'
            backgroundColor='surface2'
            border='default'
            direction='column'
            gap='xs'
            shadow='flat'
            w='100%'
          >
            <Text variant='heading' size='s'>
              {walletMessages.becomeMemberTitle}
            </Text>
            <Text variant='body' size='s' color='default' strength='default'>
              {walletMessages.becomeMemberBody(ticker)}
            </Text>
          </Paper>
        </Flex>
      ) : null}
      <Flex gap='s' ph='xl'>
        <Tooltip
          disabled={isBuySellSupported && !isManagerMode}
          text={
            isManagerMode
              ? walletMessages.buySellNotSupportedManagerMode
              : walletMessages.buySellNotSupported
          }
          color='secondary'
          placement='top'
          shouldWrapContent={false}
        >
          <Box w='100%'>
            <Button
              variant='primary'
              fullWidth
              onClick={onBuy}
              disabled={!isBuySellSupported || isManagerMode}
            >
              {walletMessages.buy}
            </Button>
          </Box>
        </Tooltip>
        {!isAnonymousUser ? (
          <Button variant='secondary' fullWidth onClick={onReceive}>
            {walletMessages.receive}
          </Button>
        ) : null}
      </Flex>
    </>
  )
}

const HasBalanceState = ({
  ticker,
  logoURI,
  onBuy,
  onSend,
  onReceive,
  mint,
  isBuySellSupported,
  coinName,
  isMobile,
  isAudio
}: BalanceStateProps & {
  mint: string
  isBuySellSupported: boolean
  coinName: string
  isMobile: boolean
  isAudio: boolean
}) => {
  const isManagerMode = useIsManagedAccount()
  const { motion } = useTheme()
  const {
    coinBalanceFormatted,
    formattedHeldValue,
    isCoinBalanceLoading,
    isCoinPriceLoading
  } = useFormattedCoinBalance(mint)

  const isLoading = isCoinBalanceLoading || isCoinPriceLoading

  const {
    decimals,
    inAppWallet,
    linkedWallets,
    audioBuiltInBalance,
    associatedAudioBalances,
    hasBreakdown
  } = useCoinBalanceBreakdown({ mint, isAudio })

  return (
    <>
      <Flex ph='xl' alignItems='center' justifyContent='space-between' flex={1}>
        <Flex alignItems='center' gap='l'>
          <TokenIcon logoURI={logoURI} />
          <Flex
            direction='column'
            gap='2xs'
            flex={1}
            css={{
              opacity: isLoading ? 0 : 1,
              transition: `opacity ${motion.expressive}`
            }}
          >
            <Text variant='heading' size='s'>
              {coinName}
            </Text>
            <Flex gap='xs' alignItems='center'>
              <Text variant='heading' size='s'>
                {coinBalanceFormatted}
              </Text>
              <Text variant='title' size='l' color='subdued'>
                ${ticker}
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex alignItems='center' gap='m'>
          <Text variant='title' size='l' color='default'>
            {formattedHeldValue}
          </Text>
        </Flex>
      </Flex>
      {hasBreakdown && (
        <>
          <Divider />
          <Flex direction='column' gap='s' w='100%' ph='xl'>
            <Text variant='title' size='l'>
              {coinDetailsMessages.externalWallets.hasBalanceTitle}
            </Text>
            <Flex direction='column' gap='s' w='100%'>
              {(inAppWallet || (isAudio && audioBuiltInBalance)) && (
                <Flex
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  w='100%'
                  pv='2xs'
                >
                  <Text variant='body' size='l'>
                    {coinDetailsMessages.externalWallets.builtIn}
                  </Text>
                  <Text variant='body' size='l'>
                    {isAudio
                      ? audioBuiltInBalance
                      : Math.trunc(
                          inAppWallet!.balance / Math.pow(10, decimals ?? 0)
                        ).toLocaleString()}
                  </Text>
                </Flex>
              )}
              {isAudio
                ? // For AUDIO, show associated wallets (both ETH and SOL)
                  associatedAudioBalances.data.map((walletBalance, index) => {
                    if (
                      !walletBalance.balance ||
                      walletBalance.balance === AUDIO(0).value
                    )
                      return null
                    // Use AUDIO constructor to format bigint balance properly
                    const balanceFormatted = AUDIO(
                      walletBalance.balance
                    ).toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                      roundingMode: 'trunc'
                    })
                    return (
                      <Flex
                        key={`${walletBalance.chain}-${walletBalance.address}`}
                        direction='row'
                        alignItems='center'
                        justifyContent='space-between'
                        w='100%'
                        pv='2xs'
                      >
                        <Flex gap='xs' alignItems='center'>
                          <Text variant='body' size='l'>
                            {isMobile
                              ? walletMessages.linkedWallets.wallet(index)
                              : walletMessages.linkedWallets.linkedWallet(
                                  index
                                )}
                          </Text>
                          <Text variant='body' size='l' color='subdued'>
                            ({shortenSPLAddress(walletBalance.address)})
                          </Text>
                        </Flex>
                        <Text variant='body' size='l'>
                          {balanceFormatted}
                        </Text>
                      </Flex>
                    )
                  })
                : // For other coins, show SPL linked wallets
                  linkedWallets.map((wallet, index) => (
                    <Flex
                      key={wallet.owner}
                      direction='row'
                      alignItems='center'
                      justifyContent='space-between'
                      w='100%'
                      pv='2xs'
                    >
                      <Flex gap='xs' alignItems='center'>
                        <Text variant='body' size='l'>
                          {isMobile
                            ? walletMessages.linkedWallets.wallet(index)
                            : walletMessages.linkedWallets.linkedWallet(index)}
                        </Text>
                        <Text variant='body' size='l' color='subdued'>
                          ({shortenSPLAddress(wallet.owner)})
                        </Text>
                      </Flex>
                      <Text variant='body' size='l'>
                        {Math.trunc(
                          wallet.balance / Math.pow(10, decimals ?? 0)
                        ).toLocaleString()}
                      </Text>
                    </Flex>
                  ))}
            </Flex>
          </Flex>
          <Divider />
        </>
      )}
      <Flex direction='column' gap='s' ph='xl'>
        <Tooltip
          disabled={isBuySellSupported && !isManagerMode}
          text={
            isManagerMode
              ? walletMessages.buySellNotSupportedManagerMode
              : walletMessages.buySellNotSupported
          }
          color='secondary'
          placement='top'
          shouldWrapContent={false}
        >
          <Box w='100%'>
            <Button
              variant='secondary'
              fullWidth
              onClick={onBuy}
              disabled={!isBuySellSupported || isManagerMode}
            >
              {walletMessages.buySell}
            </Button>
          </Box>
        </Tooltip>
        <Flex gap='s'>
          <Button
            disabled={isManagerMode}
            variant='secondary'
            fullWidth
            onClick={onSend}
          >
            {walletMessages.send}
          </Button>
          <Button variant='secondary' fullWidth onClick={onReceive}>
            {walletMessages.receive}
          </Button>
        </Flex>
      </Flex>
    </>
  )
}

type CoinDetailProps = {
  mint: string
}

const BalanceSectionContent = ({ mint }: CoinDetailProps) => {
  const { data: coin, isPending: coinsLoading } = useArtistCoin(mint)
  const { data: tokenBalance, isLoading: tokenBalanceLoading } = useCoinBalance(
    { mint }
  )
  const { data: currentUser } = useCurrentAccountUser()
  const { isBuySellSupported } = useBuySellRegionSupport()
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
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

  // Modal hooks
  const { onOpen: openBuySellModal } = useBuySellModal()
  const [, openTransferDrawer] = useModalState('TransferAudioMobileWarning')
  const { onOpen: openReceiveTokensModal } = useReceiveTokensModal()
  const { onOpen: openSendTokensModal } = useSendTokensModal()
  const isMobile = useIsMobile()
  const isCoinCreator = coin?.ownerId === currentUser?.user_id
  const [isOpenAppDrawerOpen, setIsOpenAppDrawerOpen] = useState(false)

  const onOpenOpenAppDrawer = useCallback(() => {
    setIsOpenAppDrawerOpen(true)
  }, [setIsOpenAppDrawerOpen])

  const onCloseOpenAppDrawer = useCallback(() => {
    setIsOpenAppDrawerOpen(false)
  }, [setIsOpenAppDrawerOpen])

  // Handler functions with account requirements - defined before early return
  const handleBuySell = useCallback(() => {
    // Has balance - show buy/sell modal
    openBuySellModal({ initialTab, isOpen: true })
  }, [initialTab, openBuySellModal])

  const location = useLocation()
  useEffect(() => {
    const match = doesMatchRoute(location, COIN_DETAIL_BUY_PAGE)
    if (match) {
      openBuySellModal({
        initialTab: 'buy',
        isOpen: true,
        ticker: coin?.ticker
      })
    }
  }, [location, openBuySellModal, coin?.ticker])

  const handleReceive = useRequiresAccountCallback(() => {
    openReceiveTokensModal({
      mint,
      isOpen: true
    })
  }, [mint, openReceiveTokensModal])

  const handleSend = useRequiresAccountCallback(() => {
    if (isMobile) {
      openTransferDrawer(true)
    } else {
      openSendTokensModal({
        mint,
        isOpen: true
      })
    }
  }, [isMobile, openTransferDrawer, openSendTokensModal, mint])

  if (coinsLoading || !coin) {
    return <BalanceSectionSkeleton />
  }

  const ticker = coin.ticker ?? ''
  const logoURI = coin.logoUri
  const coinName = coin.name ?? ''

  return (
    <Paper pv='l' border='default'>
      <Flex column gap='l' w='100%'>
        {tokenBalanceLoading ? (
          <BalanceSectionSkeletonContent />
        ) : !tokenBalance?.balance ||
          Number(tokenBalance.balance.toString()) === 0 ? (
          <ZeroBalanceState
            ticker={ticker}
            logoURI={logoURI}
            onBuy={isMobile ? onOpenOpenAppDrawer : handleBuySell}
            onReceive={handleReceive}
            coinName={coinName}
            isBuySellSupported={isBuySellSupported}
            isAnonymousUser={!currentUser}
            isCoinCreator={isCoinCreator}
          />
        ) : (
          <HasBalanceState
            ticker={ticker}
            logoURI={logoURI}
            onBuy={isMobile ? onOpenOpenAppDrawer : handleBuySell}
            onSend={handleSend}
            onReceive={handleReceive}
            mint={mint}
            isBuySellSupported={isBuySellSupported}
            coinName={coinName}
            isMobile={isMobile}
            isAudio={isAudio}
          />
        )}
        {isMobile && (
          <OpenAppDrawer
            isOpen={isOpenAppDrawerOpen}
            onClose={onCloseOpenAppDrawer}
          />
        )}
      </Flex>
    </Paper>
  )
}

export const BalanceSection = componentWithErrorBoundary(
  BalanceSectionContent,
  {
    name: 'BalanceSection',
    fallback: (
      <Paper ph='xl' pv='l' border='default'>
        <Flex column gap='l' w='100%'>
          <Text variant='body' size='m' color='subdued'>
            {walletMessages.errors.unableToLoadBalance}
          </Text>
        </Flex>
      </Paper>
    )
  }
)
