import { useCallback } from 'react'

import {
  useCoinBalance,
  useArtistCoin,
  useCoinBalanceBreakdown
} from '@audius/common/api'
import {
  useFormattedCoinBalance,
  useIsManagedAccount,
  useBuySellInitialTab
} from '@audius/common/hooks'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import {
  receiveTokensModalActions,
  sendTokensModalActions
} from '@audius/common/store'
import { shortenSPLAddress } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'
import { useDispatch } from 'react-redux'

import {
  Button,
  Divider,
  Flex,
  Paper,
  Text,
  spacing
} from '@audius/harmony-native'
import { TokenIcon } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { env } from 'app/services/env'

const messages = coinDetailsMessages.balance

type BalanceStateProps = {
  ticker: string
  logoURI?: string
  onBuy?: () => void
  onReceive?: () => void
  onSend?: () => void
  coinName: string
}

const ZeroBalanceState = ({
  ticker,
  logoURI,
  onBuy,
  onReceive,
  coinName
}: BalanceStateProps) => {
  const isManagerMode = useIsManagedAccount()
  return (
    <Flex column gap='l' w='100%'>
      <Flex row gap='s' alignItems='center'>
        <TokenIcon logoURI={logoURI} size={64} />
        <Flex column gap='2xs'>
          <Text variant='heading' size='s'>
            {coinName}
          </Text>
          <Text variant='title' size='l' color='subdued'>
            ${ticker}
          </Text>
        </Flex>
      </Flex>
      <Paper
        column
        backgroundColor='surface2'
        shadow='flat'
        border='strong'
        ph='xl'
        pv='l'
        gap='xs'
      >
        <Text variant='heading' size='s'>
          {messages.becomeAMember}
        </Text>
        <Text>{messages.hintDescription(ticker)}</Text>
      </Paper>
      <Flex column gap='s'>
        <Button
          disabled={isManagerMode}
          variant='primary'
          fullWidth
          onPress={onBuy}
        >
          {walletMessages.buy}
        </Button>
        <Button variant='secondary' fullWidth onPress={onReceive}>
          {walletMessages.receive}
        </Button>
      </Flex>
    </Flex>
  )
}

