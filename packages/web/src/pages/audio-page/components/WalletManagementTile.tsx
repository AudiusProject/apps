import { useCallback, useMemo } from 'react'

import { useAudioBalance, useAssociatedWallets } from '@audius/common/api'
import { useFeatureFlag, useIsManagedAccount } from '@audius/common/hooks'
import { buySellMessages } from '@audius/common/messages'
import { Client } from '@audius/common/models'
import { FeatureFlags, Location, StringKeys } from '@audius/common/services'
import {
  OnRampProvider,
  useBuySellModal,
  useConnectedWalletsModal,
  buyAudioActions,
  useReceiveTokensModal,
  useSendTokensModal
} from '@audius/common/store'
import { isNullOrUndefined, route } from '@audius/common/utils'
import { AUDIO, type AudioWei } from '@audius/fixed-decimal'
import {
  Box,
  Button,
  ButtonProps,
  Flex,
  IconInfo,
  IconLogoCoinbasePay,
  IconLogoLinkByStripe,
  IconReceive,
  IconSend,
  IconWallet,
  Text
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useAsync } from 'react-use'

import { useHistoryContext } from 'app/HistoryProvider'
import { useModalState } from 'common/hooks/useModalState'
import { isMobileWeb } from 'common/utils/isMobileWeb'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import MobileConnectWalletsDrawer from 'components/mobile-connect-wallets-drawer/MobileConnectWalletsDrawer'
import Tooltip from 'components/tooltip/Tooltip'
import { useIsMobile } from 'hooks/useIsMobile'
import { useFlag, useRemoteVar } from 'hooks/useRemoteConfig'
import { getLocation } from 'services/Location'
import { env } from 'services/env'
import { getClient } from 'utils/clientUtil'
import { pushUniqueRoute } from 'utils/route'

import TokenHoverTooltip from './TokenHoverTooltip'
import styles from './WalletManagementTile.module.css'
const { startBuyAudioFlow } = buyAudioActions
const { TRENDING_PAGE } = route

const messages = {
  receiveLabel: 'Receive',
  sendLabel: 'Send',
  audio: 'Total $AUDIO',
  connectedWallets: 'Connected Wallets',
  buyAudio: 'Buy $AUDIO Tokens',
  buyAudioNotSupported: 'Buy $AUDIO is not yet supported in your region',
  findArtists: 'Find Artists to Support on Trending',
  onRampsPowered: 'Onramps powered by'
}

const OptionButton = (props: ButtonProps) => {
  return (
    <Button
      variant='secondary'
      size='small'
      minWidth={150}
      fullWidth
      {...props}
    />
  )
}

const WalletActions = () => {
  const { accountBalance: balance } = useAudioBalance()
  const { onOpen: openReceiveTokensModal } = useReceiveTokensModal()
  const { onOpen: openSendTokensModal } = useSendTokensModal()
  const hasBalance = !isNullOrUndefined(balance) && balance !== BigInt(0)

  const onClickReceive = useCallback(() => {
    openReceiveTokensModal({
      mint: env.WAUDIO_MINT_ADDRESS,
      isOpen: true
    })
  }, [openReceiveTokensModal])

  const onClickSend = useCallback(() => {
    openSendTokensModal({
      mint: env.WAUDIO_MINT_ADDRESS,
      isOpen: true
    })
  }, [openSendTokensModal])

  return (
    <Flex gap='m' wrap='wrap' justifyContent='center'>
      <Box flex={1}>
        <OptionButton
          disabled={!hasBalance}
          onClick={onClickSend}
          iconLeft={IconSend}
        >
          {messages.sendLabel}
        </OptionButton>
      </Box>
      <Box flex={1}>
        <OptionButton onClick={onClickReceive} iconLeft={IconReceive}>
          {messages.receiveLabel}
        </OptionButton>
      </Box>
      <Box flex={1}>
        <ManageWalletsButton />
      </Box>
    </Flex>
  )
}

type OnRampTooltipButtonProps = {
  isDisabled: boolean
  bannedState: string | boolean
  provider: OnRampProvider
}

