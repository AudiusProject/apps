import { MouseEventHandler, ReactNode } from 'react'

import cn from 'classnames'

import Drawer from 'components/drawer/Drawer'
import { isDarkMode } from 'utils/theme/theme'

import styles from './ActionDrawer.module.css'

type Action = {
  text: string
  className?: string
  icon?: ReactNode
  isDestructive?: boolean
  onClick?: MouseEventHandler
}

type ActionSheetModalProps = {
  id?: string
  didSelectRow?: (index: number) => void
  actions: Action[]
  isOpen: boolean
  onClose: () => void
  title?: string
  renderTitle?: () => ReactNode
  classes?: { actionItem?: string }
  zIndex?: number
}

const ActionDrawer = ({
  id,
  didSelectRow,
  actions,
  isOpen,
  onClose,
  title,
  renderTitle,
  classes = {},
  zIndex
}: ActionSheetModalProps) => {
  const isDark = isDarkMode()
  const headerId = id ? `${id}-header` : undefined

  return (
    <Drawer
      zIndex={zIndex}
      onClose={onClose}
      isOpen={isOpen}
      shouldClose={!isOpen}
    >
      <div className={styles.container}>
        <div className={styles.content}>
          <div id={headerId}>
            {renderTitle
              ? renderTitle()
              : title && <div className={styles.title}>{title}</div>}
          </div>
          <ul aria-labelledby={headerId}>
            {actions.map(
              (
                { text, isDestructive = false, className, icon, onClick },
                index
              ) => (
                <li
                  key={text}
                  role='button'
                  tabIndex={0}
                  onClick={(event) => {
                    onClick?.(event)
                    didSelectRow?.(index)
                  }}
                  className={cn(
                    styles.row,
                    classes.actionItem,
                    className,
                    { [styles.darkAction]: isDark },
                    { [styles.destructiveAction]: isDestructive }
                  )}
                >
                  {icon ? (
                    <div className={styles.actionIcon}>{icon}</div>
                  ) : null}
                  {text}
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </Drawer>
  )
}

export default ActionDrawer
