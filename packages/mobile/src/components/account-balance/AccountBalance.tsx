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

const formatCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`
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
  const changeColor = changeStats.isPositive ? 'success' : 'default'

  return (
    <Paper w='100%' p='m' direction='column' gap='m'>
      <Flex column gap='xs'>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        {changeStats.balance !== null ? (
          <Text variant='display' size='s'>
            {formatCurrency(changeStats.balance, 0)}
          </Text>
        ) : null}
        <Flex row gap='xs' alignItems='center'>
          <Icon color={changeColor} size='s' />
          <Text variant='body' size='s' strength='default' color={changeColor}>
            {formatCurrency(Math.abs(changeStats.amount))} (
            {formatPercentage(Math.abs(changeStats.percentage))})
          </Text>
          <Text variant='body' size='s' strength='weak'>
            {messages.timePeriod}
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
