import { useMemo } from 'react'

import { useCurrentUserId, useUserBalanceHistory } from '@audius/common/api'
import { accountBalanceMessages as messages } from '@audius/common/messages'
import {
  Flex,
  Text,
  IconCaretUp,
  IconCaretDown,
  Box,
  Paper
} from '@audius/harmony'
import { css, useTheme } from '@emotion/react'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { UserBalanceHistoryGraph } from 'components/user-balance-history-graph'
import { useIsMobile } from 'hooks/useIsMobile'

type AccountBalanceProps = {
  userId?: number
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

const DesktopChangeIndicator = ({
  isPositive,
  changeAmount,
  changePercentage
}: {
  isPositive: boolean
  changeAmount: number
  changePercentage: number
}) => {
  const Icon = isPositive ? IconCaretUp : IconCaretDown
  const theme = useTheme()

  return (
    <Flex gap='s' alignItems='center'>
      <Box
        w={48}
        h={48}
        css={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <Box
          w='100%'
          h='100%'
          borderRadius='circle'
          css={css({
            position: 'absolute',
            opacity: 0.1,
            background: isPositive
              ? theme.color.special.green
              : theme.color.neutral.n400
          })}
        />
        <Icon
          css={css({ position: 'relative', zIndex: 1 })}
          size='l'
          color={isPositive ? 'success' : 'default'}
        />
      </Box>
      <Flex column gap='2xs'>
        <Text variant='title' size='l'>
          {messages.changeLabel}
        </Text>
        <Text
          variant='body'
          size='l'
          color={isPositive ? 'success' : 'default'}
        >
          {formatCurrency(changeAmount)} ({formatPercentage(changePercentage)})
        </Text>
      </Flex>
    </Flex>
  )
}

const MobileChangeIndicator = ({
  isPositive,
  changeAmount,
  changePercentage
}: {
  isPositive: boolean
  changeAmount: number
  changePercentage: number
}) => {
  const Icon = isPositive ? IconCaretUp : IconCaretDown

  return (
    <Flex gap='xs' alignItems='center'>
      <Icon size='s' color={isPositive ? 'success' : 'default'} />
      <Text variant='body' size='s' color={isPositive ? 'success' : 'default'}>
        {formatCurrency(changeAmount)} ({formatPercentage(changePercentage)})
      </Text>
      <Text variant='body' size='s' strength='weak'>
        7D
      </Text>
    </Flex>
  )
}

export const AccountBalance = ({ userId }: AccountBalanceProps) => {
  const isMobile = useIsMobile()
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

  const padding = isMobile ? 'm' : 'l'
  const gap = isMobile ? 'm' : 'l'

  if (isLoading) {
    return (
      <Paper
        w='100%'
        p={padding}
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='s'
        css={css({ minHeight: 400 })}
      >
        <LoadingSpinner />
        <Text variant='body' size='s' strength='weak'>
          {messages.loading}
        </Text>
      </Paper>
    )
  }

  if (isError || !historyData || historyData.length === 0) {
    return (
      <Paper
        w='100%'
        p={padding}
        direction='column'
        alignItems='center'
        justifyContent='center'
        css={css({ minHeight: 400 })}
      >
        <Text variant='body' size='m' strength='weak' color='danger'>
          {messages.error}
        </Text>
      </Paper>
    )
  }

  const ChangeIndicator = isMobile
    ? MobileChangeIndicator
    : DesktopChangeIndicator

  return (
    <Paper w='100%' p={padding} direction='column' gap={gap}>
      {isMobile ? (
        <Flex column gap='xs'>
          <Text variant='heading' size='s'>
            {messages.title}
          </Text>
          {changeStats.balance !== null ? (
            <Text variant='display' size='s'>
              {formatCurrencyLarge(changeStats.balance)}
            </Text>
          ) : null}
          <ChangeIndicator
            isPositive={changeStats.isPositive}
            changeAmount={changeStats.amount}
            changePercentage={changeStats.percentage}
          />
        </Flex>
      ) : (
        <Flex justifyContent='space-between' alignItems='flex-start'>
          <Flex column gap='s'>
            <Text variant='heading' size='m'>
              {messages.title}
            </Text>
            {changeStats.balance !== null ? (
              <Text variant='display' size='m'>
                {formatCurrencyLarge(changeStats.balance)}
              </Text>
            ) : null}
          </Flex>

          <ChangeIndicator
            isPositive={changeStats.isPositive}
            changeAmount={changeStats.amount}
            changePercentage={changeStats.percentage}
          />
        </Flex>
      )}

      <Box
        css={css({
          width: '100%',
          '& > div': {
            background: 'transparent',
            border: 'none',
            padding: 0
          }
        })}
      >
        <UserBalanceHistoryGraph userId={effectiveUserId ?? undefined} />
      </Box>
    </Paper>
  )
}
