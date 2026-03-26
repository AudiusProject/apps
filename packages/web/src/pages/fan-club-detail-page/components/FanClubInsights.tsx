import { useCallback, useContext } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useArtistCoin, useCoinGeckoCoin } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import {
  createAudioCoinMetrics,
  createCoinMetrics,
  MetricData,
  shortenSPLAddress
} from '@audius/common/utils'
import {
  Flex,
  IconCopy,
  IconInfo,
  IconSortDown,
  IconSortUp,
  Paper,
  PlainButton,
  Text,
  Tooltip
} from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'
import { env } from 'services/env'
import { copyToClipboard } from 'utils/clipboardUtil'

import { componentWithErrorBoundary } from '../../../components/error-wrapper/componentWithErrorBoundary'
import Skeleton from '../../../components/skeleton/Skeleton'

import { FanClubInsightsOverflowMenu } from './FanClubInsightsOverflowMenu'
import { GraduationProgressBar } from './GraduationProgressBar'

const messages = coinDetailsMessages.coinInsights
const overflowMessages = coinDetailsMessages.overflowMenu

const FanClubInsightsSkeleton = () => {
  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      backgroundColor='white'
      borderRadius='m'
      border='default'
    >
      <Flex direction='row' alignItems='center' gap='xs' pv='m' ph='l' w='100%'>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
      </Flex>

      {/* Skeleton for 5 metric rows */}
      {Array.from({ length: 5 }).map((_, index) => (
        <Flex
          key={index}
          direction='row'
          alignItems='flex-start'
          justifyContent='space-between'
          borderTop='default'
          pv='l'
          ph='l'
          w='100%'
        >
          <Flex column alignItems='flex-start' gap='l' flex={1}>
            <Skeleton width='80px' height='32px' />
            <Skeleton width='120px' height='20px' />
          </Flex>
          <Flex row alignItems='center' gap='xs'>
            <Skeleton width='60px' height='16px' />
            <Skeleton width='16px' height='16px' />
          </Flex>
        </Flex>
      ))}
    </Paper>
  )
}

const GraduatedPill = () => {
  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      pv='2xs'
      ph='s'
      borderRadius='l'
      css={{
        backgroundColor:
          'color-mix(in srgb, var(--harmony-focus), transparent 90%)'
      }}
    >
      <Text variant='label' size='s' color='accent' textTransform='uppercase'>
        {messages.graduated}
      </Text>
    </Flex>
  )
}

const GraduationProgressMetricRowComponent = ({
  metric,
  coin
}: {
  metric: MetricData
  coin?: any
}) => {
  const progress = coin?.dynamicBondingCurve?.curveProgress ?? 0
  const progressPercentage = Math.round(progress * 100)
  const hasGraduated = progress >= 1

  const tooltipContent = (
    <Flex direction='column' gap='s' p='s'>
      <Text variant='body' size='m'>
        {hasGraduated ? messages.postGraduation : messages.preGraduation}
      </Text>
    </Flex>
  )

  return (
    <Flex
      column
      alignItems='flex-start'
      gap='s'
      flex={1}
      borderTop='default'
      pv='m'
      ph='l'
      w='100%'
      data-testid={`metric-row-Graduation Progress`}
    >
      <Flex alignItems='center' justifyContent='space-between' w='100%'>
        <Text variant='heading' size='xl'>
          {metric.value}
        </Text>
        {hasGraduated ? <GraduatedPill /> : null}
      </Flex>
      <Flex alignItems='center' gap='s'>
        <Text variant='title' size='m' color='subdued'>
          {metric.label}
        </Text>
        <Tooltip text={tooltipContent} mount='body'>
          <IconInfo size='s' color='subdued' />
        </Tooltip>
      </Flex>
      <GraduationProgressBar value={progressPercentage} min={0} max={100} />
    </Flex>
  )
}

const GraduationProgressMetricRow = componentWithErrorBoundary(
  GraduationProgressMetricRowComponent,
  {
    fallback: null,
    name: 'GraduationProgressMetricRow'
  }
)

const MetricRowComponent = ({
  metric,
  coin
}: {
  metric: MetricData
  coin?: Coin
}) => {
  const changeColor = metric.change?.isPositive ? 'premium' : 'subdued'
  const isGraduationProgress = metric.label === 'Graduation Progress'

  if (isGraduationProgress) {
    return env.WAUDIO_MINT_ADDRESS === coin?.mint ? null : (
      <GraduationProgressMetricRow metric={metric} coin={coin} />
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
      data-testid={`metric-row-${metric.label}`}
    >
      <Flex column alignItems='flex-start' gap='xs' flex={1}>
        <Tooltip
          text={metric.rawValue}
          disabled={!metric.rawValue || metric.rawValue === metric.value}
          mount='body'
        >
          <Text variant='heading' size='xl'>
            {metric.value}
          </Text>
        </Tooltip>
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
            css={{ textTransform: 'uppercase' }}
          >
            {metric.change.value}
          </Text>
          <Flex
            css={{
              color: changeColor
            }}
          >
            {metric.change.isPositive ? (
              <IconSortUp size='s' color={changeColor} />
            ) : (
              <IconSortDown size='s' color={changeColor} />
            )}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}

const MetricRow = componentWithErrorBoundary(MetricRowComponent, {
  fallback: null,
  name: 'MetricRow'
})

type FanClubInsightsProps = {
  mint: string
}

export const FanClubInsights = ({ mint }: FanClubInsightsProps) => {
  const { toast } = useContext(ToastContext)
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

  const handleCopyMint = useCallback(() => {
    if (coin?.mint) {
      copyToClipboard(coin.mint)
      toast(overflowMessages.copiedToClipboard)
    }
  }, [coin?.mint, toast])

  if (isPending || !coin) {
    return <FanClubInsightsSkeleton />
  }

  if (isError || !coin) {
    return (
      <Paper
        direction='column'
        alignItems='flex-start'
        backgroundColor='white'
        borderRadius='m'
        border='default'
      >
        <Flex
          direction='row'
          alignItems='center'
          gap='xs'
          pv='m'
          ph='l'
          w='100%'
        >
          <Text variant='heading' size='s'>
            {messages.title}
          </Text>
        </Flex>
        <Flex pv='xl' ph='l' w='100%' justifyContent='center'>
          <Text variant='body' color='subdued'>
            {messages.unableToLoad}
          </Text>
        </Flex>
      </Paper>
    )
  }

  const metrics = isAudio
    ? createAudioCoinMetrics(coingeckoResponse)
    : createCoinMetrics(coin)

  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      backgroundColor='white'
      borderRadius='m'
      border='default'
    >
      <Flex
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        pv='m'
        ph='l'
        w='100%'
      >
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        <FanClubInsightsOverflowMenu mint={mint} />
      </Flex>

      {metrics.map((metric) => (
        <MetricRow key={metric.label} metric={metric} coin={coin} />
      ))}

      <Flex
        row
        alignItems='center'
        justifyContent='space-between'
        borderTop='default'
        pv='m'
        ph='l'
        w='100%'
        data-testid='fan-club-copy-coin-address-row'
      >
        <PlainButton
          iconLeft={IconCopy}
          variant='default'
          onClick={handleCopyMint}
        >
          {overflowMessages.copyCoinAddress}
        </PlainButton>
        <Text
          variant='body'
          size='s'
          color='subdued'
          userSelect='text'
          css={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        >
          {shortenSPLAddress(coin.mint)}
        </Text>
      </Flex>
    </Paper>
  )
}
