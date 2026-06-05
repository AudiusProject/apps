import { KeyboardEvent, MouseEvent, ReactNode } from 'react'

import { BottomSheet } from '@audius/harmony'
import cn from 'classnames'

import { isDarkMode } from 'utils/theme/theme'

import styles from './BottomSheetActionDrawer.module.css'

type Action = {
  text: string
  className?: string
  icon?: ReactNode
  isDestructive?: boolean
  onClick?: (event: KeyboardEvent | MouseEvent) => void
}

type BottomSheetActionDrawerProps = {
  id?: string
  didSelectRow?: (index: number) => void
  actions: Action[]
  isOpen: boolean
  onClose: () => void
  title?: string
  renderTitle?: () => ReactNode
  classes?: { actionItem?: string }
  zIndex?: number
  ariaLabel?: string
}

const BottomSheetActionDrawer = ({
  id,
  didSelectRow,
  actions,
  isOpen,
  onClose,
  title,
  renderTitle,
  classes = {},
  zIndex,
  ariaLabel
}: BottomSheetActionDrawerProps) => {
  const isDark = isDarkMode()
  const headerId = id ? `${id}-header` : undefined
  const header =
    renderTitle || title ? (
      <div id={headerId} className={styles.header}>
        {renderTitle ? renderTitle() : title}
      </div>
    ) : undefined

  const handleSelect = (
    event: KeyboardEvent | MouseEvent,
    action: Action,
    index: number
  ) => {
    action.onClick?.(event)
    didSelectRow?.(index)
  }

  const handleKeyDown = (
    event: KeyboardEvent,
    action: Action,
    index: number
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    handleSelect(event, action, index)
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={ariaLabel ?? title ?? 'Actions'}
      header={header}
      zIndex={zIndex}
      hideClose
    >
      <div className={styles.container}>
        <ul className={styles.content} aria-labelledby={headerId}>
          {actions.map((action, index) => (
            <li
              key={action.text}
              role='button'
              tabIndex={0}
              onClick={(event) => handleSelect(event, action, index)}
              onKeyDown={(event) => handleKeyDown(event, action, index)}
              className={cn(
                styles.row,
                classes.actionItem,
                action.className,
                { [styles.darkAction]: isDark },
                { [styles.destructiveAction]: action.isDestructive }
              )}
            >
              {action.icon ? (
                <div className={styles.actionIcon}>{action.icon}</div>
              ) : null}
              {action.text}
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  )
}

export default BottomSheetActionDrawer
