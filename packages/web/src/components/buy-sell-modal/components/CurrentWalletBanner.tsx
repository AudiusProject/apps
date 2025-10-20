import { useCoinBalance, useExternalWalletBalance } from '@audius/common/api'
import { formatCurrency, shortenSPLAddress } from '@audius/common/utils'
import {
  Flex,
  IconAudiusLogoColor,
  IconPhantom,
  IconMetamask,
  IconSolana,
  LoadingSpinner,
  Skeleton,
  Text,
  TextLink
} from '@audius/harmony'

import { appkitModal } from 'app/ReownAppKitModal'
import { useConnectExternalWallets } from 'hooks/useConnectExternalWallets'

const messages = {
  tradeWith: 'Trade with',
  builtInWallet: 'Built-In Wallet',
  connect: 'Connect',
  disconnect: 'Disconnect',
  available: 'Available'
}

type WalletIconComponent =
  | typeof IconPhantom
  | typeof IconMetamask
  | typeof IconSolana

const getWalletIcon = (): WalletIconComponent => {
  // Check if Phantom is available
  if (typeof window !== 'undefined' && window.phantom) {
    return IconPhantom
  }
  if (typeof window !== 'undefined' && window.ethereum) {
    return IconMetamask
  }
  return IconSolana // Fallback
}

export const CurrentWalletBanner = ({
  inputToken
}: {
  inputToken: { mint: string; symbol: string }
}) => {
  const externalWalletAccount = appkitModal.getAccount()
  const isUsingExternalWallet = !!externalWalletAccount?.address
  const {
    openAppKitModal,
    disconnect,
    isPending: isConnectingExternalWallet
  } = useConnectExternalWallets()

  const WalletIcon = isUsingExternalWallet
    ? getWalletIcon()
    : IconAudiusLogoColor

  const {
    data: externalWalletTokenBalance,
    isPending: isExternalWalletTokenBalanceLoading
  } = useExternalWalletBalance({
    walletAddress: externalWalletAccount?.address,
    mint: inputToken.mint
  })

  const {
    data: internalWalletTokenBalanceData,
    isPending: isInternalWalletTokenBalanceLoading
  } = useCoinBalance({
    mint: inputToken.mint,
    includeExternalWallets: false
  })

  const handleDisconnect = async () => {
    await disconnect()
  }
  const handleConnect = () => {
    openAppKitModal('solana')
  }
  const addressText = isUsingExternalWallet
    ? shortenSPLAddress(externalWalletAccount?.address ?? '')
    : messages.builtInWallet

  const handleConnectOrDisconnect = () => {
    if (externalWalletAccount?.address) {
      handleDisconnect()
    } else {
      handleConnect()
    }
  }

  const tokenBalanceString = isUsingExternalWallet
    ? externalWalletTokenBalance
      ? formatCurrency(Number(externalWalletTokenBalance), 'en-US', '')
      : '0'
    : internalWalletTokenBalanceData
      ? formatCurrency(
          Number(internalWalletTokenBalanceData.balance),
          'en-US',
          ''
        )
      : '0.00'

  const isTokenBalanceLoading = isUsingExternalWallet
    ? isExternalWalletTokenBalanceLoading
    : isInternalWalletTokenBalanceLoading

  return (
    <Flex
      backgroundColor='surface1'
      border='default'
      borderRadius='m'
      p='m'
      gap='xs'
      direction='column'
    >
      {/* Top row: "Trade with [Wallet]" and balance */}
      <Flex alignItems='center' justifyContent='space-between' w='100%'>
        <Flex gap='xs' alignItems='center'>
          <Text variant='body' size='l'>
            {messages.tradeWith}
          </Text>
          {/* Wallet pill */}
          <Flex
            backgroundColor='surface2'
            border='default'
            borderRadius='3xl'
            pl='xs'
            pr='s'
            pv='xs'
            gap='xs'
            alignItems='center'
          >
            {/* Icon circle */}
            <Flex
              w={24}
              h={24}
              borderRadius='3xl'
              border='default'
              alignItems='center'
              justifyContent='center'
              css={({ color }) => ({ backgroundColor: color.static.white })}
            >
              <WalletIcon size='s' />
            </Flex>
            <Text variant='body' size='m' strength='strong' color='subdued'>
              {addressText}
            </Text>
          </Flex>
        </Flex>
        <Text variant='body' size='l' strength='strong'>
          {isTokenBalanceLoading ? (
            <Skeleton h='24px' w='60px' />
          ) : (
            `${tokenBalanceString} ${inputToken.symbol}`
          )}
        </Text>
      </Flex>

      {/* Bottom row: "Connect" link and "Available" text */}
      <Flex alignItems='center' justifyContent='space-between' w='100%'>
        <TextLink
          variant='visible'
          href='#'
          onClick={(e) => e.preventDefault()}
        >
          <Text variant='body' size='l' onClick={handleConnectOrDisconnect}>
            {isConnectingExternalWallet ? (
              <LoadingSpinner />
            ) : isUsingExternalWallet ? (
              messages.disconnect
            ) : (
              messages.connect
            )}
          </Text>
        </TextLink>
        <Text variant='body' size='l' color='subdued'>
          {messages.available}
        </Text>
      </Flex>
    </Flex>
  )
}
