import { useCallback, useMemo } from 'react'

import { useQueryContext } from '@audius/common/api'
import { useRootWalletAddress, useMintRecovery } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import Clipboard from '@react-native-clipboard/clipboard'

import {
  IconError,
  Button,
  Flex,
  Text,
  TextLink,
  LoadingSpinner
} from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'
import { make, track as trackEvent } from 'app/services/analytics'
import type { AllEvents } from 'app/types/analytics'

import { CashBalanceSection } from '../add-funds-drawer/CashBalanceSection'
import { AddressTile } from '../core/AddressTile'
import { QRCodeComponent } from '../core/QRCode'

const USDCLearnMore = 'https://support.audius.co/product/usdc'

const messages = {
  explainer:
    'Add cash to your Audius account by depositing USDC via the Solana network!',
  hint: 'Use caution to avoid errors and lost funds. ',
  copy: 'Copy Wallet Address',
  goBack: 'Go Back',
  learnMore: 'Learn More',
  copied: 'Copied to Clipboard!',
  usdcBalance: 'USDC Balance'
}

type USDCManualTransferProps = {
  amountInCents?: number
}

export const USDCManualTransfer = ({
  amountInCents
}: USDCManualTransferProps) => {
  const { toast } = useToast()
  const { env } = useQueryContext()

  const { rootWalletAddress: usdcUserBank, loading: userBankLoading } =
    useRootWalletAddress()
  // Poll for USDC recovery if there's balance in root wallet
  useMintRecovery(env.USDC_MINT_ADDRESS)

  const analytics: AllEvents | null = useMemo(
    () =>
      usdcUserBank
        ? {
            eventName: Name.PURCHASE_CONTENT_USDC_USER_BANK_COPIED,
            address: usdcUserBank
          }
        : null,
    [usdcUserBank]
  )

  const handleConfirmPress = useCallback(() => {
    if (!usdcUserBank || !analytics) return
    Clipboard.setString(usdcUserBank ?? '')
    toast({ content: messages.copied, type: 'info' })
    trackEvent(make(analytics))
  }, [usdcUserBank, analytics, toast])

  if (userBankLoading) {
    return (
      <Flex ph='l' gap='xl' justifyContent='center' alignItems='center'>
        <LoadingSpinner style={{ height: 32 }} />
      </Flex>
    )
  }

  return (
    <Flex ph='l' gap='xl'>
      <CashBalanceSection />
      <Flex row gap='l' alignItems='center'>
        {usdcUserBank ? (
          <QRCodeComponent size={160} value={usdcUserBank} />
        ) : null}
        <Flex flex={1}>
          <Text size='l'>{messages.explainer}</Text>
        </Flex>
      </Flex>
      {usdcUserBank && analytics ? (
        <AddressTile address={usdcUserBank} analytics={analytics} />
      ) : null}
      <Flex
        row
        gap='l'
        alignItems='center'
        ph='l'
        pv='m'
        backgroundColor='surface2'
        border='strong'
        borderRadius='m'
      >
        <IconError size='m' color='default' />
        <Flex gap='m' flex={1}>
          <Text>
            {messages.hint}
            <TextLink variant='visible' url={USDCLearnMore}>
              {messages.learnMore}
            </TextLink>
          </Text>
        </Flex>
      </Flex>
      {amountInCents === undefined ? (
        <Button onPress={handleConfirmPress} variant='primary' fullWidth>
          {messages.copy}
        </Button>
      ) : null}
    </Flex>
  )
}
