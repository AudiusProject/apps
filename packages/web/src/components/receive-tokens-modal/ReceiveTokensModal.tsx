import { useCallback, useContext } from 'react'

import {
  transformArtistCoinToTokenInfo,
  useArtistCoin
} from '@audius/common/api'
import {
  useFormattedCoinBalance,
  useUserbank,
  useRootWalletAddress
} from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { useReceiveTokensModal } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Button,
  Divider,
  Flex,
  Hint,
  IconError,
  LoadingSpinner,
  Text,
  useMedia
} from '@audius/harmony'

import { AddressTile } from 'components/address-tile'
import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'
import { QRCodeComponent } from 'components/core/QRCode'
import { ExternalTextLink } from 'components/link'
import ResponsiveModal from 'components/modal/ResponsiveModal'
import { ToastContext } from 'components/toast/ToastContext'
import { env } from 'services/env'
import { copyToClipboard } from 'utils/clipboardUtil'

const DIMENSIONS = 160
const LOADING_HEIGHT = 400

export const ReceiveTokensModal = () => {
  const { toast } = useContext(ToastContext)
  const { isMobile } = useMedia()
  const { isOpen, onClose, data } = useReceiveTokensModal()
  const { mint } = data ?? {}
  const { data: coin } = useArtistCoin(mint)
  const { coinBalanceFormatted: balance } = useFormattedCoinBalance(
    mint ?? '',
    'en-US',
    isOpen,
    3000 // Poll every 3 seconds when modal is open
  )
  const { userBankAddress, loading: userBankLoading } = useUserbank(mint)
  const { rootWalletAddress, loading: rootWalletLoading } =
    useRootWalletAddress()
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  // Use root wallet address for USDC, user bank for others
  const isUsdc = mint === env.USDC_MINT_ADDRESS
  const shouldUseRootWallet = isUsdc
  const displayAddress = shouldUseRootWallet
    ? rootWalletAddress
    : userBankAddress
  const loading = shouldUseRootWallet ? rootWalletLoading : userBankLoading

  const handleCopy = useCallback(() => {
    copyToClipboard(displayAddress ?? '')
    toast(walletMessages.receiveTokensCopied)
  }, [displayAddress, toast])

  if (loading || !displayAddress) {
    return (
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        size='m'
        dismissOnClickOutside
      >
        <Flex
          direction='column'
          justifyContent='center'
          alignItems='center'
          p='xl'
          w='100%'
          h={LOADING_HEIGHT}
          gap='l'
        >
          <LoadingSpinner size='2xl' color='subdued' />
          <Flex column gap='xs' alignItems='center'>
            <Text variant='heading' size='l'>
              {walletMessages.receiveTokensLoadingTitle}
            </Text>
            <Text variant='title' size='l' strength='weak'>
              {walletMessages.receiveTokensLoadingSubtitle}
            </Text>
          </Flex>
        </Flex>
      </ResponsiveModal>
    )
  }

  const hint = (
    <Hint
      icon={IconError}
      actions={
        <ExternalTextLink
          to={route.AUDIUS_ARTIST_COINS_HELP_LINK}
          variant='visible'
          showUnderline
        >
          {walletMessages.receiveTokensLearnMore}
        </ExternalTextLink>
      }
    >
      {walletMessages.receiveTokensDisclaimer}
    </Hint>
  )

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size='m'
      dismissOnClickOutside
      title={walletMessages.receiveTokensTitle}
    >
      <Flex direction='column' gap='xl' p='xl' h='100%'>
        {tokenInfo && balance ? (
          <CryptoBalanceSection
            tokenInfo={tokenInfo}
            name={tokenInfo.name}
            amount={balance}
          />
        ) : null}

        <Divider orientation='horizontal' color='default' />

        <Flex gap='xl' alignItems='center' row>
          <Flex
            w={DIMENSIONS}
            h={DIMENSIONS}
            alignItems='center'
            justifyContent='center'
          >
            <QRCodeComponent value={displayAddress} />
          </Flex>
          <Flex column gap='xl' h={DIMENSIONS} justifyContent='center' flex={1}>
            <Text variant='body' size='l'>
              {walletMessages.receiveTokensExplainer}
            </Text>
            {!isMobile ? hint : null}
          </Flex>
        </Flex>

        <AddressTile address={displayAddress} />

        {isMobile ? hint : null}

        <Flex
          gap='s'
          alignItems='center'
          direction={isMobile ? 'column' : 'row'}
        >
          <Button variant='primary' fullWidth onClick={handleCopy}>
            {walletMessages.receiveTokensCopy}
          </Button>
          {isMobile ? null : (
            <Button variant='secondary' fullWidth onClick={onClose}>
              {walletMessages.receiveTokensClose}
            </Button>
          )}
        </Flex>
      </Flex>
    </ResponsiveModal>
  )
}
