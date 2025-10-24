import { useMemo } from 'react'

import { useArtistCoin, useQueryContext } from '@audius/common/api'
import type { LaunchpadFormValues } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  Artwork,
  Flex,
  Hint,
  IconInfo,
  Paper,
  Text,
  makeResponsiveStyles
} from '@audius/harmony'
import { useFormikContext } from 'formik'

import { useFormImageUrl } from 'hooks/useFormImageUrl'

import { AgreeToTerms } from '../components/AgreeToTerms'
import { ArtistCoinsSubmitRow } from '../components/ArtistCoinsSubmitRow'
import { StepHeader } from '../components/StepHeader'
import { TokenInfoRow } from '../components/TokenInfoRow'
import type { PhasePageProps } from '../components/types'
import { AMOUNT_OF_STEPS } from '../constants'

const messages = {
  stepInfo: `STEP 2 of ${AMOUNT_OF_STEPS}`,
  title: 'Review Your Coin',
  description: 'Make sure everything looks correct before creating your Coin.',
  initialPrice: 'INITIAL PRICE',
  coinDetails: 'Coin Details',
  yourOwnership: 'Your Ownership',
  totalSupply: 'Total Supply',
  initialMarketCap: 'Initial Market Cap',
  graduationMarketCap: 'Graduation Market Cap',
  allocation: 'Allocation',
  vesting: 'Unlocking',
  tradingFees: 'Trading Fees',
  back: 'Back',
  hintMessage: "Remember! You can't change these details later."
}

// Helper functions for market cap calculations
const formatAudioAmount = (amount: number): string => {
  return `${formatCount(amount)} $AUDIO`
}

const calculateMarketCaps = (audioPriceUSD: number) => {
  // Fixed AUDIO amounts as requested
  const initialAudioAmount = 100000 // 100K AUDIO
  const graduationAudioAmount = 1000000 // 1M AUDIO

  // Calculate USD values based on current AUDIO price
  const initialMarketCapUSD = initialAudioAmount * audioPriceUSD
  const graduationMarketCapUSD = graduationAudioAmount * audioPriceUSD

  return {
    initialMarketCap: {
      usd: `(~$${formatCount(initialMarketCapUSD, 2)})`,
      audio: formatAudioAmount(initialAudioAmount)
    },
    graduationMarketCap: {
      usd: `(~$${formatCount(graduationMarketCapUSD, 2)})`,
      audio: formatAudioAmount(graduationAudioAmount)
    }
  }
}

// Default fallback values for display when config is not available
const defaultCoinDetails = {
  initialPrice: '~$0.0₄415',
  totalSupply: '1,000,000,000',
  initialMarketCap: {
    usd: '(~$612)',
    audio: '10K $AUDIO'
  },
  graduationMarketCap: {
    usd: '(~$30.6K)',
    audio: '1M $AUDIO'
  },
  allocation: '50%',
  vesting: '5 years (Linear)',
  tradingFees: '50%'
}

const tooltipContent = {
  totalSupply:
    'The total number of your Artist Coins that will ever exist. This amount is fixed and never changes.',
  initialMarketCap:
    'The starting value of your Artist Coin at launch, based on the initial price and supply. These values are the same for all Artist Coins.',
  graduationMarketCap:
    'The market cap your Artist Coin will reach when it graduates into the open market.',
  allocation:
    "The percentage of your total Artist Coin supply reserved for you as the creator. You'll receive this gradually through unlocking.",
  vesting:
    "Once your Artist Coin graduates into the open market, your reserved Coins are unlocked daily over a 5-year period. You can claim your unlocked Coins every day, or let them accumulate as long as you'd like.",
  tradingFees:
    'You earn half of all trading fees for all trades of your Artist Coin. Trading fees are 1%.'
}

const useStyles = makeResponsiveStyles(({ theme }) => ({
  tableContainer: {
    base: {
      flexDirection: 'row',
      transition: `all ${theme.motion.expressive}`
    },
    tablet: {
      flexDirection: 'column'
    }
  },
  column: {
    base: {
      backgroundColor: theme.color.background.white,
      borderRight: `1px solid ${theme.color.border.default}`,
      borderBottom: 'none',
      transition: `all ${theme.motion.expressive}`,
      flex: '1 1 50%',
      minHeight: theme.spacing['4xl']
    },
    tablet: {
      backgroundColor: theme.color.background.white,
      borderRight: 'none',
      borderBottom: `1px solid ${theme.color.border.default}`,
      flex: '1 1 100%',
      minHeight: theme.spacing['4xl']
    }
  }
}))

