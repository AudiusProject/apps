import { useCallback } from 'react'

import { useCurrentUserId, useManagedAccounts } from '@audius/common/api'
import { Box, Divider, Flex, Text } from '@audius/harmony'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { ManagedUserListItem } from './AccountListItem/ManagedUserListItem'
import { AccountsYouManagePageProps, AccountsYouManagePages } from './types'
import { usePendingInviteValidator } from './usePendingInviteValidator'

const messages = {
  takeControl:
    'Take control of your managed accounts by making changes to their profiles, preferences, and content.',
  noAccounts: 'You don’t manage any accounts.',
  invalidInvitation: 'This invitation is no longer valid',
  alreadyAcceptedInvitation: 'You already accepted this invitation'
}

export const AccountsYouManageHomePage = ({
  setPageState
}: AccountsYouManagePageProps) => {
  const { data: userId } = useCurrentUserId()
  const {
    data: managedAccounts,
    isFetching,
    isSuccess
  } = useManagedAccounts(userId, {
    staleTime: 0
  })

  usePendingInviteValidator({
    managedAccounts,
    userId: userId ?? undefined
  })

  const handleStopManaging = useCallback(
    ({ userId }: { userId: number; managerUserId: number }) => {
      setPageState({
        page: AccountsYouManagePages.STOP_MANAGING,
        params: { user_id: userId }
      })
    },
    [setPageState]
  )

  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body' size='l'>
        {messages.takeControl}{' '}
      </Text>
      {isFetching ? (
        <Box pv='2xl'>
          <LoadingSpinner
            css={({ spacing }) => ({
              width: spacing['3xl'],
              margin: '0 auto'
            })}
          />
        </Box>
      ) : null}
      {isSuccess &&
      !isFetching &&
      (!managedAccounts || managedAccounts.length === 0) ? (
        <>
          <Divider />
          <Text variant='body' size='l'>
            {messages.noAccounts}
          </Text>
        </>
      ) : null}
      {!isFetching &&
        managedAccounts?.map((data) => {
          return (
            <ManagedUserListItem
              key={data.user.user_id}
              userData={data}
              onRemoveManager={handleStopManaging}
            />
          )
        })}
    </Flex>
  )
}
