import Delineator from 'components/delineator/Delineator'
import More from 'components/more/More'

import styles from './CategoryHeader.module.css'

type CategoryHeaderProps = {
  categoryName: string
  onMore?: () => void
}

const CategoryHeader = ({ categoryName, onMore }: CategoryHeaderProps) => {
  const secondary = onMore ? (
    <More className={styles.more} text='More Results' onClick={onMore} />
  ) : null
  return (
    <div className={styles.categoryHeader}>
      {/* @ts-ignore */}
      <Delineator
        className={styles.delineator}
        text={categoryName}
        alignment='left'
        size='large'
      />
      {secondary}
    </div>
  )
}

export default CategoryHeader
