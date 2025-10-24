import { useRef, useCallback, memo, useEffect } from 'react'

import { Flex, Paper, Popup } from '..'
import { useHoverDelay } from '../../hooks/useHoverDelay'
import { Origin } from '../popup/types'

import { HoverCardProps } from './types'

const DEFAULT_ANCHOR_ORIGIN: Origin = {
  horizontal: 'right',
  vertical: 'center'
}

const DEFAULT_TRANSFORM_ORIGIN: Origin = {
  horizontal: 'left',
  vertical: 'center'
}

/**
 * HoverCard is a component that displays content in a hover card/tooltip
 * with a Paper container when the user hovers over the component's children.
 *
 * The hover card appears to the right of the child element and disappears when
 * the user's mouse leaves either the trigger or the card.
 *
 * @example
 * ```tsx
 * <HoverCard
 *   content={
 *     <>
 *       <SomeHeader />
 *       <SomeBody />
 *     </>
 *   }
 * >
 *   <Text>Hover over me</Text>
 * </HoverCard>
 * ```
 */
const HoverCardComponent = ({
  children,
  className,
  content,
  onClose,
  onClick,
  anchorOrigin = DEFAULT_ANCHOR_ORIGIN,
  transformOrigin = DEFAULT_TRANSFORM_ORIGIN,
  mouseEnterDelay = 0.5,
  triggeredBy = 'hover',
  onHover
}: HoverCardProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const {
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    clearTimer,
    setIsHovered,
    setIsClicked
  } = useHoverDelay(mouseEnterDelay, triggeredBy)

  // Call onHover callback when hover state changes
  useEffect(() => {
    onHover?.(isVisible)
  }, [isVisible, onHover])

  const handleClose = useCallback(() => {
    clearTimer()
    setIsHovered(false)
    setIsClicked(false)
    onClose?.()
  }, [clearTimer, setIsHovered, setIsClicked, onClose])

  const handleClickInternal = useCallback(() => {
    handleClick()
    handleClose()
    onClick?.()
  }, [handleClick, handleClose, onClick])

  return (
    <Flex
      ref={anchorRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={triggeredBy !== 'hover' ? handleClickInternal : undefined}
    >
      {children}

      <Popup
        shadow='far'
        anchorRef={anchorRef}
        isVisible={isVisible}
        onClose={handleClose}
        hideCloseButton
        zIndex={30000}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
      >
        <Paper
          className={className}
          border='strong'
          borderRadius='m'
          backgroundColor='white'
          direction='column'
          onClick={onClick}
          shadow='far'
        >
          {content}
        </Paper>
      </Popup>
    </Flex>
  )
}

export const HoverCard = memo(HoverCardComponent)
