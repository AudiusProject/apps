import {
  CSSProperties,
  ComponentType,
  MutableRefObject,
  useEffect,
  useLayoutEffect,
  useState
} from 'react'

import { reactionOrder, ReactionTypes } from '@audius/common/api'
import { useClickOutside } from '@audius/harmony'
import cn from 'classnames'

import {
  reactionMap,
  ReactionProps
} from 'components/notification/Notification/components/Reaction'

import styles from './ReactionPopupMenu.module.css'

const Empty = () => null

const reactionList: [ReactionTypes, ComponentType<ReactionProps>][] =
  reactionOrder.map((r) => [r, reactionMap[r] ?? Empty])

type ReactionPopupMenuProps = {
  anchorRef: MutableRefObject<HTMLElement | null>
  isVisible: boolean
  onSelected?: (reaction: ReactionTypes) => void
  onClose: () => void
  isAuthor?: boolean
  userReaction?: ReactionTypes | null
}

type PopupPlacement = 'left' | 'right' | 'below'

const POSITION_MARGIN_PX = 8

const isOverflowClipped = (value: string) =>
  value === 'auto' ||
  value === 'scroll' ||
  value === 'hidden' ||
  value === 'clip'

const getHorizontalConstraintRect = (anchorEl: HTMLElement) => {
  let current: HTMLElement | null = anchorEl.parentElement
  while (current && current !== document.body) {
    const { overflowX } = window.getComputedStyle(current)
    if (isOverflowClipped(overflowX)) {
      return current.getBoundingClientRect()
    }
    current = current.parentElement
  }

  return {
    left: 0,
    right: window.innerWidth,
    width: window.innerWidth
  }
}

export const ReactionPopupMenu = (props: ReactionPopupMenuProps) => {
  const { anchorRef, isVisible, onSelected, onClose, isAuthor, userReaction } =
    props
  const hasSelectedReaction = userReaction != null

  const popupRef = useClickOutside(
    onClose,
    isVisible,
    undefined,
    undefined,
    anchorRef
  )

  const preferredDirection: Exclude<PopupPlacement, 'below'> = isAuthor
    ? 'right'
    : 'left'
  const [popupPlacement, setPopupPlacement] =
    useState<PopupPlacement>(preferredDirection)
  const [popupScale, setPopupScale] = useState(1)
  const [belowShiftX, setBelowShiftX] = useState(0)

  useEffect(() => {
    if (!isVisible) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isVisible, onClose])

  // Flip side-to-side when possible. If both sides clip inside the nearest
  // horizontal clipping container, place the popup below the trigger and scale
  // it just enough to fit.
  useLayoutEffect(() => {
    if (!isVisible) return

    const measure = () => {
      const popupEl = popupRef.current
      const anchorEl = anchorRef.current
      if (!popupEl || !anchorEl) return

      const anchorRect = anchorEl.getBoundingClientRect()
      const popupWidth = popupEl.offsetWidth
      const constraintRect = getHorizontalConstraintRect(anchorEl)
      const minX = constraintRect.left + POSITION_MARGIN_PX
      const maxX = constraintRect.right - POSITION_MARGIN_PX

      const fitsLeft = anchorRect.left - popupWidth >= minX
      const fitsRight = anchorRect.right + popupWidth <= maxX

      let nextPlacement: PopupPlacement = preferredDirection
      if (preferredDirection === 'left' && !fitsLeft && fitsRight) {
        nextPlacement = 'right'
      } else if (preferredDirection === 'right' && !fitsRight && fitsLeft) {
        nextPlacement = 'left'
      } else if (!fitsLeft && !fitsRight) {
        nextPlacement = 'below'
      }

      let nextScale = 1
      let nextBelowShiftX = 0
      if (nextPlacement === 'below') {
        const availableWidth = Math.max(
          0,
          constraintRect.width - POSITION_MARGIN_PX * 2
        )
        nextScale =
          popupWidth > 0 ? Math.min(1, availableWidth / popupWidth) : nextScale

        const scaledWidth = popupWidth * nextScale
        const anchorCenterX = anchorRect.left + anchorRect.width / 2
        const centeredLeft = anchorCenterX - scaledWidth / 2
        const centeredRight = anchorCenterX + scaledWidth / 2

        if (centeredLeft < minX) {
          nextBelowShiftX = minX - centeredLeft
        } else if (centeredRight > maxX) {
          nextBelowShiftX = maxX - centeredRight
        }
      }

      setPopupPlacement(nextPlacement)
      setPopupScale(nextScale)
      setBelowShiftX(nextBelowShiftX)
    }

    measure()
    let frame = 0
    const handleResize = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (frame) {
        cancelAnimationFrame(frame)
      }
    }
  }, [isVisible, preferredDirection, popupRef, anchorRef])

  if (!isVisible) return null

  const popupStyle = {
    '--reaction-popup-scale': popupScale,
    '--reaction-popup-shift-x': `${belowShiftX}px`
  } as CSSProperties

  return (
    <div
      ref={popupRef}
      className={cn(styles.popup, {
        [styles.openLeft]: popupPlacement === 'left',
        [styles.openRight]: popupPlacement === 'right',
        [styles.openBelow]: popupPlacement === 'below',
        [styles.noSelectedReaction]: !hasSelectedReaction
      })}
      style={popupStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {reactionList.map(([reactionType, Reaction]) => {
        const isActive = userReaction === reactionType
        const isDisabled = hasSelectedReaction && !isActive
        const activeState = hasSelectedReaction ? isActive || undefined : false
        return (
          <Reaction
            key={reactionType}
            className={styles.reactionButton}
            isActive={activeState}
            isDisabled={isDisabled}
            playOnHoverOnly
            onClick={() => onSelected?.(reactionType)}
            isResponsive
          />
        )
      })}
    </div>
  )
}
