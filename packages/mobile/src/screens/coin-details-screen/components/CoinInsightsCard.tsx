import type { Coin } from '@audius/common/adapters'
import { useArtistCoin, useCoinGeckoCoin } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import {
  createAudioCoinMetrics,
  createCoinMetrics,
  type MetricData
} from '@audius/common/utils'

import {
  Flex,
  IconCaretDown,
  IconCaretUp,
  IconButton,
  Paper,
  Text,
  IconKebabHorizontal,
  spacing
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'
import { useDrawer } from 'app/hooks/useDrawer'
import { env } from 'app/services/env'
import { isIos } from 'app/utils/os'

import { GraduationProgressBar } from './GraduationProgressBar'

const messages = coinDetailsMessages.coinInsights

const GraduatedPill = () => {
  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      pv='2xs'
      ph='s'
      borderRadius='l'
      style={{
        backgroundColor: 'rgba(126, 27, 204, 0.1)' // Have to hardcode for opacity
      }}
    >
      <Text
        variant='label'
        size='s'
        color='accent'
        textTransform='uppercase'
        style={{ marginTop: isIos ? 2 : 0 }} // Bugfix for iOS label variant text alignment
      >
        {messages.graduated}
      </Text>
    </Flex>
  )
}

const GraduationMetricRow = ({
  metric,
  coin
}: {
  metric: MetricData
  coin?: Coin
}) => {
  const progress = coin?.dynamicBondingCurve?.curveProgress ?? 0
  const progressPercentage = Math.round(progress * 100)
  const hasGraduated = progress >= 1.0

  return (
    <Flex
      row
      alignItems='flex-start'
      justifyContent='space-between'
      borderTop='default'
      pv='m'
      ph='l'
      w='100%'
    >
      <Flex alignItems='flex-start' gap='s' flex={1}>
        <Flex row alignItems='center' justifyContent='space-between' w='100%'>
          <Text variant='heading' size='xl'>
            {metric.value}
          </Text>
          {hasGraduated && <GraduatedPill />}
        </Flex>
        <Flex row alignItems='center' gap='m'>
          <Text variant='title' size='m' color='subdued'>
            {metric.label}
          </Text>
          <TooltipInfoIcon
            title='Graduation Progress'
            message={
              hasGraduated ? messages.postGraduation : messages.preGraduation
            }
          />
        </Flex>
        <GraduationProgressBar value={progressPercentage} min={0} max={100} />
      </Flex>
    </Flex>
  )
}

const MetricRow = ({ metric, coin }: { metric: MetricData; coin?: Coin }) => {
  const changeColor = metric.change?.isPositive ? 'premium' : 'danger'
  const isGraduationProgress = metric.label === 'Graduation Progress'

  if (isGraduationProgress) {
    return env.WAUDIO_MINT_ADDRESS === coin?.mint ? null : (
      <GraduationMetricRow metric={metric} coin={coin} />
    )
  }

  return (
    <Flex
      row
      alignItems='flex-start'
      justifyContent='space-between'
      borderTop='default'
      pv='m'
      ph='l'
      w='100%'
    >
      <Flex column alignItems='flex-start' flex={1}>
        <Text
          variant='heading'
          size='xl'
          style={{
            lineHeight: spacing.unit13,
            transform: [{ translateY: -spacing.unitHalf }]
          }}
        >
          {metric.value}
        </Text>
        <Text variant='title' size='m' color='subdued'>
          {metric.label}
        </Text>
      </Flex>

      {metric.change ? (
        <Flex row alignItems='center' gap='xs'>
          <Text
            variant='label'
            size='s'
            color={changeColor}
            style={{ textTransform: 'uppercase' }}
          >
            {metric.change.value}
          </Text>
          <Flex row>
            {metric.change.isPositive ? (
              <IconCaretUp size='s' color='premium' />
            ) : (
              <IconCaretDown size='s' color='danger' />
            )}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}

export const CoinInsightsCard = ({ mint }: { mint: string }) => {
  const isAudio = mint === env.WAUDIO_MINT_ADDRESS
  const {
    data: coin,
    isPending: isCoinPending,
    isError: isCoinError
  } = useArtistCoin(mint)
  const {
    data: coingeckoResponse,
    isPending: isCoingeckoPending,
    isError: isCoingeckoError
  } = useCoinGeckoCoin({ coinId: 'audius' }, { enabled: isAudio })

  const isPending = isCoinPending || (isAudio && isCoingeckoPending)
  const isError = isCoinError || (isAudio && isCoingeckoError)

  const { onOpen } = useDrawer('CoinInsightsOverflowMenu')

  const handleOpenOverflowMenu = () => {
    onOpen({ mint })
  }

  if (isPending || !coin) {
    return null
  }

  const metrics = isAudio
    ? createAudioCoinMetrics(coingeckoResponse)
    : createCoinMetrics(coin)

  return (
    <Paper
      column
      alignItems='flex-start'
      backgroundColor='white'
      borderRadius='l'
      shadow='far'
      border='default'
    >
      <Flex
        row
        alignItems='center'
        justifyContent='space-between'
        pv='m'
        ph='l'
        w='100%'
      >
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        <IconButton
          icon={IconKebabHorizontal}
          onPress={handleOpenOverflowMenu}
          ripple
        />
      </Flex>

      {isError || !coin ? (
        <Flex pv='xl' ph='l' w='100%' justifyContent='center'>
          <Text variant='body' color='subdued'>
            {messages.unableToLoad}
          </Text>
        </Flex>
      ) : (
        metrics.map((metric) => (
          <MetricRow key={metric.label} metric={metric} coin={coin} />
        ))
      )}
    </Paper>
  )
}
