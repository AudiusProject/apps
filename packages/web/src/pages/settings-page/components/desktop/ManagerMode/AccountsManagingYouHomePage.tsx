import { useCallback } from 'react'

import { useCurrentUserId, useManagers } from '@audius/common/api'
import { Box, Button, Divider, Flex, IconPlus, Text } from '@audius/harmony'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { ManagerListItem } from './AccountListItem/ManagerListItem'
import { sharedMessages } from './sharedMessages'
import { AccountsManagingYouPageProps, AccountsManagingYouPages } from './types'

const messages = {
  accountManagers: 'Account Managers',
  noManagers: 'You haven’t added any managers to your account.',
  inviteButton: 'Invite'
}

type AccountsManagingYouHomePageProps = AccountsManagingYouPageProps

export const AccountsManagingYouHomePage = (
  props: AccountsManagingYouHomePageProps
) => {
  const { setPageState } = props
  const { data: userId } = useCurrentUserId()

  const {
    data: managers,
    isFetching,
    isSuccess
  } = useManagers(userId, {
    staleTime: 0
  })

  const handleRemoveManager = useCallback(
    (params: { userId: number; managerUserId: number }) => {
      setPageState({
        page: AccountsManagingYouPages.CONFIRM_REMOVE_MANAGER,
        params
      })
    },
    [setPageState]
  )

  return (
    <Flex direction='column' gap='xl' ph='xl'>
      <Text variant='body' size='l'>
        {sharedMessages.accountManagersExplanation}
      </Text>
      <Divider />
      <Flex justifyContent='space-between' alignItems='center'>
        <Text variant='heading' size='m'>
          {messages.accountManagers}
        </Text>
        <Button
          variant='secondary'
          iconLeft={IconPlus}
          onClick={() =>
            setPageState({
              page: AccountsManagingYouPages.FIND_ACCOUNT_MANAGER
            })
          }
        >
          {messages.inviteButton}
        </Button>
      </Flex>
      <Flex direction='column' gap='s'>
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
        {isSuccess && !isFetching && (!managers || managers.length === 0) ? (
          <Text variant='body' size='l'>
            {messages.noManagers}
          </Text>
        ) : null}
        {!isFetching &&
          managers?.map((data) => {
            return (
              <ManagerListItem
                onRemoveManager={handleRemoveManager}
                key={data.manager.user_id}
                managerData={data}
              />
            )
          })}
      </Flex>
    </Flex>
  )
}
