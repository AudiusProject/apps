import { ComponentType, ReactNode } from 'react'

import { IconCaretRight } from '@audius/harmony'
import cn from 'classnames'
import { Link, LinkProps } from 'react-router-dom'

import styles from './Row.module.css'

type RowProps = {
  // Leading image, emoji, icon, etc.
  prefix?: ReactNode
  // Title area of a Row component, may be left unset
  title?: string
  // Body area of a Row component, may be left unset
  body?: string
  children?: ReactNode
  // Whether or not to pad the children and body
  includeSpacing?: boolean
  // Adds an arrow to the row component if `onClick` is provided
  onClick?: () => void
  href?: string
} & Omit<Partial<LinkProps>, 'prefix'>

/**
 * A row component to be used within a <Grouping />
 */
const Row = ({
  prefix,
  title,
  body,
  children,
  onClick,
  href,
  to,
  includeSpacing = true,
  ...other
}: RowProps) => {
  const RootComponent = (href ? 'a' : to ? Link : 'div') as ComponentType<any>

  const rootProps = href
    ? {
        target: '_blank',
        rel: 'norefferer'
      }
    : {}

  return (
    <RootComponent
      className={cn(styles.row, {
        [styles.isClickable]: !!onClick,
        [styles.hasBody]: !!children,
        [styles.includeSpacing]: includeSpacing
      })}
      to={to}
      href={href}
      onClick={onClick}
      {...rootProps}
      {...other}
    >
      <div className={styles.content}>
        {title && (
          <div className={styles.title}>
            {prefix}
            <div className={styles.text}>{title}</div>
          </div>
        )}
        {(body || children) && (
          <div className={styles.body}>
            {body}
            {children && <div className={styles.children}>{children}</div>}
          </div>
        )}
      </div>
      {onClick && <IconCaretRight className={styles.iconCaretRight} />}
    </RootComponent>
  )
}

export default Row
