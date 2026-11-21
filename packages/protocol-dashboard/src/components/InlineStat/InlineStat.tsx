import React, { ReactNode } from 'react'

import clsx from 'clsx'

import styles from './InlineStat.module.css'

const InlineStat = ({
  className,
  label,
  value
}: {
  label: string
  value: ReactNode
  className?: string
}) => {
  return (
    <div className={clsx(styles.statContainer, { [className!]: !!className })}>
      <div className={styles.statLabel}>{label}</div>
      <div>{value}</div>
    </div>
  )
}

export default InlineStat
