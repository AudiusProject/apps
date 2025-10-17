import { useCallback, useContext } from 'react'

import {
  useWalletAddresses,
  useUSDCBalance,
  useQueryContext
} from '@audius/common/api'
import { useRootWalletAddress, useMintRecovery } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import {
  purchaseContentSelectors,
  isContentPurchaseInProgress
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import {
  Button,
  Flex,
  IconError,
  Text,
  LoadingSpinner,
  Divider,
  Hint
} from '@audius/harmony'
import QRCode from 'react-qr-code'
import { useSelector } from 'react-redux'

import { CashBalanceSection } from 'components/add-cash/CashBalanceSection'
import { AddressTile } from 'components/address-tile'
import { ExternalTextLink } from 'components/link/ExternalTextLink'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { track as trackAnalytics, make } from 'services/analytics'
import { copyToClipboard } from 'utils/clipboardUtil'

const { getPurchaseContentFlowStage, getPurchaseContentError } =
  purchaseContentSelectors

const USDCLearnMore = 'https://support.audius.co/product/usdc'
const DIMENSIONS = 160

const messages = {
  explainer:
    'Add cash to your Audius account by depositing USDC via the Solana network!',
  disclaimer: 'Use caution to avoid errors and lost funds.',
  learnMore: 'Learn More',
  copy: 'Copy Wallet Address',
  close: 'Close',
  copied: 'Copied to Clipboard!',
  buy: (amount: string) => `Buy ${amount}`
}

export const USDCManualTransfer = ({
  onClose,
  amountInCents,
  onPurchase
}: {
  onClose: () => void
  amountInCents?: number
  onPurchase?: () => void
}) => {
  const stage = useSelector(getPurchaseContentFlowStage)
  const error = useSelector(getPurchaseContentError)
  const { data: walletAddresses } = useWalletAddresses()
  const { currentUser: wallet } = walletAddresses ?? {}
  const isUnlocking = !error && isContentPurchaseInProgress(stage)
  const { data: balanceWei } = useUSDCBalance({
    isPolling: true
  })
  const balance = USDC(balanceWei ?? 0).value
  const amount = USDC((amountInCents ?? 0) / 100).value
  const isBuyButtonDisabled = isUnlocking || balance < amount

  const { env } = useQueryContext()
  const { rootWalletAddress: usdcUserBank, loading: userBankLoading } =
    useRootWalletAddress()
  // Poll for USDC recovery if there's balance in root wallet
  useMintRecovery(env.USDC_MINT_ADDRESS)
  const { toast } = useContext(ToastContext)
  const isMobile = useIsMobile()

  const handleCopy = useCallback(() => {
    if (!usdcUserBank) return
    copyToClipboard(usdcUserBank)
    toast(messages.copied)
    trackAnalytics(
      make({
        eventName: Name.PURCHASE_CONTENT_USDC_USER_BANK_COPIED,
        address: usdcUserBank
      })
    )
  }, [usdcUserBank, toast])

  return wallet === null || userBankLoading ? (
    <Flex justifyContent='center' alignItems='center' p='xl' w='100%'>
      <LoadingSpinner css={{ height: 32 }} />
    </Flex>
  ) : (
    <Flex direction='column' gap='xl' p='xl' h='100%'>
      <CashBalanceSection />
      <Divider orientation='horizontal' color='default' />
      <Flex
        gap='xl'
        alignItems='center'
        direction={isMobile ? 'column' : 'row'}
      >
        {isMobile ? <Text>{messages.explainer}</Text> : null}
        <Flex
          w={DIMENSIONS}
          h={DIMENSIONS}
          alignItems='center'
          justifyContent='center'
        >
          {usdcUserBank ? <QRCode value={usdcUserBank} /> : null}
        </Flex>
        <Flex column gap='xl' h={DIMENSIONS} justifyContent='space-between'>
          {!isMobile ? (
            <Text variant='body' size='l'>
              {messages.explainer}
            </Text>
          ) : null}
          <Hint
            icon={IconError}
            actions={
              <ExternalTextLink
                to={USDCLearnMore}
                variant='visible'
                showUnderline
              >
                {messages.learnMore}
              </ExternalTextLink>
            }
          >
            {messages.disclaimer}
          </Hint>
        </Flex>
      </Flex>
      {usdcUserBank ? <AddressTile address={usdcUserBank} /> : null}
      <Flex gap='s' alignItems='center' direction={isMobile ? 'column' : 'row'}>
        {amountInCents === undefined ? (
          <>
            <Button variant='primary' fullWidth onClick={handleCopy}>
              {messages.copy}
            </Button>
            {isMobile ? null : (
              <Button variant='secondary' fullWidth onClick={onClose}>
                {messages.close}
              </Button>
            )}
          </>
        ) : (
          <>
            {isMobile ? null : (
              <Button variant='secondary' fullWidth onClick={onClose}>
                {messages.close}
              </Button>
            )}
            <Button
              variant='primary'
              fullWidth
              color='lightGreen'
              disabled={isBuyButtonDisabled}
              type='submit'
              onClick={onPurchase}
            >
              {messages.buy(
                USDC(amount).toLocaleString('en-us', {
                  roundingMode: 'ceil'
                })
              )}
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  )
}