const HasBalanceState = ({
  ticker,
  logoURI,
  onBuy,
  onSend,
  onReceive,
  mint,
  coinName,
  isAudio
}: BalanceStateProps & {
  mint: string
  coinName: string
  isAudio: boolean
}) => {
  const isManagerMode = useIsManagedAccount()
  const { coinBalanceFormatted, formattedHeldValue } =
    useFormattedCoinBalance(mint)

  const {
    decimals,
    inAppWallet,
    linkedWallets,
    audioBuiltInBalance,
    associatedAudioBalances,
    hasBreakdown
  } = useCoinBalanceBreakdown({ mint, isAudio })

  return (
    <Flex column gap='l' w='100%'>
      <Flex row alignItems='center' justifyContent='space-between'>
        <Flex row alignItems='center' gap='l' style={{ flexShrink: 1 }}>
          <TokenIcon logoURI={logoURI} size={64} />
          <Flex column gap='2xs' flex={1}>
            <Text variant='heading' size='s'>
              {coinName || `$${ticker}`}
            </Text>
            <Flex row gap='xs' alignItems='center' flex={1}>
              <Text variant='title' size='l'>
                {coinBalanceFormatted}
              </Text>
              <Text
                variant='title'
                size='l'
                color='subdued'
                numberOfLines={1}
                style={{
                  flexShrink: 1
                }}
              >
                ${ticker}
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex row alignItems='center' gap='m'>
          <Text
            variant='title'
            size='l'
            color='default'
            style={{
              lineHeight: spacing.unit7,
              transform: [{ translateY: -spacing.unitHalf }]
            }}
          >
            {formattedHeldValue}
          </Text>
        </Flex>
      </Flex>
      {hasBreakdown && (
        <>
          <Divider />
          <Flex column gap='s' w='100%'>
            <Text variant='title' size='l'>
              {coinDetailsMessages.externalWallets.hasBalanceTitle}
            </Text>
            <Flex column gap='s' w='100%'>
              {(inAppWallet || (isAudio && audioBuiltInBalance)) && (
                <Flex
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  w='100%'
                  pv='2xs'
                >
                  <Text variant='body' size='l'>
                    {coinDetailsMessages.externalWallets.builtIn}
                  </Text>
                  <Text variant='body' size='l'>
                    {isAudio
                      ? audioBuiltInBalance
                      : Math.trunc(
                          inAppWallet!.balance / Math.pow(10, decimals ?? 0)
                        ).toLocaleString()}
                  </Text>
                </Flex>
              )}
              {isAudio
                ? // For AUDIO, show associated wallets (both ETH and SOL)
                  associatedAudioBalances.data.map((walletBalance, index) => {
                    if (
                      !walletBalance.balance ||
                      walletBalance.balance === AUDIO(0).value
                    )
                      return null
                    // Use AUDIO constructor to format bigint balance properly
                    const balanceFormatted = AUDIO(
                      walletBalance.balance
                    ).toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                      roundingMode: 'trunc'
                    })
                    return (
                      <Flex
                        key={`${walletBalance.chain}-${walletBalance.address}`}
                        direction='row'
                        alignItems='center'
                        justifyContent='space-between'
                        w='100%'
                        pv='2xs'
                      >
                        <Flex gap='xs' alignItems='center' row>
                          <Text variant='body' size='l'>
                            {walletMessages.linkedWallets.wallet(index)}
                          </Text>
                          <Text variant='body' size='l' color='subdued'>
                            ({shortenSPLAddress(walletBalance.address)})
                          </Text>
                        </Flex>
                        <Text variant='body' size='l'>
                          {balanceFormatted}
                        </Text>
                      </Flex>
                    )
                  })
                : // For other coins, show SPL linked wallets
                  linkedWallets.map((wallet, index) => (
                    <Flex
                      key={wallet.owner}
                      direction='row'
                      alignItems='center'
                      justifyContent='space-between'
                      w='100%'
                      pv='2xs'
                    >
                      <Flex gap='xs' alignItems='center' row>
                        <Text variant='body' size='l'>
                          {walletMessages.linkedWallets.wallet(index)}
                        </Text>
                        <Text variant='body' size='l' color='subdued'>
                          ({shortenSPLAddress(wallet.owner)})
                        </Text>
                      </Flex>
                      <Text variant='body' size='l'>
                        {Math.trunc(
                          wallet.balance / Math.pow(10, decimals ?? 0)
                        ).toLocaleString()}
                      </Text>
                    </Flex>
                  ))}
            </Flex>
          </Flex>
          <Divider />
        </>
      )}
      <Flex column gap='s'>
        <Button
          disabled={isManagerMode}
          variant='secondary'
          fullWidth
          onPress={onBuy}
        >
          {walletMessages.buySell}
        </Button>
        <Button
          disabled={isManagerMode}
          variant='secondary'
          fullWidth
          onPress={onSend}
        >
          {walletMessages.send}
        </Button>
        <Button variant='secondary' fullWidth onPress={onReceive}>
          {walletMessages.receive}
        </Button>
      </Flex>
    </Flex>
  )
}

export const BalanceCard = ({ mint }: { mint: string }) => {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { data: coin, isPending: coinsLoading } = useArtistCoin(mint)
  const { data: tokenBalance } = useCoinBalance({ mint })
  const initialTab = useBuySellInitialTab()
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS

  const handleBuy = useCallback(() => {
    navigation.navigate('BuySell', {
      initialTab,
      coinTicker: coin?.ticker
    })
  }, [navigation, coin, initialTab])

  const handleReceive = useCallback(() => {
    dispatch(receiveTokensModalActions.open({ mint, isOpen: true }))
  }, [dispatch, mint])

  const handleSend = useCallback(() => {
    dispatch(sendTokensModalActions.open({ mint, isOpen: true }))
  }, [dispatch, mint])

  if (coinsLoading || !coin) {
    // TODO: Add skeleton state
    return null
  }

  const title = coin.ticker ?? ''
  const logoURI = coin.logoUri
  const coinName = coin.name ?? ''

  return (
    <Paper p='l' border='default' borderRadius='l' shadow='far'>
      {!tokenBalance?.balance ||
      Number(tokenBalance.balance.toString()) === 0 ? (
        <ZeroBalanceState
          ticker={title}
          logoURI={logoURI}
          onBuy={handleBuy}
          onReceive={handleReceive}
          coinName={coinName}
        />
      ) : (
        <HasBalanceState
          ticker={title}
          logoURI={logoURI}
          onBuy={handleBuy}
          onSend={handleSend}
          onReceive={handleReceive}
          mint={mint}
          coinName={coinName}
          isAudio={isAudio}
        />
      )}
    </Paper>
  )
}
