import { useCallback } from 'react'

import { useUserbank, useRootWalletAddress } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { useReceiveTokensModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'

import {
  Button,
  Flex,
  IconError,
  Text,
  LoadingSpinner,
  Divider,
  Hint,
  TextLink,
  useTheme
} from '@audius/harmony-native'
import { QRCodeComponent, BalanceSection } from 'app/components/core'
import { AddressTile } from 'app/components/core/AddressTile'
import Drawer from 'app/components/drawer/Drawer'
import { useToast } from 'app/hooks/useToast'
import { env } from 'app/services/env'

import { DrawerHeader } from '../drawer/DrawerHeader'

const QR_CODE_SIZE = 160
const LOADING_HEIGHT = 160

export const ReceiveTokensDrawer = () => {
  const { isOpen, onClose, data } = useReceiveTokensModal()
  const { toast } = useToast()
  const { mint } = data ?? {}
  const { spacing } = useTheme()
  const { userBankAddress, loading: userBankLoading } = useUserbank(mint)
  const { rootWalletAddress, loading: rootWalletLoading } =
    useRootWalletAddress()

  // Use root wallet address for USDC, user bank for others
  const isUsdc = mint === env.USDC_MINT_ADDRESS
  const shouldUseRootWallet = isUsdc
  const displayAddress = shouldUseRootWallet
    ? rootWalletAddress
    : userBankAddress
  const loading = shouldUseRootWallet ? rootWalletLoading : userBankLoading

  const handleCopyAddress = useCallback(() => {
    if (displayAddress) {
      Clipboard.setString(displayAddress)
      toast({ content: 'Copied to clipboard!', type: 'info' })
    }
  }, [displayAddress, toast])

  const renderHeader = () => {
    return (
      <Flex pv='l' ph='xl' gap='m' mb='m'>
        <DrawerHeader
          onClose={onClose}
          title={walletMessages.receiveTokensTitle}
        />
        <Divider />
      </Flex>
    )
  }

  if (loading || !displayAddress) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose}>
        <Flex
          column
          justifyContent='center'
          alignItems='center'
          ph='l'
          pv='xl'
          gap='xl'
          h={LOADING_HEIGHT}
        >
          <LoadingSpinner
            style={{ height: spacing['2xl'], width: spacing['2xl'] }}
          />
          <Flex column gap='xs' alignItems='center'>
            <Text variant='heading' size='l'>
              {walletMessages.receiveTokensLoadingTitle}
            </Text>
            <Text variant='title' size='l' strength='weak'>
              {walletMessages.receiveTokensLoadingSubtitle}
            </Text>
          </Flex>
        </Flex>
      </Drawer>
    )
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} drawerHeader={renderHeader}>
      <Flex direction='column' gap='xl' ph='xl'>
        <BalanceSection mint={mint} isPolling={isOpen} pollingInterval={3000} />

        {/* QR Code and Explainer Section */}
        <Flex row gap='m' alignItems='center'>
          <Flex
            w={QR_CODE_SIZE}
            h={QR_CODE_SIZE}
            alignItems='center'
            justifyContent='center'
          >
            <QRCodeComponent value={displayAddress} size={QR_CODE_SIZE} />
          </Flex>
          <Flex gap='xl' justifyContent='center' flex={1}>
            <Text variant='body' size='l'>
              {walletMessages.receiveTokensExplainer}
            </Text>
          </Flex>
        </Flex>

        {/* Address Tile */}
        <AddressTile address={displayAddress} />

        {/* Hint Section */}
        <Hint
          icon={IconError}
          actions={
            <TextLink url={route.AUDIUS_ARTIST_COINS_HELP_LINK}>
              <Text color='accent'>
                {walletMessages.receiveTokensLearnMore}
              </Text>
            </TextLink>
          }
        >
          {walletMessages.receiveTokensDisclaimer}
        </Hint>

        {/* Copy Button */}
        <Button variant='primary' fullWidth onPress={handleCopyAddress}>
          {walletMessages.receiveTokensCopy}
        </Button>
      </Flex>
    </Drawer>
  )
}
