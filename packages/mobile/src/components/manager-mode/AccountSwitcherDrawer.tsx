import { useCallback, useMemo, useState } from 'react'

import { useAccountSwitcher } from '@audius/common/hooks'
import type { UserMetadata } from '@audius/common/models'
import { TouchableOpacity } from 'react-native'

import {
  Flex,
  IconCheck,
  IconUserArrowRotate,
  Text
} from '@audius/harmony-native'
import { NativeDrawer } from 'app/components/drawer'
import { useDrawer } from 'app/hooks/useDrawer'

import { DrawerHeader } from '../core/DrawerHeader'

import { AccountRow } from './AccountRow'
import { useManagerModeAccounts } from './useManagerModeAccounts'

const messages = {
  switchAccount: 'Switch Account',
  managedAccounts: 'Managed Accounts',
  switching: 'Switching...'
}

type SwitcherRowProps = {
  user: UserMetadata
  isSelected: boolean
  isSwitching: boolean
  onPress: (user: UserMetadata) => void
}

const SwitcherRow = ({
  user,
  isSelected,
  isSwitching,
  onPress
}: SwitcherRowProps) => (
  <TouchableOpacity
    disabled={isSelected || isSwitching}
    onPress={() => onPress(user)}
    accessibilityRole='button'
    accessibilityState={{ selected: isSelected }}
  >
    <Flex ph='xl' pv='m'>
      <AccountRow user={user} isSelected={isSelected}>
        {isSelected ? <IconCheck size='m' color='accent' /> : null}
      </AccountRow>
    </Flex>
  </TouchableOpacity>
)

export const AccountSwitcherDrawer = () => {
  const { onClose } = useDrawer('AccountSwitcher')
  const { web3User, currentUserId, accounts } = useManagerModeAccounts()
  const { switchAccount } = useAccountSwitcher()
  const [isSwitching, setIsSwitching] = useState(false)

  // Keep the account in use at the top of the managed list
  const sortedAccounts = useMemo(() => {
    const selected = accounts.filter(
      ({ user }) => user.user_id === currentUserId
    )
    const rest = accounts.filter(({ user }) => user.user_id !== currentUserId)
    return [...selected, ...rest]
  }, [accounts, currentUserId])

  const handlePress = useCallback(
    (user: UserMetadata) => {
      if (user.user_id === currentUserId) return
      setIsSwitching(true)
      switchAccount(user)
    },
    [currentUserId, switchAccount]
  )

  if (!web3User) return null

  return (
    <NativeDrawer drawerName='AccountSwitcher' onClose={onClose}>
      <Flex pt='xl' pb='2xl'>
        <Flex ph='xl'>
          <DrawerHeader
            icon={IconUserArrowRotate}
            title={isSwitching ? messages.switching : messages.switchAccount}
          />
        </Flex>
        <SwitcherRow
          user={web3User}
          isSelected={currentUserId === web3User.user_id}
          isSwitching={isSwitching}
          onPress={handlePress}
        />
        <Flex
          ph='xl'
          pv='s'
          backgroundColor='surface1'
          borderTop='default'
          borderBottom='default'
        >
          <Text variant='title' size='xs'>
            {messages.managedAccounts}
          </Text>
        </Flex>
        {sortedAccounts.map(({ user }) => (
          <SwitcherRow
            key={user.user_id}
            user={user}
            isSelected={currentUserId === user.user_id}
            isSwitching={isSwitching}
            onPress={handlePress}
          />
        ))}
      </Flex>
    </NativeDrawer>
  )
}
