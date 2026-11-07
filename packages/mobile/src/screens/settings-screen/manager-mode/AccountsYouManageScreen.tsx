import { useCallback, useMemo, useState } from 'react'

import {
  useApproveManagedAccount,
  useCurrentUserId,
  useManagedAccounts,
  useRejectManagedAccount
} from '@audius/common/api'
import { useAccountSwitcher, useIsManagedAccount } from '@audius/common/hooks'
import type { ManagedUserMetadata } from '@audius/common/models'
import { Portal } from '@gorhom/portal'
import { TouchableOpacity } from 'react-native'

import {
  Button,
  Divider,
  Flex,
  IconCheck,
  IconCloseAlt,
  IconTrash,
  IconUser,
  IconUserArrowRotate,
  Text
} from '@audius/harmony-native'
import type { ActionDrawerRow } from 'app/components/action-drawer'
import { ActionDrawerWithoutRedux } from 'app/components/action-drawer'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { ConfirmationDrawerWithoutRedux } from 'app/components/drawers'
import LoadingSpinner from 'app/components/loading-spinner'
import { AccountRow } from 'app/components/manager-mode/AccountRow'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

import type { ProfileTabScreenParamList } from '../../app-screen/ProfileTabScreen'

import { managerModeMessages } from './messages'
import { useRemoveManagerWithSwitchBack } from './useRemoveManagerWithSwitchBack'

const messages = {
  takeControl:
    'Take control of your managed accounts by making changes to their profiles, preferences, and content.',
  noAccounts: 'You don’t manage any accounts.',
  stopManaging: 'Stop Managing',
  stopManagingTitle: 'Stop Managing?',
  stopManagingConfirmation:
    'Are you sure you want to stop managing this account?',
  switchToUser: 'Switch to User',
  accept: 'Accept',
  decline: 'Decline',
  invitationAccepted: 'Invitation Accepted!',
  invitationRejected: 'Invitation Declined'
}

type PendingInviteActionsProps = {
  user: ManagedUserMetadata['user']
}

const PendingInviteActions = ({ user }: PendingInviteActionsProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const { toast } = useToast()
  const { mutate: approve, isPending: isApproving } = useApproveManagedAccount()
  const { mutate: reject, isPending: isRejecting } = useRejectManagedAccount()

  const onError = useCallback(() => {
    toast({ content: managerModeMessages.somethingWentWrong, type: 'error' })
  }, [toast])

  const handleApprove = useCallback(() => {
    if (!currentUserId) return
    approve(
      { userId: currentUserId, grantorUser: user },
      {
        onSuccess: () => toast({ content: messages.invitationAccepted }),
        onError
      }
    )
  }, [approve, currentUserId, onError, toast, user])

  const handleReject = useCallback(() => {
    if (!currentUserId) return
    reject(
      { userId: currentUserId, grantorUser: user },
      {
        onSuccess: () => toast({ content: messages.invitationRejected }),
        onError
      }
    )
  }, [reject, currentUserId, onError, toast, user])

  return (
    <Flex row gap='s'>
      <Button
        variant='secondary'
        size='small'
        fullWidth
        iconLeft={IconCloseAlt}
        disabled={isApproving}
        isLoading={isRejecting}
        onPress={handleReject}
      >
        {messages.decline}
      </Button>
      <Button
        variant='primary'
        size='small'
        fullWidth
        iconLeft={IconCheck}
        disabled={isRejecting}
        isLoading={isApproving}
        onPress={handleApprove}
      >
        {messages.accept}
      </Button>
    </Flex>
  )
}

export const AccountsYouManageScreen = () => {
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { data: userId } = useCurrentUserId()
  const isManagedAccount = useIsManagedAccount()
  const { switchAccount } = useAccountSwitcher()
  const {
    data: managedAccounts,
    isPending,
    isSuccess
  } = useManagedAccounts(userId, {
    // Grants can change from web or another device
    staleTime: 0
  })
  const { remove, isPending: isRemoving } = useRemoveManagerWithSwitchBack()

  const [selected, setSelected] = useState<ManagedUserMetadata | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handlePressAccount = useCallback((data: ManagedUserMetadata) => {
    setSelected(data)
    setIsActionsOpen(true)
  }, [])

  const actionRows = useMemo((): ActionDrawerRow[] => {
    if (!selected) return []
    const rows: ActionDrawerRow[] = []
    // Switching from inside a managed account isn't allowed: the grant
    // belongs to the signed-in user, not the account being managed.
    if (!isManagedAccount) {
      rows.push({
        text: messages.switchToUser,
        icon: <IconUserArrowRotate color='default' />,
        callback: () => switchAccount(selected.user)
      })
    }
    rows.push(
      {
        text: managerModeMessages.visitProfile,
        icon: <IconUser color='default' />,
        callback: () =>
          navigation.push('Profile', { id: selected.user.user_id })
      },
      {
        text: messages.stopManaging,
        icon: <IconTrash color='danger' />,
        isDestructive: true,
        callback: () => setIsConfirmOpen(true)
      }
    )
    return rows
  }, [selected, isManagedAccount, switchAccount, navigation])

  const handleConfirmStop = useCallback(() => {
    if (!selected || !userId) return
    remove({ userId: selected.user.user_id, managerUserId: userId })
  }, [remove, selected, userId])

  return (
    <Screen
      variant='secondary'
      title={managerModeMessages.accountsYouManage}
      icon={IconUserArrowRotate}
      topbarRight={null}
    >
      <ScreenContent>
        <ScrollView>
          <Flex p='xl' gap='xl' backgroundColor='white'>
            <Text variant='body' size='l'>
              {messages.takeControl}
            </Text>
            <Divider />
            {isPending || isRemoving ? (
              <Flex alignItems='center' pv='l'>
                <LoadingSpinner style={{ width: 32, height: 32 }} />
              </Flex>
            ) : null}
            {isSuccess && !managedAccounts?.length ? (
              <Text variant='body' size='l'>
                {messages.noAccounts}
              </Text>
            ) : null}
            <Flex gap='s'>
              {managedAccounts?.map((data) =>
                data.grant.is_approved == null ? (
                  <Flex
                    key={data.user.user_id}
                    border='default'
                    borderRadius='s'
                    p='l'
                    gap='l'
                  >
                    <AccountRow user={data.user}>
                      <Text variant='label' size='s' color='subdued'>
                        {managerModeMessages.invitePending}
                      </Text>
                    </AccountRow>
                    <PendingInviteActions user={data.user} />
                  </Flex>
                ) : (
                  <TouchableOpacity
                    key={data.user.user_id}
                    onPress={() => handlePressAccount(data)}
                  >
                    <Flex border='default' borderRadius='s' p='l'>
                      <AccountRow user={data.user} />
                    </Flex>
                  </TouchableOpacity>
                )
              )}
            </Flex>
          </Flex>
        </ScrollView>
      </ScreenContent>
      {/* Above the tab bar */}
      <Portal hostName='DrawerPortal'>
        <ActionDrawerWithoutRedux
          rows={actionRows}
          isOpen={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
        />
        <ConfirmationDrawerWithoutRedux
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          variant='destructive'
          messages={{
            header: messages.stopManagingTitle,
            description: messages.stopManagingConfirmation,
            confirm: managerModeMessages.remove,
            cancel: managerModeMessages.cancel
          }}
          onConfirm={handleConfirmStop}
        />
      </Portal>
    </Screen>
  )
}
