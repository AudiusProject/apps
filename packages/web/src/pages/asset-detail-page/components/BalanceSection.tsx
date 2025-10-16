import { useCallback, useState } from 'react'

import {
  useArtistCoin,
  useCurrentAccountUser,
  useCoinBalance
} from '@audius/common/api'
import {
  useBuySellInitialTab,
  useFormattedCoinBalance,
  useIsManagedAccount
} from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import {
  useBuySellModal,
  useReceiveTokensModal,
  useSendTokensModal
} from '@audius/common/store'
import {
  Artwork,
  Box,
  Button,
  Flex,
  Paper,
  Text,
  useTheme
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import { useBuySellRegionSupport } from 'components/buy-sell-modal'
import { componentWithErrorBoundary } from 'components/error-wrapper/componentWithErrorBoundary'
import Skeleton from 'components/skeleton/Skeleton'
import Tooltip from 'components/tooltip/Tooltip'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

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
  )
}

const BalanceSectionSkeleton = () => {
  return (
    <Paper ph='xl' pv='l'>
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
  isCoinCreator
}: BalanceStateProps & {
  isBuySellSupported: boolean
  isCoinCreator: boolean
}) => {
  const isManagerMode = useIsManagedAccount()
  return (
    <>
      <Flex gap='s' alignItems='center'>
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
        <Paper
          ph='xl'
          pv='l'
          backgroundColor='surface2'
          border='default'
          direction='column'
          gap='xs'
          shadow='flat'
        >
          <Text variant='heading' size='s'>
            {walletMessages.becomeMemberTitle}
          </Text>
          <Text variant='body' size='s' color='default' strength='default'>
            {walletMessages.becomeMemberBody(ticker)}
          </Text>
        </Paper>
      ) : null}
      <Flex gap='s'>
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
        <Button variant='secondary' fullWidth onClick={onReceive}>
          {walletMessages.receive}
        </Button>
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
  coinName
}: BalanceStateProps & {
  mint: string
  isBuySellSupported: boolean
  coinName: string
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

  return (
    <>
      <Flex alignItems='center' justifyContent='space-between' flex={1}>
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
      <Flex direction='column' gap='s'>
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

type AssetDetailProps = {
  mint: string
}

const BalanceSectionContent = ({ mint }: AssetDetailProps) => {
  const { data: coin, isPending: coinsLoading } = useArtistCoin(mint)
  const { data: tokenBalance, isPending: tokenBalanceLoading } = useCoinBalance(
    { mint }
  )
  const { data: currentUser } = useCurrentAccountUser()
  const { isBuySellSupported } = useBuySellRegionSupport()
  const initialTab = useBuySellInitialTab()

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
  const handleBuySell = useRequiresAccountCallback(() => {
    // Has balance - show buy/sell modal
    openBuySellModal({ initialTab, isOpen: true })
  }, [openBuySellModal, initialTab])

  const handleAddCash = useRequiresAccountCallback(() => {
    openBuySellModal({ initialTab, isOpen: true })
  }, [openBuySellModal, initialTab])

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
    <Paper ph='xl' pv='l' border='default'>
      <Flex column gap='l' w='100%'>
        {tokenBalanceLoading ? (
          <BalanceSectionSkeletonContent />
        ) : !tokenBalance?.balance ||
          Number(tokenBalance.balance.toString()) === 0 ? (
          <ZeroBalanceState
            ticker={ticker}
            logoURI={logoURI}
            onBuy={isMobile ? onOpenOpenAppDrawer : handleAddCash}
            onReceive={handleReceive}
            coinName={coinName}
            isBuySellSupported={isBuySellSupported}
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
