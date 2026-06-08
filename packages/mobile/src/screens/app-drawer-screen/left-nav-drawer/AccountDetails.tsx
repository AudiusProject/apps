import { useCallback, useContext } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { TouchableOpacity } from 'react-native'

import { Flex, Text } from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core'
import { UserLink } from 'app/components/user-link'
import { useAppTabNavigation } from 'app/screens/app-screen'

import { AppDrawerContext } from '../AppDrawerContext'

export const AccountDetails = () => {
  const { drawerHelpers } = useContext(AppDrawerContext)
  const { data: accountUser } = useCurrentAccountUser({
    select: (user) => ({
      user_id: user?.user_id,
      handle: user?.handle
    })
  })
  const { handle, user_id } = accountUser ?? {}

  const navigation = useAppTabNavigation()

  const handlePressAccount = useCallback(() => {
    if (handle) {
      navigation.push('Profile', { handle })
      drawerHelpers.closeDrawer()
    }
  }, [handle, navigation, drawerHelpers])

  return (
    <TouchableOpacity onPress={handlePressAccount}>
      <Flex gap='m' ph='xl'>
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
  )
}