const OnRampTooltipButton = ({
  isDisabled,
  bannedState,
  provider
}: OnRampTooltipButtonProps) => {
  const { onOpen: openBuySellModal } = useBuySellModal()
  const { isEnabled: isWalletUIBuySellEnabled } = useFeatureFlag(
    FeatureFlags.WALLET_UI_BUY_SELL
  )
  const dispatch = useDispatch()
  const { history } = useHistoryContext()

  const onClick = useCallback(() => {
    if (isWalletUIBuySellEnabled) {
      openBuySellModal()
    } else {
      dispatch(
        startBuyAudioFlow({
          provider,
          onSuccess: {
            action: pushUniqueRoute(history.location, TRENDING_PAGE),
            message: messages.findArtists
          }
        })
      )
    }
  }, [isWalletUIBuySellEnabled, openBuySellModal, dispatch, provider, history])

  const disabledText = messages.buyAudioNotSupported
  return (
    <Tooltip
      disabled={!isDisabled}
      className={styles.tooltip}
      text={disabledText}
      color='secondary'
      shouldWrapContent={false}
    >
      <div className={styles.onRampButtonTooltipContainer}>
        <Button
          disabled={isDisabled}
          variant='primary'
          fullWidth
          onClick={onClick}
        >
          {isWalletUIBuySellEnabled
            ? buySellMessages.buySell
            : messages.buyAudio}
        </Button>
      </div>
    </Tooltip>
  )
}

const isLocationSupported = ({
  location,
  allowedCountries,
  deniedRegions
}: {
  location?: Location | null
  allowedCountries: string[]
  deniedRegions: string[]
}) => {
  return (
    !location ||
    (allowedCountries.some((c) => c === location.country_code) &&
      !deniedRegions.some((r) => r === location.region_code))
  )
}

export const useOnRampProviderInfo = () => {
  const { isEnabled: isCoinbaseEnabled } = useFlag(
    FeatureFlags.BUY_AUDIO_COINBASE_ENABLED
  )
  const { isEnabled: isStripeEnabled } = useFlag(
    FeatureFlags.BUY_AUDIO_STRIPE_ENABLED
  )
  const coinbaseAllowedCountries = (
    useRemoteVar(StringKeys.COINBASE_PAY_ALLOWED_COUNTRIES_2_LETTER) ?? ''
  ).split(',')
  const coinbaseDeniedRegions = (
    useRemoteVar(StringKeys.COINBASE_PAY_DENIED_REGIONS) ?? ''
  ).split(',')
  const stripeAllowedCountries = (
    useRemoteVar(StringKeys.STRIPE_ALLOWED_COUNTRIES_2_LETTER) ?? ''
  ).split(',')
  const stripeDeniedRegions = (
    useRemoteVar(StringKeys.STRIPE_DENIED_REGIONS) ?? ''
  ).split(',')

  const { value } = useAsync(getLocation, [])

  const isCoinbaseAllowed = useMemo(
    () =>
      isLocationSupported({
        location: value,
        allowedCountries: coinbaseAllowedCountries,
        deniedRegions: coinbaseDeniedRegions
      }),
    [value, coinbaseAllowedCountries, coinbaseDeniedRegions]
  )
  const isStripeAllowed = useMemo(
    () =>
      isLocationSupported({
        location: value,
        allowedCountries: stripeAllowedCountries,
        deniedRegions: stripeDeniedRegions
      }),
    [value, stripeAllowedCountries, stripeDeniedRegions]
  )
  // Assume USA is supported, so if in USA but still not supported, it's a state ban
  const isState = value && value.country_code === 'US'

  return {
    [OnRampProvider.STRIPE]: {
      isEnabled: isStripeEnabled,
      isAllowed: isStripeAllowed,
      bannedState: isState && !isStripeAllowed ? value.region_code : false
    },
    [OnRampProvider.COINBASE]: {
      isEnabled: isCoinbaseEnabled && getClient() !== Client.ELECTRON,
      isAllowed: isCoinbaseAllowed,
      bannedState: isState && !isCoinbaseAllowed ? value.region_code : false
    }
  }
}

