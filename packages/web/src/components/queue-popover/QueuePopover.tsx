import {
  MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  Box,
  Divider,
  Flex,
  IconButton,
  IconClose,
  Scrollbar,
  Text,
  useTheme
} from '@audius/harmony'
import { createPortal } from 'react-dom'

import { HistoryTab } from './HistoryTab'
import { QueueTab } from './QueueTab'

const messages = {
  queue: 'Queue',
  history: 'History',
  close: 'Close queue'
}

const POPOVER_WIDTH = 440
const POPOVER_HEIGHT = 660
const POPOVER_GAP = 12

type Tab = 'queue' | 'history'

type QueuePopoverProps = {
  isVisible: boolean
  anchorRef: MutableRefObject<HTMLElement | null>
  onClose: () => void
}

const TabButton = ({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}) => {
  const { color } = useTheme()
  return (
    <Box
      as='button'
      onClick={onClick}
      css={{
        position: 'relative',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '12px 8px'
      }}
      aria-pressed={active}
    >
      <Text
        variant='title'
        size='m'
        strength='default'
        color={active ? 'default' : 'subdued'}
      >
        {label}
      </Text>
      {active ? (
        <Box
          css={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -3,
            height: 3,
            background: color.secondary.s400,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20
          }}
        />
      ) : null}
    </Box>
  )
}

export const QueuePopover = ({
  isVisible,
  anchorRef,
  onClose
}: QueuePopoverProps) => {
  const [tab, setTab] = useState<Tab>('queue')
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  // Keep a render after isVisible flips off so we can play the close animation.
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) setShouldRender(true)
  }, [isVisible])

  // Compute the popover's screen position based on the anchor.
  useLayoutEffect(() => {
    if (!isVisible) return
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const desiredHeight = Math.min(
      POPOVER_HEIGHT,
      Math.floor(window.innerHeight * 0.7)
    )
    // Anchor: top-right of trigger. Popover: bottom-right.
    let top = rect.top - desiredHeight - POPOVER_GAP
    let left = rect.right - POPOVER_WIDTH
    // Clamp to viewport.
    if (top < 8) top = 8
    if (left < 8) left = 8
    if (left + POPOVER_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - POPOVER_WIDTH - 8
    }
    setPosition({ top, left })
  }, [isVisible, anchorRef])

  // Click-outside handler.
  useEffect(() => {
    if (!isVisible) return
    const onDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [isVisible, onClose, anchorRef])

  // Escape closes.
  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isVisible, onClose])

  const handleAnimationEnd = useCallback(() => {
    if (!isVisible) setShouldRender(false)
  }, [isVisible])

  if (!shouldRender || !position) return null

  const desiredHeight = Math.min(
    POPOVER_HEIGHT,
    Math.floor(window.innerHeight * 0.7)
  )

  return createPortal(
    <div
      ref={popoverRef}
      role='dialog'
      aria-label='Queue'
      onTransitionEnd={handleAnimationEnd}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        height: desiredHeight,
        zIndex: 20000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 140ms ease-out',
        // No transform — keeps containing-block semantics for nested
        // position:fixed children (e.g. the dragged queue row).
        pointerEvents: 'auto'
      }}
    >
      <Flex
        direction='column'
        gap='l'
        css={(theme) => ({
          backgroundColor: theme.color.background.white,
          border: `1px solid ${theme.color.border.strong}`,
          borderRadius: theme.cornerRadius.m,
          boxShadow:
            '0px 0px 4px 0px rgba(0,0,0,0.04), 0px 8px 16px 0px rgba(0,0,0,0.08)',
          height: '100%',
          width: '100%',
          padding: 8,
          paddingTop: 0
        })}
      >
        <Flex direction='column' w='100%'>
          <Flex
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            pr='s'
            w='100%'
          >
            <Flex direction='row' gap='s' alignItems='center'>
              <TabButton
                label={messages.queue}
                active={tab === 'queue'}
                onClick={() => setTab('queue')}
              />
              <TabButton
                label={messages.history}
                active={tab === 'history'}
                onClick={() => setTab('history')}
              />
            </Flex>
            <IconButton
              icon={IconClose}
              color='subdued'
              size='s'
              aria-label={messages.close}
              onClick={onClose}
            />
          </Flex>
          <Divider orientation='horizontal' />
        </Flex>

        <Scrollbar
          css={{
            flex: '1 1 auto',
            minHeight: 0,
            width: '100%',
            paddingRight: 0
          }}
        >
          <Flex direction='column' w='100%'>
            {tab === 'queue' ? (
              <QueueTab onClose={onClose} />
            ) : (
              <HistoryTab onClose={onClose} />
            )}
          </Flex>
        </Scrollbar>
      </Flex>
    </div>,
    document.body
  )
}
