import { useCallback, useMemo } from 'react'

import { Coin } from '@audius/common/adapters'
import {
  useArtistCoinByTicker,
  useCoinRedeemAmount,
  useCoinRedeemCodeAmount,
  useCurrentUserId,
  useRedeemCoin,
  useRedeemCoinCode
} from '@audius/common/api'
import { toast } from '@audius/common/src/store/ui/toast/slice'
import {
  coinPage,
  coinRedeemPage,
  COINS_EXPLORE_PAGE,
  NOT_FOUND_PAGE
} from '@audius/common/src/utils/route'
import { formatTickerForUrl } from '@audius/common/utils'
import {
  Button,
  Flex,
  LoadingSpinner,
  Paper,
  Skeleton,
  Text,
  TextLink
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Navigate, useParams } from 'react-router'

import { SignOnLink } from 'components/SignOnLink'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { Header } from 'components/header/desktop/Header'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { BannerSection } from 'pages/coin-detail-page/components/CoinInfoSection'

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
    used: 'Reward code has already been redeemed.'
  }
}

type PageContentProps = {
  coin: Coin | undefined
  coinPending: boolean
  code: string | undefined
  rewardAmount: number
  rewardAmountError: string | null
  rewardAmountPending: boolean
}

const PageContent = ({
  code,
  coin,
  rewardAmount,
  rewardAmountError,
  rewardAmountPending
}: PageContentProps) => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const { data: currentUserId } = useCurrentUserId()
  const { mutate: redeemCoin, isPending: isRedeemingCoin } = useRedeemCoin()
  const { mutate: redeemCoinCode, isPending: isRedeemingCoinCode } =
    useRedeemCoinCode()

  const isSignedIn = !!currentUserId
  const isClaiming = isRedeemingCoin || isRedeemingCoinCode
  const isClaimDisabled = !isSignedIn || !!rewardAmountError || isClaiming
  const mint = coin?.mint

  const onSuccess = useCallback(() => {
    // Show toast and navigate to the coin detail page
    dispatch(toast({ content: 'Reward claimed successfully' }))
    if (coin?.ticker) navigate(coinPage(coin.ticker))
  }, [coin?.ticker, dispatch, navigate])

  const handleClaim = useRequiresAccountCallback(() => {
    if (!mint) return

    if (code) {
      redeemCoinCode({ mint, code }, { onSuccess })
    } else {
      redeemCoin({ mint }, { onSuccess })
    }
  }, [mint, code, redeemCoinCode, onSuccess, redeemCoin])

  return (
    <>
      <Paper
        borderRadius='l'
        shadow='mid'
        column
        alignItems='flex-start'
        border='default'
        flex={1}
        css={{ minWidth: 320, maxWidth: 484 }}
      >
        <BannerSection mint={coin?.mint ?? ''} />
        <Flex column p='l' ph='xl' w='100%' gap='s'>
          <Text variant='heading'>{messages.claimRewards}</Text>
          {!isSignedIn ? (
            <Text variant='body' size='m' color='subdued'>
              {messages.accountRequired}
            </Text>
          ) : null}
        </Flex>
        <Flex column p='l' ph='xl' w='100%' gap='s'>
          <Button
            onClick={handleClaim}
            fullWidth
            disabled={isClaimDisabled}
            isLoading={isClaiming}
          >
            {isClaiming ? messages.claiming : messages.claim}
          </Button>
          {!isSignedIn ? (
            <Text variant='body' size='l' textAlign='center'>
              <TextLink variant='visible'>
                <SignOnLink signIn>{messages.signIn}</SignOnLink>
              </TextLink>
              {messages.toClaimReward}
            </Text>
          ) : null}
          {isSignedIn && rewardAmountError ? (
            <Text variant='body' size='l' textAlign='center' color='danger'>
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
        flex={1}
        css={{ minWidth: 320, maxWidth: 484 }}
      >
        <TokenIcon hex logoURI={coin?.logoUri} size='4xl' />
        <Flex column gap='xs'>
          <Text variant='heading'>{coin?.name}</Text>
          {rewardAmountPending ? (
            <Skeleton w='64px' h='16px' />
          ) : (
            <Text variant='label' size='l' color='subdued'>
              {rewardAmount} ${coin?.ticker}
            </Text>
          )}
        </Flex>
      </Paper>
    </>
  )
}

export const CoinRedeemPage = () => {
  const { ticker, code } = useParams<{ ticker?: string; code?: string }>()
  const isMobile = useIsMobile()
  const formattedTicker = formatTickerForUrl(ticker ?? '')

  const {
    data: coin,
    isPending: coinPending,
    isError,
    isSuccess
  } = useArtistCoinByTicker({ ticker: formattedTicker })

  const { data: coinRedeemAmount, isPending: coinRedeemAmountPending } =
    useCoinRedeemAmount({ mint: coin?.mint })
  const { data: codeRedeemAmount, isPending: codeRedeemAmountPending } =
    useCoinRedeemCodeAmount({
      mint: coin?.mint,
      code
    })

  const rewardInfo: { amount?: number; error?: string | null } = useMemo(() => {
    return code ? codeRedeemAmount : coinRedeemAmount
  }, [code, codeRedeemAmount, coinRedeemAmount])

  const rewardAmount = rewardInfo?.amount ?? 0
  const rewardAmountError = rewardInfo?.error ?? null
  const rewardAmountPending = code
    ? codeRedeemAmountPending
    : coinRedeemAmountPending

  if (!ticker) {
    return <Navigate to={COINS_EXPLORE_PAGE} />
  }

  if (ticker !== formattedTicker) {
    return <Navigate to={coinRedeemPage(formattedTicker, code)} />
  }

  if (isError || (isSuccess && !coin)) {
    return <Navigate to={NOT_FOUND_PAGE} />
  }

  const header = <Header primary={messages.title(ticker)} showBackButton />
  const Content = () => (
    <PageContent
      code={code}
      coin={coin}
      coinPending={coinPending}
      rewardAmount={rewardAmount}
      rewardAmountError={rewardAmountError}
      rewardAmountPending={rewardAmountPending}
    />
  )

  return isMobile ? (
    <MobilePageContainer title={messages.title(ticker)}>
      {coinPending ? (
        <Flex
          justifyContent='center'
          alignItems='center'
          css={{ minHeight: '100px' }}
        >
          <LoadingSpinner />
        </Flex>
      ) : (
        <Flex wrap='wrap' gap='l' pv='2xl' ph='s'>
          <Content />
        </Flex>
      )}
    </MobilePageContainer>
  ) : (
    <Page title={messages.title(ticker)} header={header}>
      {coinPending ? (
        <Flex
          justifyContent='center'
          alignItems='center'
          css={{ minHeight: '100px' }}
        >
          <LoadingSpinner />
        </Flex>
      ) : (
        <Flex row alignItems='flex-start' wrap='wrap' gap='l'>
          <Content />
        </Flex>
      )}
    </Page>
  )
}
