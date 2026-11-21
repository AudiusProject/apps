import { useState, useCallback, useLayoutEffect } from 'react'
import type { ReactNode } from 'react'

import {
  PlainButton,
  IconCaretDown as IconCaretDownLine,
  IconCaretUp as IconCaretUpLine,
  useTheme
} from '@audius/harmony'
import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import useMeasure from 'react-use-measure'

import styles from './CollapsibleContent.module.css'

const BUTTON_HEIGHT = 48

const messages = {
  seeMore: 'See More',
  seeLess: 'See Less'
}

type CollapsibleContentProps = {
  id: string
  className?: string
  toggleButtonClassName?: string
  showByDefault?: boolean
  collapsedHeight?: number
  showText?: string
  hideText?: string
  children: ReactNode
  onHeightChange?: (height: number) => void
}

export const CollapsibleContent = ({
  id,
  className,
  toggleButtonClassName,
  showByDefault = false,
  collapsedHeight = 0,
  showText = messages.seeMore,
  hideText = messages.seeLess,
  children,
  onHeightChange
}: CollapsibleContentProps) => {
  const [isCollapsed, setIsCollapsed] = useState(!showByDefault)
  const { spacing } = useTheme()

  const handleToggle = useCallback(() => {
    setIsCollapsed((isCollapsed) => !isCollapsed)
  }, [setIsCollapsed])

  const [ref, bounds] = useMeasure({
    polyfill: ResizeObserver,
    offsetSize: true
  })

  const shouldShowToggle = bounds.height > collapsedHeight
  const contentHeight =
    isCollapsed && shouldShowToggle ? collapsedHeight : bounds.height

  useLayoutEffect(() => {
    const totalHeight = contentHeight + (shouldShowToggle ? BUTTON_HEIGHT : 0)
    onHeightChange?.(totalHeight)
  }, [onHeightChange, shouldShowToggle, contentHeight])

  return (
    <div className={cn(className, { collapsed: isCollapsed })}>
      <div
        id={id}
        className={styles.collapsibleContainer}
        style={{
          height: contentHeight
        }}
      >
        <div ref={ref}>{children}</div>
      </div>
      {shouldShowToggle ? (
        <PlainButton
          className={cn(styles.toggleCollapsedButton, toggleButtonClassName)}
          css={{
            paddingTop: spacing.l,
            paddingBottom: spacing.l,
            margin: '0 auto'
          }}
          aria-controls={id}
          aria-expanded={!isCollapsed}
          iconRight={isCollapsed ? IconCaretDownLine : IconCaretUpLine}
          onClick={handleToggle}
          variant='subdued'
        >
          {isCollapsed ? showText : hideText}
        </PlainButton>
      ) : null}
    </div>
  )
}
