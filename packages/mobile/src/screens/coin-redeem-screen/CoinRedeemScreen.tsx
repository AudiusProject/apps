import { useCallback, useMemo } from 'react'

import {
  useArtistCoinByTicker,
  useCoinRedeemAmount,
  useCoinRedeemCodeAmount,
  useRedeemCoin,
  useRedeemCoinCode
} from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useRoute } from '@react-navigation/native'

import {
  Box,
  Button,
  Flex,
  Paper,
  Skeleton,
  Text
} from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  ScrollView,
  TokenIcon
} from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

import { BannerSection } from '../coin-details-screen/components/CoinInfoCard'

const messages = {
  title: (ticker: string) => `Redeem $${ticker}`,
  claimRewards: 'Claim Your Rewards',
  accountRequired: 'An account is required to claim your coins.',
  signIn: 'Sign In',
  toClaimReward: ' to claim your reward.',
  claim: 'Claim',
  claiming: 'Claiming',

  // Error messages
  error: {
    ended: 'Rewards have ended.',
    invalid: 'Reward code is invalid.',
    used: 'Reward code has already been redeemed.',
    somethingWrong: 'Something went wrong.'
  }
}

export const CoinRedeemScreen = () => {
  const navigation = useNavigation()
  const { toast } = useToast()
  const { mutate: redeemCoin, isPending: isRedeemingCoin } = useRedeemCoin()
  const { mutate: redeemCoinCode, isPending: isRedeemingCoinCode } =
    useRedeemCoinCode()
  const { ticker, code } = useRoute().params as {
    ticker: string
    code?: string
  }
  const { data: coin } = useArtistCoinByTicker({ ticker })
  const mint = coin?.mint ?? ''

  const { data: coinRedeemAmount, isPending: coinRedeemAmountPending } =
    useCoinRedeemAmount({ mint })
  const { data: codeRedeemAmount, isPending: codeRedeemAmountPending } =
    useCoinRedeemCodeAmount({ mint, code })

  const rewardInfo: { amount?: number; error?: string | null } = useMemo(() => {
    return code ? codeRedeemAmount : coinRedeemAmount
  }, [code, codeRedeemAmount, coinRedeemAmount])

  const rewardAmount = rewardInfo?.amount ?? 0
  const rewardAmountError = rewardInfo?.error ?? null
  const rewardAmountPending = code
    ? codeRedeemAmountPending
    : coinRedeemAmountPending

  const isClaiming = isRedeemingCoin || isRedeemingCoinCode
  const isClaimDisabled = !!rewardAmountError || isClaiming

  const onSuccess = useCallback(() => {
    // Show toast and navigate to the coin detail page
    toast({ content: 'Reward claimed successfully', type: 'info' })
    navigation.navigate('CoinDetailsScreen', { ticker })
  }, [navigation, ticker, toast])

  const handleClaim = useCallback(() => {
    if (!mint) return

    if (code) {
      redeemCoinCode({ mint, code }, { onSuccess })
    } else {
      redeemCoin({ mint }, { onSuccess })
    }
  }, [mint, code, redeemCoin, redeemCoinCode, onSuccess])

  return (
    <Screen
      url={route.COIN_DETAIL_PAGE}
      variant='secondary'
      title={ticker ? `Redeem $${ticker}` : 'Redeem Coin'}
    >
      <ScreenContent>
        <ScrollView>
          <Flex column gap='m' ph='s' pv='2xl'>
            <Paper
              borderRadius='l'
              shadow='mid'
              column
              alignItems='flex-start'
              border='default'
              flex={1}
              style={{ overflow: 'hidden' }}
            >
              <BannerSection mint={mint} />
              <Flex column p='l' ph='xl' w='100%' gap='s'>
                <Text variant='heading'>{messages.claimRewards}</Text>
              </Flex>
              <Flex column p='l' ph='xl' w='100%' gap='s'>
                <Button
                  onPress={handleClaim}
                  fullWidth
                  disabled={isClaimDisabled}
                  isLoading={isClaiming}
                >
                  {isClaiming ? messages.claiming : messages.claim}
                </Button>
                {rewardAmountError ? (
                  <Text
                    variant='body'
                    size='l'
                    textAlign='center'
                    color='danger'
                  >
                    {messages.error?.[
                      rewardAmountError as keyof typeof messages.error
                    ] ?? ''}
                  </Text>
                ) : null}
              </Flex>
            </Paper>
            <Paper
              borderRadius='l'
              shadow='mid'
              p='2xl'
              gap='s'
              alignItems='center'
              border='default'
              row
              flex={1}
            >
              <TokenIcon logoURI={coin?.logoUri} size='4xl' />
              <Flex column gap='xs'>
                <Text variant='heading'>{coin?.name}</Text>
                {rewardAmountPending ? (
                  <Box h={16} w={64}>
                    <Skeleton />
                  </Box>
                ) : (
                  <Text variant='label' size='l' color='subdued'>
                    {rewardAmount} ${coin?.ticker}
                  </Text>
                )}
              </Flex>
            </Paper>
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
