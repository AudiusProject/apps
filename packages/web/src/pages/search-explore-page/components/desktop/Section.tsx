import { useState, useCallback, ReactNode } from 'react'

import { Button, Flex } from '@audius/harmony'
import cn from 'classnames'

import styles from './Section.module.css'

const messages = {
  more: 'More'
}

export enum Layout {
  // Nothing special
  NORMAL = 'normal',
  TWO_COLUMN_DYNAMIC_WITH_LEADING_ELEMENT = 'two-column-dynamic-with-leading-element',
  TWO_COLUMN_DYNAMIC_WITH_DOUBLE_LEADING_ELEMENT = 'two-column-dynamic-with-double-leading-element'
}

type SectionProps = {
  title: string
  subtitle?: string
  expandable?: boolean
  expandText?: string
  layout?: Layout
  className?: string
  children?: JSX.Element | JSX.Element[] | ReactNode
  onExpand?: () => void
}

const Section = ({
  title,
  subtitle,
  expandable,
  expandText,
  layout,
  className,
  children,
  onExpand
}: SectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const expand = useCallback(() => {
    setIsExpanded(true)
    onExpand?.()
  }, [setIsExpanded, onExpand])

  return (
    <div
      className={cn(styles.section, className, {
        [styles.twoColumnDynamicWithLeadingElement]:
          layout === Layout.TWO_COLUMN_DYNAMIC_WITH_LEADING_ELEMENT,
        [styles.expandable]: expandable,
        [styles.expanded]: isExpanded
      })}
    >
      <div className={styles.title}>{title}</div>
      <div className={styles.subtitle}>{subtitle}</div>
      <div className={styles.children}>{children}</div>
      {expandable && !isExpanded && (
        <Flex justifyContent='center'>
          <Button
            variant='primary'
            css={(theme) => ({ marginTop: theme.spacing['3xl'] })}
            onClick={expand}
          >
            {expandText || messages.more}
          </Button>
        </Flex>
      )}
    </div>
  )
}

export default Section
