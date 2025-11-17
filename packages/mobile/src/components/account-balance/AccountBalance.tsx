import { useMemo } from 'react'

import {
  useCurrentUserId,
  useUserBalanceHistory,
  useUserTotalBalance
} from '@audius/common/api'
import { accountBalanceMessages as messages } from '@audius/common/messages'

import { Flex, Text, IconArrowRight, Paper, Box } from '@audius/harmony-native'
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'

type AccountBalanceProps = {
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
  width = 350,
  height = 204
}: AccountBalanceProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError
  } = useUserBalanceHistory({ userId: currentUserId })

  const {
    totalBalance: currentBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError
  } = useUserTotalBalance()

  const changeStats = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { balance: null, amount: 0, percentage: 0, isPositive: true }
    }

    const firstBalance = historyData[0].balanceUsd
    const change = currentBalance - firstBalance
    const percentage = firstBalance !== 0 ? (change / firstBalance) * 100 : 0

    return {
      balance: currentBalance,
      amount: change,
      percentage,
      isPositive: change >= 0
    }
  }, [historyData, currentBalance])

  const isLoading = isHistoryLoading || isBalanceLoading
  const isError = isHistoryError || isBalanceError

  if (isLoading) {
    return (
      <Paper
        w='100%'
        h={300}
        pv='xl'
        ph='m'
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='l'
        border='default'
      >
        <Text variant='body' size='l' color='subdued'>
          {messages.loading}
        </Text>
      </Paper>
    )
  }

  if (isError) {
    return (
      <Paper
        w='100%'
        p='m'
        direction='column'
        alignItems='center'
        border='default'
      >
        <Text variant='body' size='m' strength='weak' color='subdued'>
          {messages.error}
        </Text>
      </Paper>
    )
  }

  // Show zero balance state without graph when balance is 0 or no history
  const hasZeroBalance =
    currentBalance === 0 || !historyData || historyData.length === 0

  if (hasZeroBalance) {
    return (
      <Paper w='100%' p='m' direction='column' gap='m' border='default'>
        <Flex column gap='s'>
          <Text variant='heading' size='s' color='default'>
            {messages.title}
          </Text>
          <Text variant='display' size='s'>
            {formatCurrency(0, 2)}
          </Text>
        </Flex>
      </Paper>
    )
  }

  const changeColor = changeStats.isPositive ? 'success' : 'default'
  const rotation = changeStats.isPositive ? -45 : 45

  return (
    <Paper w='100%' p='m' direction='column' gap='m' border='default'>
      <Flex column gap='xs'>
        <Text variant='heading' size='s' color='default'>
          {messages.title}
        </Text>
        {changeStats.balance !== null ? (
          <Text variant='display' size='s'>
            {formatCurrency(changeStats.balance, 2)}
          </Text>
        ) : null}
        <Flex row gap='xs' alignItems='center'>
          <Box style={{ transform: [{ rotate: `${rotation}deg` }] }}>
            <IconArrowRight color={changeColor} size='s' />
          </Box>
          <Text variant='body' size='s' strength='default' color={changeColor}>
            {formatCurrency(Math.abs(changeStats.amount))} (
            {formatPercentage(Math.abs(changeStats.percentage))})
          </Text>
          <Text variant='body' size='s' strength='weak'>
            {messages.timePeriod}
          </Text>
        </Flex>
      </Flex>

      <UserBalanceHistoryGraph width={width} height={height} />
    </Paper>
  )
}