const ManageWalletsButton = () => {
  const isMobile = useIsMobile()
  const [, setOpenConnectWalletsDrawer] = useModalState(
    'MobileConnectWalletsDrawer'
  )
  const { onOpen: openConnectedWalletsModal } = useConnectedWalletsModal()

  const onCloseConnectWalletsDrawer = useCallback(() => {
    setOpenConnectWalletsDrawer(false)
  }, [setOpenConnectWalletsDrawer])

  return (
    <>
      <OptionButton
        onClick={() => openConnectedWalletsModal()}
        iconLeft={IconWallet}
      >
        {messages.connectedWallets}
      </OptionButton>
      {isMobile && (
        <MobileConnectWalletsDrawer onClose={onCloseConnectWalletsDrawer} />
      )}
    </>
  )
}
export const WalletManagementTile = () => {
  const isManagedAccount = useIsManagedAccount()
  const { totalBalance, isLoading: isBalanceLoading } = useAudioBalance({
    includeConnectedWallets: true,
    includeStaked: true
  })
  const { data: connectedWallets } = useAssociatedWallets()
  const [, setOpen] = useModalState('AudioBreakdown')

  const onRampProviders = useOnRampProviderInfo()
  const isStripeEnabled = onRampProviders[OnRampProvider.STRIPE].isEnabled
  const isCoinbaseEnabled = onRampProviders[OnRampProvider.COINBASE].isEnabled
  const primaryProvider =
    (!onRampProviders[OnRampProvider.STRIPE].isAllowed || !isStripeEnabled) &&
    onRampProviders[OnRampProvider.COINBASE].isAllowed &&
    isCoinbaseEnabled
      ? OnRampProvider.COINBASE
      : OnRampProvider.STRIPE
  const secondaryProvider =
    primaryProvider === OnRampProvider.COINBASE
      ? OnRampProvider.STRIPE
      : OnRampProvider.COINBASE
  const isAnyProviderAllowed =
    onRampProviders[primaryProvider].isAllowed ||
    onRampProviders[secondaryProvider].isAllowed

  const onClickOpen = useCallback(() => {
    setOpen(true)
  }, [setOpen])

  return (
    <Flex className={styles.walletManagementTile} shadow='mid'>
      <div className={styles.balanceContainer}>
        {isBalanceLoading || totalBalance === null ? (
          <LoadingSpinner className={styles.spinner} />
        ) : (
          <TokenHoverTooltip balance={totalBalance as AudioWei}>
            <div className={styles.balanceAmount}>
              {AUDIO(totalBalance).toLocaleString('en-US', {
                maximumFractionDigits: 0
              })}
            </div>
          </TokenHoverTooltip>
        )}
        <div className={styles.balance}>
          {connectedWallets && connectedWallets.length > 0 ? (
            <div onClick={onClickOpen}>
              {messages.audio}
              <IconInfo className={styles.iconInfo} />
            </div>
          ) : (
            messages.audio
          )}
        </div>
      </div>
      <div className={styles.container}>
        {!isManagedAccount &&
        !isMobileWeb() &&
        onRampProviders[primaryProvider].isEnabled ? (
          <OnRampTooltipButton
            isDisabled={!isAnyProviderAllowed}
            bannedState={onRampProviders[primaryProvider].bannedState}
            provider={primaryProvider}
          />
        ) : null}
        {!isManagedAccount ? (
          <>
            <WalletActions />

            <Flex
              alignItems='center'
              justifyContent='center'
              gap='xl'
              borderTop='default'
              pt='xl'
              pb='s'
            >
              <Text variant='label' size='s' strength='default' color='subdued'>
                {messages.onRampsPowered}
              </Text>
              <IconLogoLinkByStripe
                width={100}
                height={'100%'}
                color='subdued'
              />
              <IconLogoCoinbasePay
                width={100}
                height={'100%'}
                color='subdued'
              />
            </Flex>
          </>
        ) : null}
      </div>
    </Flex>
  )
}
