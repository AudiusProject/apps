import { useCallback, useRef, useState } from 'react'

import { useQueueNewFeatureBadge } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import {
  Box,
  Flex,
  IconButton,
  IconIndent,
  NotificationCount,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { keyframes } from '@emotion/react'
import { useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { QueuePopover } from 'components/queue-popover'

const { getPlaybackQueue } = playbackSelectors

const messages = {
  queue: 'Queue',
  newFeature: 'New'
}

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.55;
  }
`

export const QueueButton = () => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const queue = useSelector(getPlaybackQueue)
  // Show the indicator only when there are queued items beyond the currently
  // playing track — a single playing track shouldn't trigger it.
  const hasItems = queue.length > 1
  const { color } = useTheme()
  const record = useRecord()
  const { showBadge: showNewFeatureBadge, dismiss: dismissNewFeatureBadge } =
    useQueueNewFeatureBadge()

  const handleToggle = useCallback(() => {
    if (showNewFeatureBadge) {
      dismissNewFeatureBadge()
    }
    setIsOpen((open) => {
      const next = !open
      if (next) {
        record(
          make(Name.PLAY_QUEUE_OPEN, {
            source: 'queue',
            queueLength: queue.length
          })
        )
      } else {
        record(make(Name.PLAY_QUEUE_CLOSE, { source: 'queue' }))
      }
      return next
    })
  }, [record, queue.length, showNewFeatureBadge, dismissNewFeatureBadge])

  const handleClose = useCallback(() => {
    setIsOpen((open) => {
      if (open) {
        record(make(Name.PLAY_QUEUE_CLOSE, { source: 'queue' }))
      }
      return false
    })
  }, [record])

  return (
    <>
      <Flex
        ref={anchorRef as any}
        css={{ position: 'relative' }}
        alignItems='center'
        justifyContent='center'
      >
        <Tooltip
          text={showNewFeatureBadge ? messages.newFeature : messages.queue}
          placement='top'
          mount='body'
        >
          <Flex>
            {hasItems ? (
              <NotificationCount size='s'>
                <IconButton
                  icon={IconIndent}
                  size='m'
                  color={isOpen ? 'accent' : 'subdued'}
                  aria-label={messages.queue}
                  aria-expanded={isOpen}
                  onClick={handleToggle}
                />
              </NotificationCount>
            ) : (
              <IconButton
                icon={IconIndent}
                size='m'
                color={isOpen ? 'accent' : 'subdued'}
                aria-label={messages.queue}
                aria-expanded={isOpen}
                onClick={handleToggle}
              />
            )}
          </Flex>
        </Tooltip>
        {showNewFeatureBadge ? (
          <Box
            aria-hidden
            css={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: 8,
              background: color.secondary.s400,
              boxShadow: `0 0 6px ${color.secondary.s400}`,
              animation: `${pulse} 1.6s ease-in-out infinite`,
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
