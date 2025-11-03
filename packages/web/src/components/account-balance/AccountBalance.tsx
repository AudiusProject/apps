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

import { componentWithErrorBoundary } from 'components/error-wrapper/componentWithErrorBoundary'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { UserBalanceHistoryGraph } from 'components/user-balance-history-graph'
import { useIsMobile } from 'hooks/useIsMobile'

type AccountBalanceProps = {
  userId?: number
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
  const changeColor = isPositive ? 'success' : 'default'

  return (
    <Flex gap='s' alignItems='center'>
      <Box
        w='unit12'
        h='unit12'
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
          color={changeColor}
        />
      </Box>
      <Flex column gap='2xs'>
        <Text variant='title' size='l'>
          {messages.changeLabel}
        </Text>
        <Text variant='body' size='l' color={changeColor}>
          {formatCurrency(Math.abs(changeAmount))} (
          {formatPercentage(Math.abs(changePercentage))})
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
  const changeColor = isPositive ? 'success' : 'default'

  return (
    <Flex gap='xs' alignItems='center'>
      <Icon size='s' color={changeColor} />
      <Text variant='body' size='s' color={changeColor}>
        {formatCurrency(Math.abs(changeAmount))} (
        {formatPercentage(Math.abs(changePercentage))})
      </Text>
      <Text variant='body' size='s' strength='weak'>
        {messages.timePeriod}
      </Text>
    </Flex>
  )
}

const AccountBalanceContent = ({ userId }: AccountBalanceProps) => {
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
              {formatCurrency(changeStats.balance, 0)}
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
                {formatCurrency(changeStats.balance, 0)}
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

      <UserBalanceHistoryGraph userId={effectiveUserId ?? undefined} />
    </Paper>
  )
}

export const AccountBalance = componentWithErrorBoundary(
  AccountBalanceContent,
  {
    name: 'AccountBalance',
    fallback: null
  }
)
