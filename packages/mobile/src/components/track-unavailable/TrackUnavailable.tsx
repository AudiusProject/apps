import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { useLinkTo } from '@react-navigation/native'

import { Button, Flex, IconArrowRight, Text } from '@audius/harmony-native'

const { FEED_PAGE } = route

const messages = {
  heading: 'This Track Isn’t Available',
  description: 'This track can no longer be streamed on Audius.',
  buttonText: 'Take Me Back To The Music'
}

/**
 * Shown in place of a track screen the API reports as non-streamable - today
 * that means the owner is no longer active. Says nothing about the account,
 * since the same flag covers a self deactivation and a delisted account.
 */
export const TrackUnavailable = () => {
  const linkTo = useLinkTo()

  const handlePress = useCallback(() => {
    linkTo(FEED_PAGE)
  }, [linkTo])

  return (
    <Flex
      flex={1}
      column
      alignItems='center'
      justifyContent='center'
      gap='xl'
      ph='l'
      pv='2xl'
    >
      <Flex column alignItems='center' gap='s'>
        <Text variant='heading' size='s' textAlign='center'>
          {messages.heading}
        </Text>
        <Text variant='body' size='l' color='subdued' textAlign='center'>
          {messages.description}
        </Text>
      </Flex>
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
