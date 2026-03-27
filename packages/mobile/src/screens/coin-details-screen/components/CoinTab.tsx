import { useCallback, type ReactNode } from 'react'

import type { Coin } from '@audius/common/adapters'
import { useArtistCoin, useCurrentUserId } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import {
  getTokenDecimalPlaces,
  formatCurrencyWithSubscript,
  shortenSPLAddress
} from '@audius/common/utils'
import { FixedDecimal, wAUDIO } from '@audius/fixed-decimal'
import Clipboard from '@react-native-clipboard/clipboard'

import {
  Divider,
  Flex,
  IconCopy,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'
import { useToast } from 'app/hooks/useToast'
import { env } from 'app/services/env'

import { BalanceCard } from './BalanceCard'
import { CoinInsightsCard } from './CoinInsightsCard'

const overflowMessages = coinDetailsMessages.overflowMenu

type CoinTabProps = {
  mint: string
}

const formatTokenAmount = (balance: number, coinDecimals: number) => {
  const decimals = getTokenDecimalPlaces(balance)
  const maxFractionDigits = Math.min(decimals, coinDecimals)
  return new FixedDecimal(BigInt(balance), coinDecimals).toLocaleString(
    'en-US',
    {
      maximumFractionDigits: maxFractionDigits
    }
  )
}

const formatFeeNumber = (input: number) => {
  const value = wAUDIO(BigInt(input))
  const decimalPlaces = getTokenDecimalPlaces(Number(value.toString()))
  return formatCurrencyWithSubscript(
    Number(value.trunc(decimalPlaces).toString()),
    'en-US',
    ''
  )
}

const CoinDetailRow = ({
  label,
  tooltip,
  children
}: {
  label: string
  tooltip?: string
  children: ReactNode
}) => (
  <Flex column gap='xs' w='100%'>
    <Flex row alignItems='center' gap='xs'>
      <Text variant='body' size='s' strength='strong' color='subdued'>
        {label}
      </Text>
      {tooltip ? <TooltipInfoIcon title={label} message={tooltip} /> : null}
    </Flex>
    {children}
  </Flex>
)

const CoinDetailsSection = ({ coin }: { coin: Coin }) => {
  const isAudio = coin.mint === env.WAUDIO_MINT_ADDRESS
  if (isAudio) return null

  const hasGraduated = coin.dynamicBondingCurve?.isMigrated ?? false
  const locker = coin.artistLocker
  const showLockerStats = hasGraduated && !!locker
  const decimals = coin.decimals ?? 9
  const ticker = coin.ticker ? `$${coin.ticker}` : ''

  const formattedArtistEarnings = coin.artistFees?.totalFees
    ? formatFeeNumber(Math.trunc(coin.artistFees.totalFees))
    : null

  const rewardsPoolBalance =
    coin.rewardPool?.balance != null
      ? formatTokenAmount(coin.rewardPool.balance, decimals)
      : null

  return (
    <Paper
      column
      alignItems='flex-start'
      borderRadius='l'
      shadow='far'
      border='default'
      w='100%'
    >
      <Flex pv='m' ph='l' w='100%'>
        <Text variant='heading' size='s'>
          Coin Details
        </Text>
      </Flex>
      <Divider style={{ width: '100%' }} />

      <Flex column gap='l' ph='l' pv='l' w='100%'>
        {/* Artist Earnings */}
        {formattedArtistEarnings ? (
          <CoinDetailRow
            label={overflowMessages.artistEarnings}
            tooltip={overflowMessages.tooltips.artistEarnings}
          >
            <Text variant='body' size='m'>
              {formattedArtistEarnings} {overflowMessages.$audio}
            </Text>
          </CoinDetailRow>
        ) : null}

        {/* Unlock Schedule */}
        <CoinDetailRow
          label={overflowMessages.vestingSchedule}
          tooltip={overflowMessages.tooltips.vestingSchedule}
        >
          <Text variant='body' size='m'>
            {overflowMessages.vestingScheduleValue}
          </Text>
        </CoinDetailRow>

        {/* Locked / Unlocked */}
        {showLockerStats && locker ? (
          <>
            <CoinDetailRow
              label={overflowMessages.locked}
              tooltip={overflowMessages.tooltips.locked}
            >
              <Text variant='body' size='m'>
                {formatTokenAmount(locker.locked ?? 0, decimals)} {ticker}
              </Text>
            </CoinDetailRow>

            <CoinDetailRow
              label={overflowMessages.unlocked}
              tooltip={overflowMessages.tooltips.unlocked}
            >
              <Text variant='body' size='m'>
                {formatTokenAmount(locker.unlocked ?? 0, decimals)} {ticker}
              </Text>
            </CoinDetailRow>
          </>
        ) : null}

        {/* Reward Pool */}
        {rewardsPoolBalance != null ? (
          <CoinDetailRow
            label={overflowMessages.rewardsPool}
            tooltip={overflowMessages.tooltips.rewardsPool}
          >
            <Text variant='body' size='m'>
              {rewardsPoolBalance} {ticker}
            </Text>
          </CoinDetailRow>
        ) : null}
      </Flex>
    </Paper>
  )
}

const CopyCoinAddress = ({ mint }: { mint: string }) => {
  const { toast } = useToast()

  const handleCopyAddress = useCallback(() => {
    Clipboard.setString(mint)
    toast({ content: overflowMessages.copiedToClipboard, type: 'info' })
  }, [mint, toast])

  return (
    <Flex row w='100%' justifyContent='space-between' alignItems='center'>
      <PlainButton onPress={handleCopyAddress} iconLeft={IconCopy}>
        {overflowMessages.copyCoinAddress}
      </PlainButton>
      <Text variant='body' size='m' color='subdued'>
        {shortenSPLAddress(mint)}
      </Text>
    </Flex>
  )
}

export const CoinTab = ({ mint }: CoinTabProps) => {
  const { data: coin } = useArtistCoin(mint)
  const { data: currentUserId } = useCurrentUserId()
  const isOwner = currentUserId === coin?.ownerId

  return (
    <Flex column gap='m' w='100%'>
      {/* Balance section */}
      <BalanceCard mint={mint} />

      {/* Insights section */}
      <CoinInsightsCard mint={mint} />

      {/* Copy Coin Address */}
      {mint ? <CopyCoinAddress mint={mint} /> : null}

      {/* Coin Details - Owner only */}
      {isOwner && coin ? <CoinDetailsSection coin={coin} /> : null}
    </Flex>
  )
}
