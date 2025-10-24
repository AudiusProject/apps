import { ReactNode } from 'react'

import cn from 'classnames'

import styles from './Header.module.css'

interface HeaderProps {
  title?: ReactNode
  children?: JSX.Element
  className?: string
}

const Header = ({ title, children, className }: HeaderProps) => {
  // Don't render anything if there's no title and no children
  if (!title && !children) {
    return null
  }

  return (
    <div className={cn(styles.container, { [className!]: !!className })}>
      {title && <h1 className={cn(styles.title, 'headerTitle')}>{title}</h1>}
      {children}
    </div>
  )
}

export default Header
