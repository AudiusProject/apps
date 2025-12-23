import { useCallback } from 'react'

import {
  useIsManagedAccount,
  useFormattedUSDCBalance
} from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import {
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  useAddCashModal
} from '@audius/common/store'
import {
  Button,
  Flex,
  IconInfo,
  IconLogoCircleUSDCPng,
  Paper,
  Text,
  IconButton,
  useMedia,
  Skeleton,
  Tooltip
} from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'
import { TextLink } from 'components/link'
import { PayoutWalletDisplay } from 'components/payout-wallet-display'
import { make, track } from 'services/analytics'
import { zIndex } from 'utils/zIndex'

import { useCashWalletStyles } from './CashWallet.styles'

export const CashWallet = () => {
  const isManagedAccount = useIsManagedAccount()
  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { onOpen: openAddCashModal } = useAddCashModal()
  const { balanceFormatted, usdcValue, isLoading } = useFormattedUSDCBalance()
  const [, setPayoutWalletModalOpen] = useModalState('PayoutWallet')

  const styles = useCashWalletStyles()

  // We still need useMedia for responsive conditionals
  const { isSmall: isMobile, isExtraSmall: isSmallMobile } = useMedia()

  const handleWithdraw = () => {
    openWithdrawUSDCModal({
      page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
    })
    track(
      make({
        eventName: Name.WITHDRAW_USDC_MODAL_OPENED,
        currentBalance: Number(usdcValue.toString())
      })
    )
  }

  const handleAddCash = () => {
    openAddCashModal()
    track(
      make({
        eventName: Name.BUY_USDC_ADD_FUNDS_MANUALLY
      })
    )
  }

  const handlePayoutWalletClick = useCallback(() => {
    setPayoutWalletModalOpen(true)
  }, [setPayoutWalletModalOpen])

  return (
    <Paper
      direction='column'
      shadow='far'
      ph={isMobile ? 'l' : 'xl'}
      pv={isMobile ? 'm' : 'l'}
      borderRadius='l'
    >
      <Flex
        justifyContent='space-between'
        alignItems='flex-start'
        w='100%'
        css={styles.mainFlex}
      >
        {/* Left Column - Balance Info */}
        <Flex direction='column' gap='s' alignItems='flex-start'>
          <Flex alignItems='center' gap='s'>
            <IconLogoCircleUSDCPng size='l' hex />
            <Flex alignItems='center' gap='xs'>
              <Text variant='heading' size='s' color='subdued'>
                {walletMessages.cashBalance}
              </Text>
              <Tooltip
                text={walletMessages.cashBalanceTooltip}
                placement='top'
                getPopupContainer={() =>
                  document.getElementById('page') ?? document.body
                }
                shouldWrapContent={false}
                shouldDismissOnClick={false}
                zIndex={zIndex.CASH_WALLET_TOOLTIP}
              >
                <IconButton
                  icon={IconInfo}
                  size='s'
                  color='subdued'
                  activeColor='default'
                  aria-label='Cash balance information'
                />
              </Tooltip>
            </Flex>
          </Flex>

          {/* Balance Value */}
          {isLoading ? (
            <Skeleton w='unit24' h='unit10' />
          ) : (
            <Text variant='display' size='m' color='default'>
              {balanceFormatted}
            </Text>
          )}

          {/* Payout Wallet Info */}
          <Flex
            alignItems='center'
            gap='s'
            css={styles.payoutWalletFlex}
            onClick={handlePayoutWalletClick}
          >
            <TextLink
              variant='visible'
              size='m'
              onClick={handlePayoutWalletClick}
            >
              {walletMessages.payoutWallet}
            </TextLink>
            {/* Wallet Display */}
            <PayoutWalletDisplay />
          </Flex>
        </Flex>
      </Flex>

      {/* Bottom Button Area */}
      <Flex
        gap={isSmallMobile ? 'm' : 'l'}
        pt='m'
        w='100%'
        css={styles.buttonArea}
      >
        {!isManagedAccount ? (
          <>
            <Button
              variant='primary'
              onClick={handleWithdraw}
              disabled={isLoading}
              fullWidth
            >
              {walletMessages.withdraw}
            </Button>
            <Button
              variant='secondary'
              onClick={handleAddCash}
              disabled={isLoading}
              fullWidth
            >
              {walletMessages.addCash}
            </Button>
          </>
        ) : null}
      </Flex>
    </Paper>
  )
}
