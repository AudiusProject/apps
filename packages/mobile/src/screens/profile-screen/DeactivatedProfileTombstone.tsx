import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { useLinkTo } from '@react-navigation/native'

import { Button, Flex, IconArrowRight, Text } from '@audius/harmony-native'

const { FEED_PAGE } = route

const messages = {
  helpText: 'This Account No Longer Exists',
  buttonText: 'Take Me Back To The Music'
}

export const DeactivatedProfileTombstone = () => {
  const linkTo = useLinkTo()

  const handlePress = useCallback(() => {
    linkTo(FEED_PAGE)
  }, [linkTo])

  return (
    <Flex column alignItems='center' ph='m' pv='xl' gap='m'>
      <Text variant='body' strength='default' textAlign='center'>
        {messages.helpText}
      </Text>
      <Button
        variant='primary'
        fullWidth
        iconRight={IconArrowRight}
        onPress={handlePress}
      >
        {messages.buttonText}
      </Button>
    </Flex>
  )
}
