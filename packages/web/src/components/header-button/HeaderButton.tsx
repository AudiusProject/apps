import { IconCaretDown as Caret } from '@audius/harmony'
import cn from 'classnames'

import styles from './HeaderButton.module.css'

type HeaderButtonProps = {
  showIcon: boolean
  onClick: () => void
  text: string
  className?: string
}

const HeaderButton = ({
  showIcon,
  onClick,
  text,
  className
}: HeaderButtonProps) => {
  return (
    <div
      className={cn(
        styles.container,
        { [styles.showIcon]: showIcon },
        className
      )}
      onClick={onClick}
    >
      {showIcon && (
        <div className={styles.icon}>
          <Caret />
          <Caret />
        </div>
      )}
      <div className={styles.text}>{text}</div>
    </div>
  )
}

export default HeaderButton
