import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { Button, Flex, IconArrowRight, Paper, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

const { SIGN_UP_PAGE } = route

const messages = {
  title: 'Welcome to Audius',
  subtitle:
    'Discover new music, support artists directly, and join a community owned by its creators.',
  signUp: 'Sign Up Free'
}

export const UnauthHero = () => {
  const navigate = useNavigate()
  const onSignUp = useCallback(() => {
    navigate(SIGN_UP_PAGE)
  }, [navigate])

  return (
    <Paper
      border='default'
      p='2xl'
      direction='column'
      gap='l'
      alignItems='flex-start'
    >
      <Flex column gap='s'>
        <Text variant='heading' size='l' color='accent'>
          {messages.title}
        </Text>
        <Text variant='body' size='l'>
          {messages.subtitle}
        </Text>
      </Flex>
      <Button onClick={onSignUp} iconRight={IconArrowRight}>
        {messages.signUp}
      </Button>
    </Paper>
  )
}
