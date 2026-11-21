import { useEffect } from 'react'

import { walletMessages } from '@audius/common/messages'
import { Status } from '@audius/common/models'
import {
  withdrawUSDCSelectors,
  useWithdrawUSDCModal,
  WithdrawUSDCModalPages
} from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Flex, LoadingSpinner, spacing, Text } from '@audius/harmony-native'

const { getWithdrawStatus } = withdrawUSDCSelectors

export const TransferInProgress = () => {
  const withdrawStatus = useSelector(getWithdrawStatus)
  const { setData } = useWithdrawUSDCModal()

  useEffect(() => {
    if (withdrawStatus === Status.SUCCESS) {
      setData({ page: WithdrawUSDCModalPages.TRANSFER_SUCCESSFUL })
    } else if (withdrawStatus === Status.ERROR) {
      setData({ page: WithdrawUSDCModalPages.ERROR })
    }
  }, [withdrawStatus, setData])

  return (
    <Flex gap='xl' alignItems='center' justifyContent='center' pv='5xl'>
      <LoadingSpinner
        style={{ height: spacing.unit10, width: spacing.unit10 }}
      />
      <Flex gap='m' alignItems='center' justifyContent='center'>
        <Text variant='heading' size='l'>
          {walletMessages.transferInProgress}
        </Text>
        <Text variant='body' size='l'>
          {walletMessages.thisMayTakeAMoment}
        </Text>
      </Flex>
    </Flex>
  )
}
