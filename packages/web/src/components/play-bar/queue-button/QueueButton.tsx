import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import { useQueueNewFeatureBadge } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import { playbackSelectors } from '@audius/common/store'
import {
  Box,
  Flex,
  IconButton,
  IconIndent,
  Tooltip,
  useTheme
} from '@audius/harmony'
import { keyframes } from '@emotion/react'
import { useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { QueuePopover } from 'components/queue-popover'
import { ToastContext } from 'components/toast/ToastContext'

const { getPlaybackQueue, getShuffle } = playbackSelectors

const messages = {
  queue: 'Queue',
  newFeature: 'New',
  queueDisabledDuringShuffle: 'Turn shuffle off to view queue',
  disableShuffleToast: 'Disable shuffle to use the queue'
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
  const isShuffleEnabled = useSelector(getShuffle)
  const hasItems = queue.length > 0
  const { color } = useTheme()
  const record = useRecord()
  const { toast } = useContext(ToastContext)
  const { showBadge: showNewFeatureBadge, dismiss: dismissNewFeatureBadge } =
    useQueueNewFeatureBadge()

  const handleToggle = useCallback(() => {
    if (isShuffleEnabled) {
      toast(messages.disableShuffleToast)
      return
    }
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
  }, [
    isShuffleEnabled,
    record,
    queue.length,
    showNewFeatureBadge,
    dismissNewFeatureBadge,
    toast
  ])

  const handleClose = useCallback(() => {
    setIsOpen((open) => {
      if (open) {
        record(make(Name.PLAY_QUEUE_CLOSE, { source: 'queue' }))
      }
      return false
    })
  }, [record])

  useEffect(() => {
    if (isShuffleEnabled) {
      handleClose()
    }
  }, [handleClose, isShuffleEnabled])

  const tooltipText = isShuffleEnabled
    ? messages.queueDisabledDuringShuffle
    : showNewFeatureBadge
      ? messages.newFeature
      : messages.queue

  return (
    <>
      <Flex
        ref={anchorRef as any}
        css={{ position: 'relative' }}
        alignItems='center'
        justifyContent='center'
      >
        <Tooltip text={tooltipText} placement='top' mount='body'>
          <Flex>
            <IconButton
              icon={IconIndent}
              size='m'
              color={
                isShuffleEnabled ? 'disabled' : isOpen ? 'accent' : 'subdued'
              }
              aria-label={messages.queue}
              aria-expanded={isOpen}
              aria-disabled={isShuffleEnabled}
              onClick={handleToggle}
            />
          </Flex>
        </Tooltip>
        {hasItems && !isShuffleEnabled ? (
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
        {showNewFeatureBadge && !isShuffleEnabled ? (
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
        isVisible={isOpen && !isShuffleEnabled}
        anchorRef={anchorRef}
        onClose={handleClose}
      />
    </>
  )
}
