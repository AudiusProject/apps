import { IconSkipNext as IconNext } from '@audius/harmony'
import cn from 'classnames'

import styles from '../PlayBarButton.module.css'

export type NextButtonProps = {
  onClick: () => void
  isMobile: boolean
}

const NextButton = ({ onClick, isMobile }: NextButtonProps) => {
  return (
    <button
      aria-label='Next track'
      className={cn(styles.button, {
        [styles.buttonFixedSize]: isMobile,
        [styles.previousNext]: isMobile
      })}
      onClick={onClick}
    >
      <IconNext color='default' className={styles.noAnimation} />
    </button>
  )
}

export default NextButton
