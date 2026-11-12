import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useManagers,
  useRemoveManager
} from '@audius/common/api'
import type { UserManagerMetadata } from '@audius/common/models'
import { Portal } from '@gorhom/portal'
import { TouchableOpacity } from 'react-native'

import {
  Button,
  Divider,
  Flex,
  IconPlus,
  IconShieldUser,
  IconTrash,
  IconUser,
  Text
} from '@audius/harmony-native'
import type { ActionDrawerRow } from 'app/components/action-drawer'
import { ActionDrawerWithoutRedux } from 'app/components/action-drawer'
import { Screen, ScreenContent, ScrollView } from 'app/components/core'
import { ConfirmationDrawerWithoutRedux } from 'app/components/drawers'
import LoadingSpinner from 'app/components/loading-spinner'
import { AccountRow } from 'app/components/manager-mode/AccountRow'
import { useNavigation } from 'app/hooks/useNavigation'

import type { ProfileTabScreenParamList } from '../../app-screen/ProfileTabScreen'

import { managerModeMessages } from './messages'
import { useRemoveManagerWithSwitchBack } from './useRemoveManagerWithSwitchBack'

const messages = {
  accountManagers: 'Account Managers',
  noManagers: 'You haven’t added any managers to your account.',
  invite: 'Invite',
  removeManager: 'Remove Manager',
  cancelInvite: 'Cancel Invite',
  removeManagerTitle: 'Remove Manager?',
  removeManagerConfirmation:
    'Are you sure you want to remove this manager from your account?'
}

export const AccountsManagingYouScreen = () => {
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { data: userId } = useCurrentUserId()
  const {
    data: managers,
    isPending,
    isSuccess
  } = useManagers(userId, {
    // Grants can change from web or another device
    staleTime: 0
  })
  const { mutate: cancelInvite } = useRemoveManager()
  const { remove, isPending: isRemoving } = useRemoveManagerWithSwitchBack()

  const [selected, setSelected] = useState<UserManagerMetadata | null>(null)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handlePressManager = useCallback((data: UserManagerMetadata) => {
    setSelected(data)
    setIsActionsOpen(true)
  }, [])

  const actionRows = useMemo((): ActionDrawerRow[] => {
    if (!selected || !userId) return []
    const isInvitePending = selected.grant.is_approved == null
    return [
      {
        text: managerModeMessages.visitProfile,
        icon: <IconUser color='default' />,
        callback: () =>
          navigation.push('Profile', { id: selected.manager.user_id })
      },
      {
        text: isInvitePending ? messages.cancelInvite : messages.removeManager,
        icon: <IconTrash color='danger' />,
        isDestructive: true,
        callback: () => {
          if (isInvitePending) {
            cancelInvite({ userId, managerUserId: selected.manager.user_id })
          } else {
            setIsConfirmOpen(true)
          }
        }
      }
    ]
  }, [selected, userId, navigation, cancelInvite])

  const handleConfirmRemove = useCallback(() => {
    if (!selected || !userId) return
    remove({ userId, managerUserId: selected.manager.user_id })
  }, [remove, selected, userId])

  return (
    <Screen
      variant='secondary'
      title={managerModeMessages.accountsManagingYou}
      icon={IconShieldUser}
      topbarRight={null}
    >
      <ScreenContent>
        <ScrollView>
          <Flex p='xl' gap='xl' backgroundColor='white'>
            <Text variant='body' size='l'>
              {managerModeMessages.accountManagersExplanation}
            </Text>
            <Divider />
            <Flex row justifyContent='space-between' alignItems='center'>
              <Text variant='heading' size='s'>
                {messages.accountManagers}
              </Text>
              <Button
                variant='secondary'
                size='small'
                iconLeft={IconPlus}
                onPress={() => navigation.push('FindAccountManagerScreen')}
              >
                {messages.invite}
              </Button>
            </Flex>
            {isPending || isRemoving ? (
              <Flex alignItems='center' pv='l'>
                <LoadingSpinner style={{ width: 32, height: 32 }} />
              </Flex>
            ) : null}
            {isSuccess && !managers?.length ? (
              <Text variant='body' size='l'>
                {messages.noManagers}
              </Text>
            ) : null}
            <Flex gap='s'>
              {managers?.map((data) => (
                <TouchableOpacity
                  key={data.manager.user_id}
                  onPress={() => handlePressManager(data)}
                >
                  <Flex border='default' borderRadius='s' p='l'>
                    <AccountRow user={data.manager}>
                      {data.grant.is_approved == null ? (
                        <Text variant='label' size='s' color='subdued'>
                          {managerModeMessages.invitePending}
                        </Text>
                      ) : null}
                    </AccountRow>
                  </Flex>
                </TouchableOpacity>
              ))}
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
            header: messages.removeManagerTitle,
            description: messages.removeManagerConfirmation,
            confirm: managerModeMessages.remove,
            cancel: managerModeMessages.cancel
          }}
          onConfirm={handleConfirmRemove}
        />
      </Portal>
    </Screen>
  )
}
