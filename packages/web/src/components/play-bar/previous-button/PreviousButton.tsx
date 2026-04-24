import { IconSkipPrevious as IconPrev } from '@audius/harmony'
import cn from 'classnames'

import styles from '../PlayBarButton.module.css'

export type PreviousButtonProps = {
  onClick: () => void
  isMobile: boolean
}

const PreviousButton = ({ onClick, isMobile }: PreviousButtonProps) => {
  return (
    <button
      aria-label='Previous track'
      className={cn(styles.button, {
        [styles.buttonFixedSize]: isMobile,
        [styles.previousNext]: isMobile
      })}
      onClick={onClick}
    >
      <IconPrev color='default' className={styles.noAnimation} />
    </button>
  )
}

export default PreviousButton
