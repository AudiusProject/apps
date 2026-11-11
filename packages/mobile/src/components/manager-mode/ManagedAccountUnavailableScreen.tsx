import type { ComponentType } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { useAccountSwitcher, useIsManagedAccount } from '@audius/common/hooks'

import { Button, Flex, IconUserArrowRotate, Text } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'

const messages = {
  title: 'Not Available',
  description: (handle?: string) =>
    `Messages aren't available while you're managing ${
      handle ? `@${handle}` : 'another account'
    }.`,
  switchBack: 'Switch to My Account'
}

export const ManagedAccountUnavailableScreen = () => {
  const { data: handle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const { switchToWeb3User } = useAccountSwitcher()

  return (
    <Screen variant='secondary' title={messages.title} topbarRight={null}>
      <ScreenContent>
        <Flex flex={1} p='2xl' gap='xl' alignItems='center' pt='4xl'>
          <IconUserArrowRotate color='subdued' size='3xl' />
          <Text variant='body' size='l' textAlign='center'>
            {messages.description(handle)}
          </Text>
          <Button variant='secondary' onPress={switchToWeb3User}>
            {messages.switchBack}
          </Button>
        </Flex>
      </ScreenContent>
    </Screen>
  )
}

/**
 * Renders the unavailable screen instead of `Component` while managing
 * another account. Used for screens that act as the signed-in wallet
 * (e.g. DMs), which a manager can't do on the managed account's behalf.
 */
export const withManagedAccountRestriction = <P extends object>(
  Component: ComponentType<P>
) => {
  const Restricted = (props: P) => {
    const isManagedAccount = useIsManagedAccount()
    if (isManagedAccount) return <ManagedAccountUnavailableScreen />
    return <Component {...props} />
  }
  Restricted.displayName = `withManagedAccountRestriction(${
    Component.displayName ?? Component.name
  })`
  return Restricted
}
