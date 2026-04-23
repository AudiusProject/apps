import { useEffect, useState } from 'react'

import {
  Button,
  Flex,
  IconButton,
  IconClose,
  Text,
  isDarkTheme
} from '@audius/harmony'
import { useTheme } from '@emotion/react'
import { createPortal } from 'react-dom'

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

const BANNER_INSET_PX = 17

/**
 * Desktop-only CTA encouraging viewers to host their own remix
 * contest. Hidden on mobile-width viewports. Rendered in a portal so
 * `position: fixed` is relative to the viewport (the `Page` shell wraps
 * content in a react-spring `animated.div`, which breaks fixed
 * positioning for descendants). Dismissable for the rest of the session.
 */
export const RunYourOwnContestBanner = () => {
  const isMobile = useIsMobile()
  const [isDismissed, setIsDismissed] = useState(false)
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null)
  const theme = useTheme()
  const dark = isDarkTheme(theme.type)

  useEffect(() => {
    setMountNode(document.body)
  }, [])

  if (isMobile || isDismissed || mountNode == null) return null

  const banner = (
    <Flex
      direction='column'
      gap='s'
      css={{
        position: 'fixed',
        bottom: 96,
        left: 264,
        right: 24,
        zIndex: 10,
        borderRadius: theme.cornerRadius.m,
        border: `1px solid ${theme.color.border.strong}`,
        boxShadow: `${theme.shadows.mid}`,
        backdropFilter: 'blur(18px)',
        background: dark
          ? 'rgba(41, 41, 41, 0.88)'
          : 'rgba(255, 255, 255, 0.8)',
        padding: BANNER_INSET_PX,
        overflow: 'hidden'
      }}
    >
      <IconButton
        icon={IconClose}
        aria-label={messages.dismiss}
        color='default'
        size='s'
        ripple
        onClick={() => setIsDismissed(true)}
        css={{
          position: 'absolute',
          top: BANNER_INSET_PX,
          right: BANNER_INSET_PX,
          zIndex: 1
        }}
      />

      <Text
        variant='heading'
        size='s'
        css={{
          color: theme.color.neutral.n950,
          fontSize: 24,
          lineHeight: '32px',
          // Keep title clear of the dismiss control (same inset as bar edge)
          paddingRight: 40
        }}
      >
        {messages.title}
      </Text>

      <Flex
        direction='row'
        alignItems='center'
        gap='3xl'
        css={{
          minWidth: 0
        }}
      >
        <Flex
          direction='column'
          css={{
            flex: '1 1 0',
            minWidth: 0
          }}
        >
          <Text
            variant='body'
            size='l'
            css={{
              color: theme.color.neutral.n800,
              fontSize: 18,
              lineHeight: '24px'
            }}
          >
            {messages.description}
          </Text>
        </Flex>

        <Flex
          css={{
            flex: '1 1 0',
            minWidth: 0,
            alignItems: 'stretch'
          }}
        >
          <Button
            variant='primary'
            color='coinGradient'
            size='default'
            asChild
            css={{
              width: '100%',
              borderRadius: theme.cornerRadius.s,
              background: theme.color.special.coinGradient,
              color: '#f7f7f8',
              boxShadow:
                '0px 2px 4px 0px rgba(0,0,0,0.08), 0px 0px 6px 0px rgba(0,0,0,0.02)',
              '&:hover': {
                background: theme.color.special.coinGradient
              },
              '&:active': {
                background: theme.color.special.coinGradient
              }
            }}
          >
            <a
              href={CONTEST_HOSTING_HELP_URL}
              target='_blank'
              rel='noopener noreferrer'
            >
              {messages.createContest}
            </a>
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )

  return createPortal(banner, mountNode)
}
