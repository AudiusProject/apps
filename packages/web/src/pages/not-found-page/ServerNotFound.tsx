import IconArrowRight from '@audius/harmony/src/assets/icons/ArrowRight.svg'
import { Button } from '@audius/harmony/src/components/button/Button/Button'
import { Flex } from '@audius/harmony/src/components/layout/Flex'
import { Text } from '@audius/harmony/src/components/text'
import { Link } from 'react-router'

const messages = {
  heading: 'Whoops',
  description: 'This is not the page you’re looking for...',
  buttonText: 'Take Me Back To The Music'
}

/**
 * SSR version of NotFoundPage. Uses deep harmony imports and skips the Lottie
 * animation and background to keep the worker bundle small.
 */
export const ServerNotFound = () => {
  return (
    <Flex
      w='100%'
      direction='column'
      alignItems='center'
      justifyContent='center'
      p='xl'
      css={{ minHeight: 'clamp(240px, 60vh, 640px)' }}
    >
      <Flex
        direction='column'
        alignItems='center'
        gap='xl'
        css={{ maxWidth: 400 }}
      >
        <Flex direction='column' alignItems='center' gap='s'>
          <Text variant='heading' size='m' textAlign='center'>
            {messages.heading}
          </Text>
          <Text variant='body' size='l' color='subdued' textAlign='center'>
            {messages.description}
          </Text>
        </Flex>
        <Button variant='primary' asChild iconRight={IconArrowRight}>
          <Link to='/'>{messages.buttonText}</Link>
        </Button>
      </Flex>
    </Flex>
  )
}
