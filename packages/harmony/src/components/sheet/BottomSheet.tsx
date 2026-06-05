import { ReactNode, SyntheticEvent, useEffect, useRef } from 'react'

import { createPortal } from 'react-dom'

import { IconClose } from '../../icons'
import { IconButton } from '../button'

import styles from './BottomSheet.module.css'
import { useBottomSheetDismiss, useSheetA11y } from './useBottomSheetDismiss'

const DEFAULT_BACKDROP_Z_INDEX = 9990
const DEFAULT_SHEET_Z_INDEX = 9991

export type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  onClosed?: () => void
  ariaLabel: string
  children: ReactNode
  header?: ReactNode
  hideClose?: boolean
  closeAriaLabel?: string
  zIndex?: number
  isFullscreen?: boolean
  dismissOnClickOutside?: boolean
  minDismissPx?: number
  dismissHeightRatio?: number
  scrollAreaClassName?: string
}

export const BottomSheet = ({
  isOpen,
  onClose,
  onClosed,
  ariaLabel,
  children,
  header,
  hideClose = false,
  closeAriaLabel = 'Close',
  zIndex = DEFAULT_SHEET_Z_INDEX,
  isFullscreen = false,
  dismissOnClickOutside = true,
  minDismissPx,
  dismissHeightRatio,
  scrollAreaClassName
}: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRegionRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(isOpen)

  useSheetA11y({ isOpen, onClose })

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      onClosed?.()
    }
    wasOpenRef.current = isOpen
  }, [isOpen, onClosed])

  const { isDragging } = useBottomSheetDismiss({
    sheetRef,
    dragRegionRef,
    scrollRef,
    enabled: isOpen,
    minDismissPx,
    dismissHeightRatio,
    onDismiss: onClose
  })

  if (!isOpen) return null

  const stopReactTreeBubble = (e: SyntheticEvent) => e.stopPropagation()

  const sheet = (
    <>
      <div
        className={styles.backdrop}
        onClick={dismissOnClickOutside ? onClose : undefined}
        onTouchStart={stopReactTreeBubble}
        onTouchMove={stopReactTreeBubble}
        onTouchEnd={stopReactTreeBubble}
        onMouseDown={stopReactTreeBubble}
        aria-hidden
        style={{ zIndex: zIndex - 1 }}
      />
      <div
        ref={sheetRef}
        className={
          isFullscreen
            ? `${styles.sheet} ${styles.sheetFullscreen}`
            : styles.sheet
        }
        role='dialog'
        aria-modal='true'
        aria-label={ariaLabel}
        onTouchStart={stopReactTreeBubble}
        onTouchMove={stopReactTreeBubble}
        onTouchEnd={stopReactTreeBubble}
        onMouseDown={stopReactTreeBubble}
        style={{ zIndex }}
        data-dragging={isDragging || undefined}
      >
        {hideClose ? null : (
          <IconButton
            aria-label={closeAriaLabel}
            icon={IconClose}
            color='subdued'
            size='s'
            onClick={onClose}
            className={styles.closeButton}
            data-no-drag
          />
        )}

        <div
          ref={dragRegionRef}
          className={
            header
              ? `${styles.dragRegion} ${styles.dragRegionWithHeader}`
              : styles.dragRegion
          }
        >
          <div className={styles.dragHandleArea}>
            <div className={styles.dragHandle} aria-hidden />
          </div>
          {header}
        </div>
        <div
          ref={scrollRef}
          className={
            scrollAreaClassName
              ? `${styles.scrollArea} ${scrollAreaClassName}`
              : styles.scrollArea
          }
        >
          {children}
        </div>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}

export { useBottomSheetDismiss, useSheetA11y } from './useBottomSheetDismiss'

export const BOTTOM_SHEET_Z_INDEX = {
  BACKDROP: DEFAULT_BACKDROP_Z_INDEX,
  SHEET: DEFAULT_SHEET_Z_INDEX
}
