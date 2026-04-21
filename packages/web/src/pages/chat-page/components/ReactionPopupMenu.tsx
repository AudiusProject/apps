import {
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

export const ReactionPopupMenu = (props: ReactionPopupMenuProps) => {
  const { anchorRef, isVisible, onSelected, onClose, isAuthor, userReaction } =
    props

  const popupRef = useClickOutside(
    onClose,
    isVisible,
    undefined,
    undefined,
    anchorRef
  )

  const preferredDirection: 'left' | 'right' = isAuthor ? 'right' : 'left'
  const [openDirection, setOpenDirection] = useState<'left' | 'right'>(
    preferredDirection
  )

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

  // Flip the popup to the opposite side when the preferred side would clip
  // against the viewport (e.g. short messages with little room on one side).
  useLayoutEffect(() => {
    if (!isVisible) return
    const measure = () => {
      const popupEl = popupRef.current
      const anchorEl = anchorRef.current
      if (!popupEl || !anchorEl) return
      const anchorRect = anchorEl.getBoundingClientRect()
      const popupWidth = popupEl.offsetWidth
      const viewportWidth = window.innerWidth
      const margin = 8

      const fitsLeft = anchorRect.left - popupWidth >= margin
      const fitsRight = anchorRect.right + popupWidth <= viewportWidth - margin

      let next = preferredDirection
      if (preferredDirection === 'left' && !fitsLeft && fitsRight) {
        next = 'right'
      } else if (preferredDirection === 'right' && !fitsRight && fitsLeft) {
        next = 'left'
      }
      setOpenDirection(next)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isVisible, preferredDirection, popupRef, anchorRef])

  if (!isVisible) return null

  return (
    <div
      ref={popupRef}
      className={cn(styles.popup, {
        [styles.openLeft]: openDirection === 'left',
        [styles.openRight]: openDirection === 'right'
      })}
      onClick={(e) => e.stopPropagation()}
    >
      {reactionList.map(([reactionType, Reaction]) => {
        const isActive = userReaction === reactionType
        const isDisabled = !!userReaction && !isActive
        return (
          <Reaction
            key={reactionType}
            className={styles.reactionButton}
            isActive={isActive || undefined}
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
