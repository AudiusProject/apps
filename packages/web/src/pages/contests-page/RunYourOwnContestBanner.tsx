import { useState } from 'react'

import { route } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconButton,
  IconClose,
  Paper,
  Text
} from '@audius/harmony'
import { Link } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'
import { usePortal } from 'hooks/usePortal'
import { useMainContentRef } from 'pages/MainContentContext'
import zIndex from 'utils/zIndex'

const { HOST_REMIX_CONTEST_ROOT_PAGE } = route

const messages = {
  title: 'Run Your Own Contest!',
  description:
    'Host a remix contest for members of the community. Add stems, accept submissions, offer prizes, and more!',
  createContest: 'Create Contest',
  dismiss: 'Dismiss'
}

export const RunYourOwnContestBanner = () => {
  const isMobile = useIsMobile()
  const [isDismissed, setIsDismissed] = useState(false)
  const mainContentRef = useMainContentRef()
  const Portal = usePortal({
    container: mainContentRef.current?.parentElement ?? undefined
  })

  if (isMobile || isDismissed) return null

  return (
    <Portal>
      <Paper
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        gap='l'
        p='xl'
        border='default'
        shadow='mid'
        backgroundColor='white'
        css={{
          position: 'fixed',
          bottom: 'calc(var(--play-bar-height) + 24px)',
          left: 'calc(var(--nav-width) + 48px)',
          right: 48,
          borderRadius: 16,
          zIndex: zIndex.NAVIGATOR_POPUP
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

        <Button
          variant='primary'
          size='default'
          asChild
          css={{ flexShrink: 0 }}
        >
          <Link to={HOST_REMIX_CONTEST_ROOT_PAGE}>
            {messages.createContest}
          </Link>
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
    </Portal>
  )
}
