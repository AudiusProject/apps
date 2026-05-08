import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { Button, Flex, IconArrowRight, Paper, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'

const { SIGN_UP_PAGE } = route

const messages = {
  title: 'Find your people. Grow your scene.',
  subtitle:
    'Audius is the community-run platform for artists, labels, and music lovers pushing scenes forward. Free to use, ad-free, no upload limits.',
  signUp: 'Get Started'
}

export const UnauthHero = () => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const onSignUp = useCallback(() => {
    navigate(SIGN_UP_PAGE)
  }, [navigate])

  return (
    <Flex direction='column' ph={isMobile ? 'l' : undefined} w='100%'>
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
    </Flex>
  )
}
