import React, { useCallback, useEffect } from 'react'

import {
  useFormattedUSDCBalance,
  useIsManagedAccount
} from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import {
  buyUSDCActions,
  useAddCashModal,
  useWithdrawUSDCModal
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import {
  Box,
  Button,
  Flex,
  IconTokenUSDC,
  Paper,
  Skeleton,
  Text
} from '@audius/harmony-native'
import { TooltipInfoIcon } from 'app/components/buy-sell/TooltipInfoIcon'
import { make, track } from 'app/services/analytics'

export const CashWallet = () => {
  const isManagedAccount = useIsManagedAccount()
  const { onOpen: openAddCashModal } = useAddCashModal()
  const { onOpen: openWithdrawUSDCModal } = useWithdrawUSDCModal()
  const { balanceFormatted, isLoading } = useFormattedUSDCBalance()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(buyUSDCActions.startRecoveryIfNecessary())
  }, [dispatch])

  const handleAddCash = useCallback(() => {
    openAddCashModal()
    track(
      make({
        eventName: Name.BUY_USDC_ADD_FUNDS_MANUALLY
      })
    )
  }, [openAddCashModal])

  const handleWithdrawCash = useCallback(() => {
    openWithdrawUSDCModal()
  }, [openWithdrawUSDCModal])

  return (
    <Paper>
      <Flex p='l' gap='s' direction='column'>
        <Flex gap='xs' direction='row' alignItems='center'>
          <Box mr='s'>
            <IconTokenUSDC size='l' />
          </Box>
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.cashBalance}
          </Text>
          <TooltipInfoIcon
            size='s'
            color='subdued'
            ariaLabel='Cash balance information'
          />
        </Flex>

        <Flex gap='xl'>
          <Flex h='4xl' justifyContent='center'>
            {isLoading ? (
              <Skeleton h='4xl' w='5xl' />
            ) : (
              <Text variant='display' size='m' color='default'>
                {balanceFormatted}
              </Text>
            )}
          </Flex>

          {!isManagedAccount ? (
            <Flex gap='s'>
              <Button variant='primary' onPress={handleWithdrawCash} fullWidth>
                {walletMessages.withdraw}
              </Button>
              <Button variant='secondary' onPress={handleAddCash} fullWidth>
                {walletMessages.addCash}
              </Button>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Paper>
  )
}
