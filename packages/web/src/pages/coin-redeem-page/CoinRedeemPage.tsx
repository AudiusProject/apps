import { useMemo } from 'react'

import { Coin } from '@audius/common/adapters'
import {
  useArtistCoinByTicker,
  useCoinRedeemAmount,
  useCoinRedeemCodeAmount,
  useCurrentUserId
} from '@audius/common/api'
import {
  COINS_EXPLORE_PAGE,
  NOT_FOUND_PAGE
} from '@audius/common/src/utils/route'
import {
  Button,
  Flex,
  LoadingSpinner,
  Paper,
  Skeleton,
  Text,
  TextLink
} from '@audius/harmony'
import { Redirect, useParams } from 'react-router-dom'

import { SignOnLink } from 'components/SignOnLink'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { Header } from 'components/header/desktop/Header'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { BannerSection } from 'pages/coin-detail-page/components/CoinInfoSection'

const messages = {
  title: (ticker: string) => `Redeem $${ticker}`,
  claimRewards: 'Claim Your Rewards',
  accountRequired: 'An account is required to claim your coins.',
  signIn: 'Sign In',
  toClaimReward: ' to claim your reward.',
  claim: 'Claim',

  // Error messages
  error: {
    ended: 'Rewards have ended.',
    invalid: 'Reward code is invalid.',
    used: 'Reward code has already been redeemed.'
  }
}

type ContentProps = {
  ticker: string
  coin: Coin | undefined
  coinPending: boolean
  rewardAmount: number
  rewardAmountError: string | null
  rewardAmountPending: boolean
}

const CommonContent = ({
  coin,
  rewardAmount,
  rewardAmountError,
  rewardAmountPending
}: ContentProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const isSignedIn = !!currentUserId
  const isClaimDisabled = !isSignedIn || !!rewardAmountError

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
          <Button onClick={() => {}} fullWidth disabled={isClaimDisabled}>
            {messages.claim}
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

const WebContent = (props: ContentProps) => {
  const { ticker, coinPending } = props
  const header = <Header primary={messages.title(ticker)} showBackButton />

  return (
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
          <CommonContent {...props} />
        </Flex>
      )}
    </Page>
  )
}

const MobileContent = (props: ContentProps) => {
  const { coinPending, ticker } = props

  return (
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
          <CommonContent {...props} />
        </Flex>
      )}
    </MobilePageContainer>
  )
}

export const CoinRedeemPage = () => {
  const { ticker, code } = useParams<{ ticker: string; code: string }>()
  const isMobile = useIsMobile()

  const {
    data: coin,
    isPending: coinPending,
    isError,
    isSuccess
  } = useArtistCoinByTicker({ ticker })

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
    return <Redirect to={COINS_EXPLORE_PAGE} />
  }

  if (isError || (isSuccess && !coin)) {
    return <Redirect to={NOT_FOUND_PAGE} />
  }

  const Content = isMobile ? MobileContent : WebContent

  return (
    <Content
      ticker={ticker}
      coin={coin}
      coinPending={coinPending}
      rewardAmount={rewardAmount}
      rewardAmountError={rewardAmountError}
      rewardAmountPending={rewardAmountPending}
    />
  )
}
