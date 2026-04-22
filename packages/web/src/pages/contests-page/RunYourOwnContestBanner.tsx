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
 * contest. Hidden on mobile-width viewports. Pinned to the bottom of
 * the viewport (position: fixed) so it hovers over scrolled content
 * rather than getting buried at the end of the page. Dismissable for
 * the rest of the session (state is not persisted across reloads —
 * flip to localStorage if we want it to stick).
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
      p='l'
      border='default'
      shadow='mid'
      css={{
        // Hovering bottom dock — sits above the global playbar's
        // 60-80px chin (safe offset: 96px). Left + right are pinned
        // to the main content column; the sidebar anchors the left
        // edge via its fixed width of 240px in the app shell.
        position: 'fixed',
        bottom: 96,
        left: 264,
        right: 24,
        borderRadius: 16,
        // Float above track tiles + other page content but below
        // modals (which use higher z-index tiers).
        zIndex: 10
      }}
    >
      <Flex direction='column' gap='xs' css={{ flex: '1 1 auto', minWidth: 0 }}>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        <Text variant='body' size='m' color='subdued'>
          {messages.description}
        </Text>
      </Flex>

      <Button
        variant='primary'
        size='default'
        asChild
        css={{ flexShrink: 0, alignSelf: 'center' }}
      >
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
