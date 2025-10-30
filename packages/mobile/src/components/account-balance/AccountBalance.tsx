import { useMemo } from 'react'

import { useCurrentUserId, useUserBalanceHistory } from '@audius/common/api'
import { accountBalanceMessages as messages } from '@audius/common/messages'

import {
  Flex,
  Text,
  IconCaretUp,
  IconCaretDown,
  Paper
} from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'

type AccountBalanceProps = {
  userId?: number
  width?: number
  height?: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const formatCurrencyLarge = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export const AccountBalance = ({
  userId,
  width = 350,
  height = 204
}: AccountBalanceProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const effectiveUserId = userId ?? currentUserId
  const {
    data: historyData,
    isLoading,
    isError
  } = useUserBalanceHistory({ userId: effectiveUserId })

  const changeStats = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { balance: null, amount: 0, percentage: 0, isPositive: true }
    }

    const firstBalance = historyData[0].balanceUsd
    const lastBalance = historyData[historyData.length - 1].balanceUsd
    const change = lastBalance - firstBalance
    const percentage = firstBalance !== 0 ? (change / firstBalance) * 100 : 0

    return {
      balance: lastBalance,
      amount: change,
      percentage,
      isPositive: change >= 0
    }
  }, [historyData])

  if (isLoading) {
    return (
      <Paper w='100%' p='m' direction='column' alignItems='center' gap='s'>
        <LoadingSpinner />
        <Text variant='body' size='s' strength='weak'>
          {messages.loading}
        </Text>
      </Paper>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <Paper w='100%' p='m' direction='column' alignItems='center'>
        <Text variant='body' size='m' strength='weak' color='danger'>
          {messages.error}
        </Text>
      </Paper>
    )
  }

  const Icon = changeStats.isPositive ? IconCaretUp : IconCaretDown

  return (
    <Paper w='100%' p='m' direction='column' gap='m'>
      <Flex column gap='xs'>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        {changeStats.balance !== null ? (
          <Text variant='display' size='s'>
            {formatCurrencyLarge(changeStats.balance)}
          </Text>
        ) : null}
        <Flex gap='xs' alignItems='center'>
          <Icon
            color={changeStats.isPositive ? 'success' : 'default'}
            width={16}
            height={16}
          />
          <Text
            variant='body'
            size='s'
            strength='default'
            color={changeStats.isPositive ? 'success' : 'default'}
          >
            {formatCurrency(changeStats.amount)} (
            {formatPercentage(changeStats.percentage)})
          </Text>
          <Text variant='body' size='s' strength='weak'>
            7D
          </Text>
        </Flex>
      </Flex>

      <UserBalanceHistoryGraph
        userId={effectiveUserId ?? undefined}
        width={width}
        height={height}
      />
    </Paper>
  )
}
