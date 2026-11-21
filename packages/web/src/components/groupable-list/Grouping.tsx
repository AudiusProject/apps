import { ReactNode } from 'react'

import styles from './Grouping.module.css'

type GroupingProps = {
  children: ReactNode
}

const Grouping = ({ children }: GroupingProps) => {
  return <div className={styles.grouping}>{children}</div>
}

export default Grouping
