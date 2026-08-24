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
 * Server-rendered twin of NotFoundPage. Kept separate, and on deep harmony
 * imports, so the SSR worker bundle doesn't pull in the client barrels -
 * matching the other Server* page components. The Lottie animation and tiled
 * background from the client page are deliberately left out: they'd pull a
 * large animation payload into the worker bundle for a page the client
 * replaces on hydration anyway.
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
