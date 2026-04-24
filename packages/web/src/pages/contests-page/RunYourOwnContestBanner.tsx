import { useState } from 'react'

import {
  Button,
  Flex,
  IconButton,
  IconClose,
  Paper,
  Text
} from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'

const CONTEST_HOSTING_HELP_URL =
  'https://help.audius.co/artists/hosting-a-remix-contest'

const messages = {
  title: 'Run Your Own Contest!',
  description:
    'Host a remix contest for members of the community. Add stems, accept submissions, offer prizes, and more!',
  createContest: 'Create Contest',
  dismiss: 'Dismiss'
}

/**
 * Desktop-only CTA encouraging viewers to host their own remix
 * contest. Hidden on mobile-width viewports. Renders in the normal
 * page flow underneath the contest grid — matches the placement on
 * other launchpad/explore pages (fan clubs, etc.) so the banner
 * tracks the content column's width + padding instead of
 * float-overlapping rows with a fixed viewport offset.
 * Dismissable for the rest of the session (state is not persisted
 * across reloads — flip to localStorage if we want it to stick).
 */
export const RunYourOwnContestBanner = () => {
  const isMobile = useIsMobile()
  const [isDismissed, setIsDismissed] = useState(false)

  if (isMobile || isDismissed) return null

  return (
    <Paper
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      gap='l'
      p='xl'
      border='default'
      shadow='mid'
      backgroundColor='white'
      w='100%'
      css={{
        position: 'relative',
        borderRadius: 16
      }}
    >
      <Flex
        direction='column'
        gap='xs'
        css={{ flex: '1 1 auto', minWidth: 0, paddingRight: 24 }}
      >
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        <Text variant='body' size='m' color='subdued'>
          {messages.description}
        </Text>
      </Flex>

      <Button variant='primary' size='default' asChild css={{ flexShrink: 0 }}>
        <a
          href={CONTEST_HOSTING_HELP_URL}
          target='_blank'
          rel='noopener noreferrer'
        >
          {messages.createContest}
        </a>
      </Button>

      <IconButton
        icon={IconClose}
        aria-label={messages.dismiss}
        color='subdued'
        size='s'
        onClick={() => setIsDismissed(true)}
        css={{ position: 'absolute', top: 8, right: 8 }}
      />
    </Paper>
  )
}
