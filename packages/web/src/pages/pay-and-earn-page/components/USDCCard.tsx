import { useCallback } from 'react'

import { useUSDCBalance } from '@audius/common/hooks'
import { Name, Status, BNUSDC } from '@audius/common/models'
import {
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  useAddFundsModal
} from '@audius/common/store'
import {
  formatCurrencyBalance,
  formatUSDCWeiToFloorCentsNumber
} from '@audius/common/utils'
import {
  Button,
  PlainButton,
  IconQuestionCircle,
  Flex,
  IconLogoCircleUSDC as LogoUSDC,
  Text,
  Paper
} from '@audius/harmony'
import BN from 'bn.js'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { make, track } from 'services/analytics'

import styles from './USDCCard.module.css'

const LEARN_MORE_LINK =
  'https://support.audius.co/help/Understanding-USDC-on-Audius'

const messages = {
  usdc: 'USDC',
  earn: 'Earn USDC by selling your music',
  buyAndSell: 'Buy and sell music with USDC',
  learnMore: 'Learn More',
  withdraw: 'Withdraw',
  addFunds: 'Add Funds',
  salesSummary: 'Sales Summary',
  withdrawalHistory: 'Withdrawal History'
}

export const USDCCard = () => {
  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { onOpen: openAddFundsModal } = useAddFundsModal()
  const { data: balance, status: balanceStatus } = useUSDCBalance()

  const balanceCents = formatUSDCWeiToFloorCentsNumber(
    (balance ?? new BN(0)) as BNUSDC
  )
  const balanceFormatted = formatCurrencyBalance(balanceCents / 100)

  const handleLearnMore = useCallback(() => {
    window.open(LEARN_MORE_LINK, '_blank')
  }, [])

  const handleWithdraw = () => {
    openWithdrawUSDCModal({
      page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
    })
    track(
      make({
        eventName: Name.WITHDRAW_USDC_MODAL_OPENED,
        currentBalance: balanceCents / 100
      })
    )
  }

  const handleAddFunds = () => {
    openAddFundsModal()
    track(
      make({
        eventName: Name.BUY_USDC_ADD_FUNDS_MANUALLY
      })
    )
  }

  return (
    <Paper direction='column' shadow='far' borderRadius='l'>
      <div className={styles.backgroundBlueGradient}>
        <div className={styles.usdcTitleContainer}>
          <div className={styles.usdcTitle}>
            <LogoUSDC
              size='3xl'
              css={(theme) => ({ path: { fill: theme.color.static.white } })}
            />
            <div className={styles.usdc}>
              <Text
                variant='heading'
                size='xl'
                color='staticWhite'
                strength='strong'
              >
                {messages.usdc}
              </Text>
            </div>
          </div>

          <Flex gap='m'>
            {balanceStatus === Status.LOADING ? (
              <LoadingSpinner className={styles.spinner} />
            ) : (
              <Text
                variant='heading'
                color='staticWhite'
                strength='strong'
                size='xl'
              >
                ${balanceFormatted}
              </Text>
            )}
          </Flex>
        </div>
        <div className={styles.usdcInfo}>
          <Text color='staticWhite'>{messages.buyAndSell}</Text>
          <PlainButton
            onClick={handleLearnMore}
            iconLeft={IconQuestionCircle}
            variant='inverted'
          >
            {messages.learnMore}
          </PlainButton>
        </div>
      </div>
      <div className={styles.withdrawContainer}>
        <div className={styles.addFundsButton}>
          <Button
            variant='secondary'
            fullWidth
            onClick={handleAddFunds}
            disabled={balanceStatus === Status.LOADING}
          >
            {messages.addFunds}
          </Button>
        </div>
        <div className={styles.withdrawButton}>
          <Button
            variant='secondary'
            fullWidth
            onClick={handleWithdraw}
            disabled={balanceStatus === Status.LOADING}
          >
            {messages.withdraw}
          </Button>
        </div>
      </div>
    </Paper>
  )
}
