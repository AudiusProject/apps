import { useCallback, useContext, useEffect } from 'react'

import { useGetManagers, useRemoveManager } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconPlus,
  Text,
  TextLink
} from '@audius/harmony'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { ToastContext } from 'components/toast/ToastContext'
import { useSelector } from 'utils/reducer'

import { AccountListItem } from './AccountListItem'
import { sharedMessages } from './sharedMessages'
import { AccountsManagingYouPageProps, AccountsManagingYouPages } from './types'

const { getUserId } = accountSelectors

export const messages = {
  accountManagers: 'Account Managers',
  noManagers: 'You haven’t added any managers to your account.',
  inviteButton: 'Invite'
}

type AccountsManagingYouHomePageProps = AccountsManagingYouPageProps

export const AccountsManagingYouHomePage = (
  props: AccountsManagingYouHomePageProps
) => {
  const { setPage } = props
  const userId = useSelector(getUserId) as number
  const { toast } = useContext(ToastContext)

  const [removeManager, removeResult] = useRemoveManager()
  const { data: managers, status: managersStatus } = useGetManagers({ userId })

  const handleRemoveManager = useCallback(
    (params: { userId: number; managerUserId: number }) => {
      setPage(AccountsManagingYouPages.CONFIRM_REMOVE_MANAGER, params)
    },
    [setPage]
  )

  const handleCancelInvite = useCallback(
    (params: { userId: number; managerUserId: number }) => {
      removeManager(params)
    },
    [removeManager]
  )

  useEffect(() => {
    if (removeResult.status === Status.ERROR) {
      toast(sharedMessages.somethingWentWrong)
    }
  }, [toast, removeResult.status])

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
          onClick={() => setPage(AccountsManagingYouPages.FIND_ACCOUNT_MANAGER)}
        >
          {messages.inviteButton}
        </Button>
      </Flex>
      <Flex direction='column' gap='s'>
        {managersStatus !== Status.SUCCESS ? (
          <Box pv='2xl'>
            <LoadingSpinner
              css={({ spacing }) => ({
                width: spacing['3xl'],
                margin: '0 auto'
              })}
            />
          </Box>
        ) : null}
        {managersStatus === Status.SUCCESS &&
        (!managers || managers.length === 0) ? (
          <Text variant='body' size='l'>
            {messages.noManagers}
          </Text>
        ) : null}
        {managers?.map(({ grant, manager }) => {
          return (
            <AccountListItem
              onRemoveManager={handleRemoveManager}
              onCancelInvite={handleCancelInvite}
              key={manager.user_id}
              user={manager}
              isPending={!grant.is_approved}
            />
          )
        })}
      </Flex>
    </Flex>
  )
}