export const ReviewPage = ({ onContinue, onBack }: PhasePageProps) => {
  const { values } = useFormikContext<LaunchpadFormValues>()
  const imageUrl = useFormImageUrl(values.coinImage)
  const styles = useStyles()
  const { env } = useQueryContext()
  const { data: audioCoinData } = useArtistCoin(env.WAUDIO_MINT_ADDRESS)

  // Calculate market caps with fixed AUDIO amounts and current AUDIO price
  const coinDetails = useMemo(() => {
    // Get current AUDIO price, fall back to 0.0612 if not available
    const audioPriceUSD = audioCoinData?.price ?? 0.0612

    const marketCaps = calculateMarketCaps(audioPriceUSD)
    return {
      ...defaultCoinDetails,
      ...marketCaps
    }
  }, [audioCoinData?.price])

  const handleBack = () => {
    onBack?.()
  }

  const handleContinue = () => {
    onContinue?.()
  }

  return (
    <>
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='l'
      >
        <Paper p='2xl' gap='2xl' direction='column' w='100%'>
          <StepHeader
            stepInfo={messages.stepInfo}
            title={messages.title}
            description={messages.description}
          />

          <Flex
            p='0'
            direction='column'
            w='100%'
            border='default'
            borderRadius='m'
            css={{ overflow: 'hidden' }}
          >
            {/* Token Info Header */}
            <Flex
              alignItems='center'
              gap='m'
              p='l'
              borderBottom='default'
              css={(theme) => ({
                backgroundColor: theme.color.background.white
              })}
            >
              {imageUrl && (
                <Artwork
                  src={imageUrl}
                  hex={true}
                  w='4xl'
                  h='4xl'
                  borderWidth={0}
                />
              )}
              <Flex direction='column' gap='xs' flex='1'>
                <Text variant='heading' size='s' color='default'>
                  {values.coinName}
                </Text>
                <Text
                  variant='body'
                  size='l'
                  color='subdued'
                  textTransform='uppercase'
                >
                  ${values.coinSymbol}
                </Text>
              </Flex>
              <Flex direction='column' gap='xs' alignItems='flex-end'>
                <Text variant='label' size='m'>
                  {messages.initialPrice}
                </Text>
                <Text variant='body' size='l' color='subdued'>
                  {coinDetails.initialPrice}
                </Text>
              </Flex>
            </Flex>

            {/* Token Details Section */}
            <Flex css={styles.tableContainer}>
              {/* Coin Details Column */}
              <Flex
                direction='column'
                gap='l'
                p='l'
                flex='1'
                css={styles.column}
              >
                <Text variant='heading' size='s' color='default'>
                  {messages.coinDetails}
                </Text>
                <Flex direction='column' gap='m'>
                  <TokenInfoRow
                    label={messages.totalSupply}
                    value={coinDetails.totalSupply}
                    hasTooltip
                    tooltipContent={tooltipContent.totalSupply}
                  />
                  <TokenInfoRow
                    label={messages.initialMarketCap}
                    value={
                      <Flex gap='s' alignItems='center'>
                        <Text variant='body' size='m' color='subdued'>
                          {coinDetails.initialMarketCap.usd}
                        </Text>
                        <Text variant='body' size='m' color='default'>
                          {coinDetails.initialMarketCap.audio}
                        </Text>
                      </Flex>
                    }
                    hasTooltip
                    tooltipContent={tooltipContent.initialMarketCap}
                  />
                  <TokenInfoRow
                    label={messages.graduationMarketCap}
                    value={
                      <Flex gap='s' alignItems='center'>
                        <Text variant='body' size='m' color='subdued'>
                          {coinDetails.graduationMarketCap.usd}
                        </Text>
                        <Text variant='body' size='m' color='default'>
                          {coinDetails.graduationMarketCap.audio}
                        </Text>
                      </Flex>
                    }
                    hasTooltip
                    tooltipContent={tooltipContent.graduationMarketCap}
                  />
                </Flex>
              </Flex>

              {/* Your Ownership Column */}
              <Flex
                direction='column'
                gap='l'
                p='l'
                flex='1'
                css={styles.column}
              >
                <Text variant='heading' size='s' color='default'>
                  {messages.yourOwnership}
                </Text>
                <Flex direction='column' gap='m'>
                  <TokenInfoRow
                    label={messages.allocation}
                    value={coinDetails.allocation}
                    hasTooltip
                    tooltipContent={tooltipContent.allocation}
                  />
                  <TokenInfoRow
                    label={messages.vesting}
                    value={coinDetails.vesting}
                    hasTooltip
                    tooltipContent={tooltipContent.vesting}
                  />
                  <TokenInfoRow
                    label={messages.tradingFees}
                    value={coinDetails.tradingFees}
                    hasTooltip
                    tooltipContent={tooltipContent.tradingFees}
                  />
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <Hint icon={IconInfo}>{messages.hintMessage}</Hint>
          <AgreeToTerms />
        </Paper>
      </Flex>
      <ArtistCoinsSubmitRow
        cancelText={messages.back}
        backIcon
        onContinue={handleContinue}
        isValid={values.termsAgreed} // Require checkbox to be checked before proceeding
        onBack={handleBack}
      />
    </>
  )
}
