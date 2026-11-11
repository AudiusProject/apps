import { useCallback, useContext } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { TouchableOpacity } from 'react-native'

import {
  Flex,
  IconButton,
  IconUserArrowRotate,
  Text
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { useManagerModeAccounts } from 'app/components/manager-mode/useManagerModeAccounts'
import { UserLink } from 'app/components/user-link'
import { useDrawer } from 'app/hooks/useDrawer'
import { useAppTabNavigation } from 'app/screens/app-screen'

import { AppDrawerContext } from '../AppDrawerContext'

const messages = {
  managedAccount: 'Managed Account',
  switchAccount: 'Switch Account'
}

export const AccountDetails = () => {
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { data: accountUser } = useCurrentAccountUser({
    select: (user) => ({
      user_id: user?.user_id,
      handle: user?.handle
    })
  })
  const { handle, user_id } = accountUser ?? {}
  const { canSwitch, isManagedAccount } = useManagerModeAccounts()
  const { onOpen: openAccountSwitcher } = useDrawer('AccountSwitcher')

  const navigation = useAppTabNavigation()

  const handlePressAccount = useCallback(() => {
    if (handle) {
      navigation.push('Profile', { handle })
      drawerHelpers.closeDrawer()
    }
  }, [handle, navigation, drawerHelpers])

  const handlePressSwitch = useCallback(() => {
    drawerHelpers.closeDrawer()
    openAccountSwitcher()
  }, [drawerHelpers, openAccountSwitcher])

  return (
    <Flex gap='m'>
      {isManagedAccount ? (
        <Flex ph='xl' pv='xs' backgroundColor='accent'>
          <Text variant='label' size='xs' color='white'>
            {messages.managedAccount}
          </Text>
        </Flex>
      ) : null}
      <Flex row alignItems='flex-start' justifyContent='space-between' ph='xl'>
        <TouchableOpacity onPress={handlePressAccount} style={{ flex: 1 }}>
          <Flex gap='m'>
            <ProfilePicture
              userId={user_id}
              h='unit20'
              w='unit20'
              borderWidth='thin'
            />
            <Flex gap='unitHalf'>
              {user_id ? (
                <UserLink userId={user_id} size='l' strength='strong' />
              ) : null}
              <Text numberOfLines={1} variant='body' size='s'>
                @{handle}
              </Text>
            </Flex>
          </Flex>
        </TouchableOpacity>
        {canSwitch ? (
          <IconButton
            icon={IconUserArrowRotate}
            color='subdued'
            size='l'
            onPress={handlePressSwitch}
            accessibilityLabel={messages.switchAccount}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
