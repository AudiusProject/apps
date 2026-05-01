import { useCallback, useRef, useState } from 'react'

import { playbackSelectors } from '@audius/common/store'
import {
  Box,
  Flex,
  IconButton,
  IconIndent,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { QueuePopover } from 'components/queue-popover'

const { getPlaybackQueue } = playbackSelectors

const messages = {
  queue: 'Queue'
}

export const QueueButton = () => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const queue = useSelector(getPlaybackQueue)
  const hasItems = queue.length > 0
  const { color } = useTheme()

  const handleToggle = useCallback(() => {
    setIsOpen((open) => !open)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      <Flex
        ref={anchorRef as any}
        css={{ position: 'relative' }}
        alignItems='center'
        justifyContent='center'
      >
        <Tooltip text={messages.queue} placement='top' mount='body'>
          <Flex>
            <IconButton
              icon={IconIndent}
              size='m'
              color={isOpen ? 'accent' : 'subdued'}
              aria-label={messages.queue}
              aria-expanded={isOpen}
              onClick={handleToggle}
            />
          </Flex>
        </Tooltip>
        {hasItems ? (
          <Box
            css={{
              position: 'absolute',
              bottom: -2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isOpen ? color.secondary.s400 : color.icon.subdued,
              pointerEvents: 'none'
            }}
          />
        ) : null}
      </Flex>
      <QueuePopover
        isVisible={isOpen}
        anchorRef={anchorRef}
        onClose={handleClose}
      />
    </>
  )
}
