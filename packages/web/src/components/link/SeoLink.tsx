import { MouseEvent, forwardRef, useCallback } from 'react'

import cn from 'classnames'
import { LinkProps } from 'react-router'

import styles from './SeoLink.module.css'

type SeoLinkProps = Omit<LinkProps, 'to'> & { to: string }

/**
 * Link that renders an anchor tag, but is not clickable itself. Used for seo purposes
 */
export const SeoLink = forwardRef<HTMLAnchorElement, SeoLinkProps>(
  function SeoLink(props, ref) {
    const { to, onClick, className, ...other } = props

    const handleClick = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault()
        onClick?.(event)
      },
      [onClick]
    )

    return (
      <a
        ref={ref}
        href={to}
        onClick={handleClick}
        className={cn(styles.root, className)}
        {...other}
      />
    )
  }
)
