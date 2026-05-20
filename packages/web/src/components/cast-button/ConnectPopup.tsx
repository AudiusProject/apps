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
  IconCast,
  IconCastAirplay,
  IconCheck,
  IconClose,
  IconDesktop,
  IconSpeaker,
  Text,
  useTheme
} from '@audius/harmony'
import { createPortal } from 'react-dom'

const messages = {
  connect: 'Connect',
  close: 'Close',
  thisBrowser: 'This web browser',
  googleCastDevices: 'Google Cast devices',
  airplayDevices: 'AirPlay devices'
}

const POPOVER_WIDTH = 320
const POPOVER_GAP = 12
// Approximate intrinsic content height used only for initial vertical
// positioning above the anchor. The popup itself is content-sized.
const POPOVER_HEIGHT_HINT = 180

type ConnectPopupProps = {
  isVisible: boolean
  anchorRef: MutableRefObject<HTMLElement | null>
  isCasting: boolean
  mode: 'cast' | 'airplay'
  onClose: () => void
  onSelectThisBrowser: () => void
  onSelectCastDevices: () => void
}

type RowProps = {
  label: string
  icon: typeof IconCast
  active?: boolean
  onClick?: () => void
}

const Row = ({ label, icon: Icon, active, onClick }: RowProps) => {
  const { color, spacing, cornerRadius } = useTheme()
  return (
    <Box
      as='button'
      onClick={onClick}
      css={{
        all: 'unset',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.m,
        padding: `${spacing.m}px ${spacing.l}px`,
        borderRadius: cornerRadius.s,
        ':hover': onClick
          ? { backgroundColor: color.background.surface2 }
          : undefined
      }}
    >
      <Icon size='l' color={active ? 'accent' : 'default'} />
      <Text
        variant='title'
        size='m'
        strength='default'
        color={active ? 'accent' : 'default'}
      >
        {label}
      </Text>
      {active ? (
        <Box css={{ marginLeft: 'auto' }}>
          <IconCheck size='s' color='accent' />
        </Box>
      ) : null}
    </Box>
  )
}

export const ConnectPopup = ({
  isVisible,
  anchorRef,
  isCasting,
  mode,
  onClose,
  onSelectThisBrowser,
  onSelectCastDevices
}: ConnectPopupProps) => {
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) setShouldRender(true)
  }, [isVisible])

  useLayoutEffect(() => {
    if (!isVisible) return
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Use the rendered height if we have one (re-positioning), otherwise an
    // intrinsic-height hint for the first paint.
    const heightHint =
      popoverRef.current?.getBoundingClientRect().height ?? POPOVER_HEIGHT_HINT
    let top = rect.top - heightHint - POPOVER_GAP
    let left = rect.right - POPOVER_WIDTH
    if (top < 8) top = 8
    if (left < 8) left = 8
    if (left + POPOVER_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - POPOVER_WIDTH - 8
    }
    setPosition({ top, left })
  }, [isVisible, anchorRef])

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

  useEffect(() => {
    if (!isVisible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isVisible, onClose])

  const handleTransitionEnd = useCallback(() => {
    if (!isVisible) setShouldRender(false)
  }, [isVisible])

  if (!shouldRender || !position) return null

  return createPortal(
    <div
      ref={popoverRef}
      role='dialog'
      aria-label={messages.connect}
      onTransitionEnd={handleTransitionEnd}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        zIndex: 20000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 140ms ease-out'
      }}
    >
      <Flex
        direction='column'
        css={(theme) => ({
          backgroundColor: theme.color.background.white,
          border: `1px solid ${theme.color.border.strong}`,
          borderRadius: theme.cornerRadius.m,
          boxShadow:
            '0px 0px 4px 0px rgba(0,0,0,0.04), 0px 8px 16px 0px rgba(0,0,0,0.08)',
          width: '100%',
          padding: 8
        })}
      >
        <Flex
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          pl='m'
          pr='s'
          pv='xs'
        >
          <Text variant='title' size='m' strength='strong' color='default'>
            {messages.connect}
          </Text>
          <IconButton
            icon={IconClose}
            color='subdued'
            size='s'
            aria-label={messages.close}
            onClick={onClose}
          />
        </Flex>
        <Divider orientation='horizontal' />
        <Flex direction='column' pt='xs'>
          <Row
            label={messages.thisBrowser}
            icon={IconDesktop}
            active={!isCasting}
            onClick={onSelectThisBrowser}
          />
          <Row
            label={
              mode === 'airplay'
                ? messages.airplayDevices
                : messages.googleCastDevices
            }
            icon={mode === 'airplay' ? IconCastAirplay : IconSpeaker}
            active={isCasting}
            onClick={onSelectCastDevices}
          />
        </Flex>
      </Flex>
    </div>,
    document.body
  )
}
