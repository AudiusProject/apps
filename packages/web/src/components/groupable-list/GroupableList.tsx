import { ReactNode } from 'react'

import styles from './GroupableList.module.css'

type GroupableListProps = {
  children: ReactNode
}

const GroupableList = ({ children }: GroupableListProps) => {
  return <div className={styles.groupableList}>{children}</div>
}

export default GroupableList
