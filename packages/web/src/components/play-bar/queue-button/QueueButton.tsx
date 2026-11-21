import { lazy, Suspense, useCallback, useRef, useState } from 'react'

import { Name } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import { Flex, IconButton, IconIndent, Tooltip } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'

const { getPlaybackQueue } = playbackSelectors

const loadQueuePopover = () => import('components/queue-popover')
const QueuePopover = lazy(() =>
  loadQueuePopover().then((m) => ({ default: m.QueuePopover }))
)
const prefetchQueuePopover = () => {
  loadQueuePopover().catch(() => {})
}

const messages = {
  queue: 'Queue'
}

export const QueueButton = () => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  if (isOpen && !hasOpened) setHasOpened(true)
  const queue = useSelector(getPlaybackQueue)
  const record = useRecord()

  const handleToggle = useCallback(() => {
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
  }, [record, queue.length])

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
        alignItems='center'
        justifyContent='center'
        onMouseEnter={prefetchQueuePopover}
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
      </Flex>
      {hasOpened ? (
        <Suspense fallback={null}>
          <QueuePopover
            isVisible={isOpen}
            anchorRef={anchorRef}
            onClose={handleClose}
          />
        </Suspense>
      ) : null}
    </>
  )
}
