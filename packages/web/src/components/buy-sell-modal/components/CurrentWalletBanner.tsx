import {
  useCoinBalance,
  useCurrentAccountUser,
  useExternalWalletBalance,
  useWalletAudioBalance
} from '@audius/common/api'
import { Chain } from '@audius/common/models'
import { formatCurrency, shortenSPLAddress } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'
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
import { env } from 'services/env'

const messages = {
  tradeWith: 'Trade with',
  builtInWallet: 'Built-in Wallet',
  builtInWalletNotAvailable: 'Built-in wallet not available',
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
  const { data: currentUser } = useCurrentAccountUser()
  const externalWalletAccount = appkitModal.getAccount('solana')

  const isUsingExternalWallet = !!externalWalletAccount?.address
  const userHasWallet = currentUser || isUsingExternalWallet

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
  } = useExternalWalletBalance(
    {
      walletAddress: externalWalletAccount?.address,
      mint: inputToken.mint
    },
    { enabled: isUsingExternalWallet }
  )

  // For AUDIO, we need to fetch only SPL balance (not combined ERC + SPL)
  const isAudio = inputToken.mint === env.WAUDIO_MINT_ADDRESS

  // Fetch SPL AUDIO balance directly for internal wallet
  const {
    data: internalWalletAudioBalance,
    isPending: isInternalWalletAudioBalanceLoading
  } = useWalletAudioBalance(
    {
      address: currentUser?.spl_wallet ?? '',
      chain: Chain.Sol,
      includeStaked: false
    },
    {
      enabled: isAudio && !isUsingExternalWallet && !!currentUser?.spl_wallet
    }
  )

  // Fetch other coin balances
  const {
    data: internalWalletTokenBalanceData,
    isPending: isInternalWalletTokenBalanceLoading
  } = useCoinBalance({
    mint: inputToken.mint,
    includeExternalWallets: false,
    enabled: !isAudio && !isUsingExternalWallet && !!currentUser
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
  const isUSDC = inputToken.mint === env.USDC_MINT_ADDRESS

  // Format token balance with proper handling of loading and error states
  let tokenBalanceString = '0.00'
  const isTokenBalanceLoading = isUsingExternalWallet
    ? isExternalWalletTokenBalanceLoading
    : isAudio
      ? isInternalWalletAudioBalanceLoading
      : isInternalWalletTokenBalanceLoading

  if (!isTokenBalanceLoading) {
    let balance = isUsingExternalWallet
      ? externalWalletTokenBalance
      : isAudio
        ? internalWalletAudioBalance
        : internalWalletTokenBalanceData?.balance

    // Convert AudioWei to FixedDecimal for AUDIO
    if (
      isAudio &&
      !isUsingExternalWallet &&
      balance !== undefined &&
      balance !== null
    ) {
      balance = AUDIO(balance)
    }

    if (balance !== undefined && balance !== null) {
      tokenBalanceString = formatCurrency(
        Number(balance),
        'en-US',
        isUSDC ? '$' : ''
      )
    }
  }

  return (
    <Flex
      backgroundColor='surface1'
      border='default'
      borderRadius='m'
      p='m'
      gap='m'
      alignItems='flex-start'
      justifyContent='space-between'
    >
      {/* Left side: "Trade with [Wallet]" and "Connect" link */}
      <Flex direction='column' gap='xs'>
        <Flex gap='xs' alignItems='center'>
          <Text variant='body' size='l'>
            {userHasWallet
              ? messages.tradeWith
              : messages.builtInWalletNotAvailable}
          </Text>
          {/* Wallet pill */}
          {userHasWallet ? (
            <Flex
              backgroundColor='surface1'
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
                css={(theme) => ({
                  backgroundColor: theme.color.static.staticWhite
                })}
              >
                <WalletIcon size='s' />
              </Flex>
              <Text variant='body' size='m' strength='strong'>
                {addressText}
              </Text>
            </Flex>
          ) : null}
        </Flex>
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
      </Flex>

      {/* Right side: balance and "Available" text */}
      {userHasWallet ? (
        <Flex direction='column' gap='xs' alignItems='flex-end'>
          <Text variant='body' size='l' strength='strong'>
            {isTokenBalanceLoading ? (
              <Skeleton h='24px' w='60px' />
            ) : (
              `${tokenBalanceString} ${inputToken.symbol}`
            )}
          </Text>
          <Text variant='body' size='l' color='subdued'>
            {messages.available}
          </Text>
        </Flex>
      ) : null}
    </Flex>
  )
}
